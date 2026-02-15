import type { Server, Socket } from "socket.io";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  RacePlayer,
  TournamentState,
  TournamentMatch,
  TournamentBracket,
} from "@typeoff/shared";
import { RaceManager } from "./race-manager.js";
import type { RaceOwner } from "./race-manager.js";
import {
  createDb,
  tournaments,
  tournamentParticipants,
  tournamentMatches,
  users,
} from "@typeoff/db";
import { eq, and } from "drizzle-orm";

type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;
type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

interface TournamentEntry {
  id: string;
  name: string;
  status: "open" | "in_progress" | "finished";
  maxPlayers: number;
  bracketSize: number;
  currentRound: number;
  createdBy: string;
  players: Map<string, { socket: TypedSocket; player: RacePlayer; userId: string }>;
  bracket: TournamentMatch[][];
  matchRaces: Map<string, RaceManager>; // matchId → race
  readyPlayers: Map<string, Set<string>>; // matchId → set of socketIds
}

export class TournamentManager implements RaceOwner {
  private tournaments = new Map<string, TournamentEntry>();
  private socketToTournament = new Map<string, string>(); // socketId → tournamentId
  private socketToRace = new Map<string, string>(); // socketId → raceId
  private matchToTournament = new Map<string, string>(); // matchId → tournamentId

  constructor(private io: TypedServer) {}

  async createTournament(
    socket: TypedSocket,
    player: RacePlayer,
    name: string,
    maxPlayers: number = 8,
  ) {
    // Must be authenticated
    if (player.isGuest) {
      socket.emit("tournamentError", { message: "Must be signed in to create tournaments" });
      return;
    }

    // Leave any current tournament
    this.leaveTournament(socket);

    try {
      const db = createDb(process.env.DATABASE_URL!);
      const bracketSize = nextPowerOf2(maxPlayers);

      const [row] = await db.insert(tournaments).values({
        name,
        maxPlayers,
        bracketSize,
        createdBy: player.id,
      }).returning({ id: tournaments.id });

      const entry: TournamentEntry = {
        id: row.id,
        name,
        status: "open",
        maxPlayers,
        bracketSize,
        currentRound: 0,
        createdBy: player.id,
        players: new Map(),
        bracket: [],
        matchRaces: new Map(),
        readyPlayers: new Map(),
      };

      entry.players.set(socket.id, { socket, player, userId: player.id });
      this.tournaments.set(row.id, entry);
      this.socketToTournament.set(socket.id, row.id);

      // Insert participant
      await db.insert(tournamentParticipants).values({
        tournamentId: row.id,
        userId: player.id,
        seed: 1,
      });

      socket.join(`tournament:${row.id}`);
      socket.emit("tournamentCreated", this.getTournamentState(entry));
    } catch (err) {
      console.error("[tournament-manager] create error:", err);
      socket.emit("tournamentError", { message: "Failed to create tournament" });
    }
  }

  async joinTournament(socket: TypedSocket, player: RacePlayer, tournamentId: string) {
    if (player.isGuest) {
      socket.emit("tournamentError", { message: "Must be signed in to join tournaments" });
      return;
    }

    const entry = this.tournaments.get(tournamentId);
    if (!entry) {
      socket.emit("tournamentError", { message: "Tournament not found" });
      return;
    }
    if (entry.status !== "open") {
      socket.emit("tournamentError", { message: "Tournament already started" });
      return;
    }
    if (entry.players.size >= entry.maxPlayers) {
      socket.emit("tournamentError", { message: "Tournament is full" });
      return;
    }

    // Check if already joined
    for (const p of entry.players.values()) {
      if (p.userId === player.id) {
        socket.emit("tournamentError", { message: "Already in this tournament" });
        return;
      }
    }

    this.leaveTournament(socket);

    try {
      const db = createDb(process.env.DATABASE_URL!);
      await db.insert(tournamentParticipants).values({
        tournamentId,
        userId: player.id,
        seed: entry.players.size + 1,
      });
    } catch (err) {
      console.error("[tournament-manager] join db error:", err);
    }

    entry.players.set(socket.id, { socket, player, userId: player.id });
    this.socketToTournament.set(socket.id, tournamentId);
    socket.join(`tournament:${tournamentId}`);

    this.io.to(`tournament:${tournamentId}`).emit("tournamentUpdate", this.getTournamentState(entry));
  }

  leaveTournament(socket: TypedSocket) {
    const tournamentId = this.socketToTournament.get(socket.id);
    if (!tournamentId) return;

    const entry = this.tournaments.get(tournamentId);
    if (!entry) {
      this.socketToTournament.delete(socket.id);
      return;
    }

    entry.players.delete(socket.id);
    this.socketToTournament.delete(socket.id);
    socket.leave(`tournament:${tournamentId}`);

    if (entry.players.size === 0 && entry.status === "open") {
      this.tournaments.delete(tournamentId);
      return;
    }

    if (entry.status === "open") {
      this.io.to(`tournament:${tournamentId}`).emit("tournamentUpdate", this.getTournamentState(entry));
    }
  }

  async startTournament(socket: TypedSocket) {
    const tournamentId = this.socketToTournament.get(socket.id);
    if (!tournamentId) {
      socket.emit("tournamentError", { message: "Not in a tournament" });
      return;
    }

    const entry = this.tournaments.get(tournamentId);
    if (!entry) {
      socket.emit("tournamentError", { message: "Tournament not found" });
      return;
    }

    // Only creator can start
    const playerEntry = entry.players.get(socket.id);
    if (!playerEntry || playerEntry.userId !== entry.createdBy) {
      socket.emit("tournamentError", { message: "Only the creator can start the tournament" });
      return;
    }

    if (entry.players.size < 2) {
      socket.emit("tournamentError", { message: "Need at least 2 players" });
      return;
    }

    entry.status = "in_progress";
    entry.currentRound = 1;
    entry.bracketSize = nextPowerOf2(entry.players.size);

    // Generate bracket
    const players = [...entry.players.values()];
    const bracket = this.generateBracket(players, entry.bracketSize);
    entry.bracket = bracket;

    // Persist matches and tournament status
    try {
      const db = createDb(process.env.DATABASE_URL!);
      await db.update(tournaments)
        .set({ status: "in_progress", startedAt: new Date(), bracketSize: entry.bracketSize })
        .where(eq(tournaments.id, tournamentId));

      for (const round of bracket) {
        for (const match of round) {
          await db.insert(tournamentMatches).values({
            id: match.id,
            tournamentId,
            round: match.round,
            matchIndex: match.matchIndex,
            player1Id: match.player1?.id ?? null,
            player2Id: match.player2?.id ?? null,
            status: match.status,
          });
        }
      }
    } catch (err) {
      console.error("[tournament-manager] start db error:", err);
    }

    // Auto-advance byes in round 1
    this.advanceByes(entry);

    this.io.to(`tournament:${tournamentId}`).emit("tournamentBracket", {
      tournamentId,
      rounds: entry.bracket,
    });
  }

  async handleMatchReady(socket: TypedSocket, matchId: string) {
    const tournamentId = this.matchToTournament.get(matchId);
    if (!tournamentId) {
      // Try to find it
      for (const [tid, entry] of this.tournaments) {
        for (const round of entry.bracket) {
          for (const match of round) {
            if (match.id === matchId) {
              this.matchToTournament.set(matchId, tid);
              return this.handleMatchReadyInner(socket, matchId, tid);
            }
          }
        }
      }
      socket.emit("tournamentError", { message: "Match not found" });
      return;
    }
    return this.handleMatchReadyInner(socket, matchId, tournamentId);
  }

  private handleMatchReadyInner(socket: TypedSocket, matchId: string, tournamentId: string) {
    const entry = this.tournaments.get(tournamentId);
    if (!entry) return;

    const match = this.findMatch(entry, matchId);
    if (!match || match.status !== "pending") return;

    // Track ready players for this match
    if (!entry.readyPlayers.has(matchId)) {
      entry.readyPlayers.set(matchId, new Set());
    }
    entry.readyPlayers.get(matchId)!.add(socket.id);

    // Check if both players are ready
    const readySet = entry.readyPlayers.get(matchId)!;
    if (!match.player1 || !match.player2) return;

    // Find sockets for both players
    const p1Socket = this.findSocketForUserId(entry, match.player1.id);
    const p2Socket = this.findSocketForUserId(entry, match.player2.id);

    if (!p1Socket || !p2Socket) return;

    if (readySet.has(p1Socket.id) && readySet.has(p2Socket.id)) {
      this.startMatch(entry, match, p1Socket, p2Socket);
    }
  }

  isInTournamentRace(socketId: string): boolean {
    return this.socketToRace.has(socketId);
  }

  handleProgress(
    socketId: string,
    data: { wordIndex: number; charIndex: number; wpm: number; progress: number },
  ) {
    const raceId = this.socketToRace.get(socketId);
    if (!raceId) return;

    // Find the race in any tournament
    for (const entry of this.tournaments.values()) {
      for (const race of entry.matchRaces.values()) {
        if (race.getRaceId() === raceId) {
          race.handleProgress(socketId, data);
          return;
        }
      }
    }
  }

  handleFinish(
    socketId: string,
    data: { wpm: number; rawWpm: number; accuracy: number; wpmHistory?: import("@typeoff/shared").WpmSample[]; keystrokeTimings?: number[] },
  ) {
    const raceId = this.socketToRace.get(socketId);
    if (!raceId) return;

    for (const entry of this.tournaments.values()) {
      for (const race of entry.matchRaces.values()) {
        if (race.getRaceId() === raceId) {
          race.handleFinish(socketId, data);
          return;
        }
      }
    }
  }

  handleDisconnect(socketId: string) {
    // Handle race disconnect
    const raceId = this.socketToRace.get(socketId);
    if (raceId) {
      for (const entry of this.tournaments.values()) {
        for (const race of entry.matchRaces.values()) {
          if (race.getRaceId() === raceId) {
            race.handleDisconnect(socketId);
            break;
          }
        }
      }
      this.socketToRace.delete(socketId);
    }

    // Handle tournament disconnect
    const tournamentId = this.socketToTournament.get(socketId);
    if (tournamentId) {
      const entry = this.tournaments.get(tournamentId);
      if (entry) {
        entry.players.delete(socketId);
        if (entry.players.size === 0 && entry.status === "open") {
          this.tournaments.delete(tournamentId);
        }
      }
      this.socketToTournament.delete(socketId);
    }
  }

  listTournaments(socket: TypedSocket) {
    const list: TournamentState[] = [];
    for (const entry of this.tournaments.values()) {
      if (entry.status === "open" || entry.status === "in_progress") {
        list.push(this.getTournamentState(entry));
      }
    }
    socket.emit("tournamentList", { tournaments: list });
  }

  cleanupRace(raceId: string, socketIds: string[]) {
    for (const id of socketIds) {
      this.socketToRace.delete(id);
    }

    // Find which tournament and match this race belongs to
    for (const entry of this.tournaments.values()) {
      for (const [matchId, race] of entry.matchRaces) {
        if (race.getRaceId() === raceId) {
          entry.matchRaces.delete(matchId);
          this.determineMatchWinner(entry, matchId, race);
          return;
        }
      }
    }
  }

  private startMatch(
    entry: TournamentEntry,
    match: TournamentMatch,
    p1Socket: TypedSocket,
    p2Socket: TypedSocket,
  ) {
    match.status = "racing";

    const p1 = entry.players.get(p1Socket.id);
    const p2 = entry.players.get(p2Socket.id);
    if (!p1 || !p2) return;

    const race = new RaceManager(
      this.io,
      [
        { socket: p1Socket, player: p1.player },
        { socket: p2Socket, player: p2.player },
      ],
      this,
      [],
      undefined,
      undefined,
      true, // isLobbyRace (no ELO changes)
    );

    entry.matchRaces.set(match.id, race);
    this.socketToRace.set(p1Socket.id, race.getRaceId());
    this.socketToRace.set(p2Socket.id, race.getRaceId());

    // Update match DB record
    try {
      const db = createDb(process.env.DATABASE_URL!);
      db.update(tournamentMatches)
        .set({ status: "racing", raceId: race.getRaceId() })
        .where(eq(tournamentMatches.id, match.id))
        .catch((err) => console.error("[tournament-manager] match update error:", err));
    } catch {}

    this.io.to(`tournament:${entry.id}`).emit("tournamentMatchStart", {
      matchId: match.id,
      raceState: race.getSpectatorState(),
    });

    race.start();
  }

  private async determineMatchWinner(entry: TournamentEntry, matchId: string, race: RaceManager) {
    const match = this.findMatch(entry, matchId);
    if (!match) return;

    // Winner is the player with placement === 1
    const playerList = race.getPlayerList();
    // We need to figure out who won — the race has finished, check getSpectatorState
    const state = race.getSpectatorState();
    let winnerId: string | null = null;
    let loserId: string | null = null;

    for (const [playerId, prog] of Object.entries(state.progress)) {
      if (prog.placement === 1) winnerId = playerId;
      else loserId = playerId;
    }

    if (!winnerId) {
      // If no winner found, pick player1 (shouldn't happen)
      winnerId = match.player1?.id ?? null;
      loserId = match.player2?.id ?? null;
    }

    match.winnerId = winnerId;
    match.status = "finished";

    // Persist
    try {
      const db = createDb(process.env.DATABASE_URL!);
      await db.update(tournamentMatches)
        .set({ winnerId, status: "finished" })
        .where(eq(tournamentMatches.id, matchId));

      // Mark loser as eliminated
      if (loserId) {
        await db.update(tournamentParticipants)
          .set({ eliminatedRound: match.round })
          .where(
            and(
              eq(tournamentParticipants.tournamentId, entry.id),
              eq(tournamentParticipants.userId, loserId),
            )
          );
      }
    } catch (err) {
      console.error("[tournament-manager] match result error:", err);
    }

    // Advance bracket
    this.advanceWinner(entry, match);

    // Re-broadcast bracket
    this.io.to(`tournament:${entry.id}`).emit("tournamentBracket", {
      tournamentId: entry.id,
      rounds: entry.bracket,
    });

    // Check if tournament is done
    this.checkTournamentFinished(entry);
  }

  private advanceWinner(entry: TournamentEntry, match: TournamentMatch) {
    if (!match.winnerId) return;

    const nextRoundIdx = match.round; // bracket is 0-indexed, match.round is 1-indexed
    if (nextRoundIdx >= entry.bracket.length) return; // Final round

    const nextMatchIndex = Math.floor(match.matchIndex / 2);
    const nextRound = entry.bracket[nextRoundIdx];
    if (!nextRound) return;

    const nextMatch = nextRound.find((m) => m.matchIndex === nextMatchIndex);
    if (!nextMatch) return;

    // Find player info
    const playerInfo = this.findPlayerInfo(entry, match.winnerId);
    const playerObj = playerInfo ? { id: playerInfo.userId, name: playerInfo.player.name } : { id: match.winnerId, name: "Unknown" };

    if (match.matchIndex % 2 === 0) {
      nextMatch.player1 = playerObj;
    } else {
      nextMatch.player2 = playerObj;
    }

    // Check for auto-advance (bye)
    this.checkAutoAdvance(entry, nextMatch);
  }

  private checkAutoAdvance(entry: TournamentEntry, match: TournamentMatch) {
    if (match.status !== "pending") return;

    // If one player is set and the other is null (bye), auto-advance
    if (match.player1 && !match.player2) {
      match.winnerId = match.player1.id;
      match.status = "finished";
      this.advanceWinner(entry, match);
    } else if (match.player2 && !match.player1) {
      match.winnerId = match.player2.id;
      match.status = "finished";
      this.advanceWinner(entry, match);
    }
  }

  private advanceByes(entry: TournamentEntry) {
    if (entry.bracket.length === 0) return;

    const round1 = entry.bracket[0];
    for (const match of round1) {
      if (match.player1 && !match.player2) {
        match.winnerId = match.player1.id;
        match.status = "finished";
        this.advanceWinner(entry, match);
      } else if (match.player2 && !match.player1) {
        match.winnerId = match.player2.id;
        match.status = "finished";
        this.advanceWinner(entry, match);
      }
    }
  }

  private async checkTournamentFinished(entry: TournamentEntry) {
    // Tournament is done if all matches in the final round are finished
    const finalRound = entry.bracket[entry.bracket.length - 1];
    if (!finalRound) return;

    const allDone = finalRound.every((m) => m.status === "finished");
    if (!allDone) return;

    entry.status = "finished";

    // Winner is the final match winner
    const finalMatch = finalRound[0];
    const winnerId = finalMatch?.winnerId;

    // Calculate placements
    const placements: Array<{ userId: string; name: string; placement: number }> = [];

    if (winnerId) {
      const winnerInfo = this.findPlayerInfo(entry, winnerId);
      placements.push({
        userId: winnerId,
        name: winnerInfo?.player.name ?? "Unknown",
        placement: 1,
      });
    }

    // Runner up from final match
    const runnerId = finalMatch?.player1?.id === winnerId
      ? finalMatch?.player2?.id
      : finalMatch?.player1?.id;
    if (runnerId) {
      const runnerInfo = this.findPlayerInfo(entry, runnerId);
      placements.push({
        userId: runnerId,
        name: runnerInfo?.player.name ?? "Unknown",
        placement: 2,
      });
    }

    // Persist
    try {
      const db = createDb(process.env.DATABASE_URL!);
      await db.update(tournaments)
        .set({ status: "finished", finishedAt: new Date() })
        .where(eq(tournaments.id, entry.id));

      for (const p of placements) {
        await db.update(tournamentParticipants)
          .set({ placement: p.placement })
          .where(
            and(
              eq(tournamentParticipants.tournamentId, entry.id),
              eq(tournamentParticipants.userId, p.userId),
            )
          );
      }
    } catch (err) {
      console.error("[tournament-manager] finish error:", err);
    }

    this.io.to(`tournament:${entry.id}`).emit("tournamentFinished", {
      tournamentId: entry.id,
      results: placements,
    });
  }

  private generateBracket(
    players: Array<{ socket: TypedSocket; player: RacePlayer; userId: string }>,
    bracketSize: number,
  ): TournamentMatch[][] {
    const totalRounds = Math.log2(bracketSize);
    const rounds: TournamentMatch[][] = [];

    // Seed players by ELO (highest first)
    const seeded = [...players].sort((a, b) => b.player.elo - a.player.elo);

    // Round 1
    const round1: TournamentMatch[] = [];
    const matchCount = bracketSize / 2;

    for (let i = 0; i < matchCount; i++) {
      const p1 = seeded[i] ?? null;
      // Standard seeding: pair seed 1 vs seed N, seed 2 vs seed N-1, etc.
      const p2idx = bracketSize - 1 - i;
      const p2 = seeded[p2idx] ?? null;

      const matchId = crypto.randomUUID();
      this.matchToTournament.set(matchId, this.findTournamentIdForBracket(players) ?? "");

      round1.push({
        id: matchId,
        round: 1,
        matchIndex: i,
        player1: p1 ? { id: p1.userId, name: p1.player.name } : null,
        player2: p2 ? { id: p2.userId, name: p2.player.name } : null,
        winnerId: null,
        status: "pending",
      });
    }
    rounds.push(round1);

    // Subsequent rounds (empty, will be filled as winners advance)
    for (let r = 2; r <= totalRounds; r++) {
      const roundMatches: TournamentMatch[] = [];
      const roundMatchCount = bracketSize / Math.pow(2, r);
      for (let i = 0; i < roundMatchCount; i++) {
        const matchId = crypto.randomUUID();
        roundMatches.push({
          id: matchId,
          round: r,
          matchIndex: i,
          player1: null,
          player2: null,
          winnerId: null,
          status: "pending",
        });
      }
      rounds.push(roundMatches);
    }

    return rounds;
  }

  private findTournamentIdForBracket(
    players: Array<{ socket: TypedSocket; player: RacePlayer; userId: string }>,
  ): string | null {
    if (players.length === 0) return null;
    return this.socketToTournament.get(players[0].socket.id) ?? null;
  }

  private findMatch(entry: TournamentEntry, matchId: string): TournamentMatch | null {
    for (const round of entry.bracket) {
      for (const match of round) {
        if (match.id === matchId) return match;
      }
    }
    return null;
  }

  private findSocketForUserId(entry: TournamentEntry, userId: string): TypedSocket | null {
    for (const p of entry.players.values()) {
      if (p.userId === userId) return p.socket;
    }
    return null;
  }

  private findPlayerInfo(
    entry: TournamentEntry,
    userId: string,
  ): { socket: TypedSocket; player: RacePlayer; userId: string } | null {
    for (const p of entry.players.values()) {
      if (p.userId === userId) return p;
    }
    return null;
  }

  private getTournamentState(entry: TournamentEntry): TournamentState {
    return {
      id: entry.id,
      name: entry.name,
      status: entry.status,
      maxPlayers: entry.maxPlayers,
      currentRound: entry.currentRound,
      players: [...entry.players.values()].map((p, i) => ({
        userId: p.userId,
        name: p.player.name,
        seed: i + 1,
        eliminatedRound: null,
      })),
      createdBy: entry.createdBy,
    };
  }
}

function nextPowerOf2(n: number): number {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}
