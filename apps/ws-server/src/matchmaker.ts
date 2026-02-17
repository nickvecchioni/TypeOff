import type { Server, Socket } from "socket.io";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  RacePlayer,
  RaceType,
  WpmSample,
} from "@typeoff/shared";
import { RaceManager } from "./race-manager.js";
import type { RaceOwner } from "./race-manager.js";
import { createDb, userRatings } from "@typeoff/db";
import { eq, and } from "drizzle-orm";

type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;
type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

interface QueueEntry {
  socket: TypedSocket;
  player: RacePlayer;
  joinedAt: number;
  raceType: RaceType;
  partyId?: string;
}

const MAX_PLAYERS = 4;
const PLACEMENT_RACES = 3;
const ELO_WINDOW_INITIAL = 100;
const ELO_WINDOW_EXPAND = 50;
const ELO_WINDOW_EXPAND_INTERVAL_MS = 5_000;
const ELO_WINDOW_MAX = 400;
const MIN_WAIT_FOR_PAIR_MS = 10_000;
const BOT_WAIT_MS = 20_000;

const RACE_TYPES: RaceType[] = ["common", "medium", "hard"];

const BOT_NAMES = [
  "SpeedyBot", "TypeRacer", "KeyMaster", "SwiftKeys",
  "QuickType", "FlashFingers", "TurboTypist", "NimbleBot",
];

export class Matchmaker implements RaceOwner {
  private queues = new Map<RaceType, QueueEntry[]>();
  private races = new Map<string, RaceManager>();
  private socketToRace = new Map<string, string>();
  private socketToQueue = new Map<string, RaceType>();
  private queueTimer: ReturnType<typeof setInterval> | null = null;

  constructor(private io: TypedServer) {
    // Initialize per-type queues
    for (const rt of RACE_TYPES) {
      this.queues.set(rt, []);
    }
    this.queueTimer = setInterval(() => this.checkQueue(), 1000);
  }

  async addToQueue(socket: TypedSocket, player: RacePlayer, raceType: RaceType = "common") {
    // Remove if already in queue
    this.removeFromQueue(socket.id);

    // If already in a race, prevent duplicate joins
    if (this.socketToRace.has(socket.id)) {
      console.log(`[matchmaker] player ${player.id} already in race, ignoring joinQueue`);
      return;
    }

    // Check placement for authenticated players (per-type)
    if (!player.isGuest) {
      console.log(`[matchmaker] checking per-type stats for ${player.id} type=${raceType}...`);
      const rating = await this.getPlayerRating(player.id, raceType);
      const racesPlayed = rating?.racesPlayed ?? 0;
      console.log(`[matchmaker] player ${player.id} type=${raceType} racesPlayed=${racesPlayed}`);
      if (racesPlayed < PLACEMENT_RACES) {
        console.log(`[matchmaker] starting placement race ${racesPlayed + 1} for ${player.id} type=${raceType}`);
        this.startPlacementRace(socket, player, racesPlayed + 1, rating, raceType);
        return;
      }
    }

    // Use per-type ELO for matchmaking
    const typeElo = player.eloByType?.[raceType] ?? player.elo;
    const playerWithTypeElo = { ...player, elo: typeElo };

    // Normal ranked queue
    const queue = this.queues.get(raceType)!;
    queue.push({ socket, player: playerWithTypeElo, joinedAt: Date.now(), raceType });
    this.socketToQueue.set(socket.id, raceType);
    this.broadcastQueueCount(raceType);

    // If we have enough players, try to match immediately
    if (queue.length >= MAX_PLAYERS) {
      this.checkQueue();
    }
  }

  async addPartyToQueue(
    entries: Array<{ socket: TypedSocket; player: RacePlayer }>,
    raceType: RaceType,
    partyId: string,
  ) {
    // Remove all party members from any existing queue
    for (const entry of entries) {
      this.removeFromQueue(entry.socket.id);

      // If already in a race, skip
      if (this.socketToRace.has(entry.socket.id)) {
        console.log(`[matchmaker] party member ${entry.player.id} already in race, skipping`);
        continue;
      }
    }

    // Check placement for each member — if anyone needs placement, they can't party queue
    for (const entry of entries) {
      if (!entry.player.isGuest) {
        const rating = await this.getPlayerRating(entry.player.id, raceType);
        const racesPlayed = rating?.racesPlayed ?? 0;
        if (racesPlayed < PLACEMENT_RACES) {
          // Notify leader that a member needs placement
          entries[0].socket.emit("error", {
            message: `${entry.player.name} needs to complete placement races first`,
          });
          return;
        }
      }
    }

    const queue = this.queues.get(raceType)!;
    const now = Date.now();

    for (const entry of entries) {
      if (this.socketToRace.has(entry.socket.id)) continue;

      const typeElo = entry.player.eloByType?.[raceType] ?? entry.player.elo;
      const playerWithTypeElo = { ...entry.player, elo: typeElo };

      queue.push({
        socket: entry.socket,
        player: playerWithTypeElo,
        joinedAt: now,
        raceType,
        partyId,
      });
      this.socketToQueue.set(entry.socket.id, raceType);
    }

    this.broadcastQueueCount(raceType);

    if (queue.length >= MAX_PLAYERS) {
      this.checkQueue();
    }
  }

  removeFromQueue(socketId: string) {
    const raceType = this.socketToQueue.get(socketId);
    if (!raceType) {
      // Search all queues (fallback)
      for (const [rt, queue] of this.queues) {
        const idx = queue.findIndex((e) => e.socket.id === socketId);
        if (idx !== -1) {
          queue.splice(idx, 1);
          this.socketToQueue.delete(socketId);
          this.broadcastQueueCount(rt);
          return;
        }
      }
      return;
    }

    const queue = this.queues.get(raceType);
    if (!queue) return;
    const idx = queue.findIndex((e) => e.socket.id === socketId);
    if (idx !== -1) {
      queue.splice(idx, 1);
      this.socketToQueue.delete(socketId);
      this.broadcastQueueCount(raceType);
    }
  }

  handleProgress(
    socketId: string,
    data: { wordIndex: number; charIndex: number; wpm: number; progress: number }
  ) {
    const raceId = this.socketToRace.get(socketId);
    if (!raceId) return;
    const race = this.races.get(raceId);
    race?.handleProgress(socketId, data);
  }

  handleFinish(
    socketId: string,
    data: { wpm: number; rawWpm: number; accuracy: number; wpmHistory?: WpmSample[] }
  ) {
    const raceId = this.socketToRace.get(socketId);
    if (!raceId) return;
    const race = this.races.get(raceId);
    race?.handleFinish(socketId, data);
  }

  handleDisconnect(socketId: string) {
    this.removeFromQueue(socketId);
    const raceId = this.socketToRace.get(socketId);
    if (raceId) {
      const race = this.races.get(raceId);
      race?.handleDisconnect(socketId);
      this.socketToRace.delete(socketId);
    }
  }

  cleanupRace(raceId: string, socketIds: string[]) {
    this.races.delete(raceId);
    for (const id of socketIds) {
      this.socketToRace.delete(id);
    }
  }

  private async getPlayerRating(userId: string, raceType: RaceType) {
    const start = Date.now();
    try {
      const db = createDb(process.env.DATABASE_URL!);
      const result = await Promise.race([
        db
          .select()
          .from(userRatings)
          .where(and(eq(userRatings.userId, userId), eq(userRatings.raceType, raceType)))
          .limit(1),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000)),
      ]);
      console.log(`[matchmaker] getPlayerRating took ${Date.now() - start}ms for ${userId} type=${raceType}`);
      if (!result) {
        console.log(`[matchmaker] getPlayerRating timed out for ${userId}`);
        return null;
      }
      return result[0] ?? null;
    } catch (err) {
      console.error(`[matchmaker] getPlayerRating error for ${userId} after ${Date.now() - start}ms:`, err);
      return null;
    }
  }

  private getEloWindow(waitedMs: number): number {
    const expansions = Math.floor(waitedMs / ELO_WINDOW_EXPAND_INTERVAL_MS);
    return Math.min(ELO_WINDOW_INITIAL + expansions * ELO_WINDOW_EXPAND, ELO_WINDOW_MAX);
  }

  private checkQueue() {
    // Process each race type queue independently
    for (const raceType of RACE_TYPES) {
      this.checkQueueForType(raceType);
    }
  }

  private checkQueueForType(raceType: RaceType) {
    const queue = this.queues.get(raceType)!;
    if (queue.length === 0) return;

    const now = Date.now();
    const matched = new Set<number>();

    // Build index of partyId → indices for quick lookup
    const partyIndices = new Map<string, number[]>();
    for (let i = 0; i < queue.length; i++) {
      const pid = queue[i].partyId;
      if (pid) {
        const list = partyIndices.get(pid) ?? [];
        list.push(i);
        partyIndices.set(pid, list);
      }
    }

    // Process queue entries oldest first — try to build groups of up to MAX_PLAYERS
    for (let i = 0; i < queue.length; i++) {
      if (matched.has(i)) continue;

      const entry = queue[i];
      const waited = now - entry.joinedAt;
      const window = this.getEloWindow(waited);

      // Start the group with this entry (and all party members if in a party)
      const group: number[] = [];
      const groupParties = new Set<string>();

      const addWithParty = (idx: number) => {
        if (matched.has(idx) || group.includes(idx)) return;
        group.push(idx);
        const pid = queue[idx].partyId;
        if (pid && !groupParties.has(pid)) {
          groupParties.add(pid);
          // Pull in all party members
          for (const memberIdx of partyIndices.get(pid) ?? []) {
            if (!matched.has(memberIdx) && !group.includes(memberIdx)) {
              group.push(memberIdx);
            }
          }
        }
      };

      addWithParty(i);

      // Collect ELO-compatible players
      for (let j = 0; j < queue.length; j++) {
        if (j === i || matched.has(j) || group.includes(j)) continue;
        if (group.length >= MAX_PLAYERS) break;

        const dist = Math.abs(entry.player.elo - queue[j].player.elo);
        if (dist <= window) {
          addWithParty(j);
        }
      }

      // Start race if we have enough players or waited long enough
      if (group.length >= MAX_PLAYERS) {
        // Full lobby — start immediately (trim to MAX_PLAYERS)
        const raceGroup = group.slice(0, MAX_PLAYERS);
        for (const idx of raceGroup) matched.add(idx);
        this.startRace(raceGroup.map((idx) => queue[idx]), raceType);
      } else if (waited >= BOT_WAIT_MS && group.length >= 1) {
        for (const idx of group) matched.add(idx);
        const entries = group.map((idx) => queue[idx]);
        const botCount = MAX_PLAYERS - entries.length;
        this.startRaceWithBots(entries, botCount, raceType);
      } else if (waited >= MIN_WAIT_FOR_PAIR_MS && group.length >= 2) {
        for (const idx of group) matched.add(idx);
        const entries = group.map((idx) => queue[idx]);
        const botCount = MAX_PLAYERS - entries.length;
        this.startRaceWithBots(entries, botCount, raceType);
      }
    }

    // Remove matched entries (reverse order to maintain indices)
    const toRemove = [...matched].sort((a, b) => b - a);
    for (const idx of toRemove) {
      const entry = queue[idx];
      this.socketToQueue.delete(entry.socket.id);
      queue.splice(idx, 1);
    }
    if (toRemove.length > 0) {
      this.broadcastQueueCount(raceType);
    }
  }

  private startRace(entries: QueueEntry[], raceType: RaceType) {
    const race = new RaceManager(
      this.io, entries, this,
      [], undefined, undefined, false, raceType,
    );

    this.races.set(race.raceId, race);
    for (const entry of entries) {
      this.socketToRace.set(entry.socket.id, race.raceId);
    }

    race.start();
  }

  private startPlacementRace(
    socket: TypedSocket,
    player: RacePlayer,
    raceNumber: number,
    rating: { eloRating: number; racesPlayed: number } | null,
    raceType: RaceType,
  ) {
    // Adaptive bot WPM based on player's prior performance
    let botWpm: number;
    if (!rating || rating.racesPlayed === 0) {
      botWpm = 50; // Race 1: baseline
    } else {
      botWpm = 50 + 5; // Race 2+: slightly above baseline
    }

    const botWpmMin = Math.max(20, botWpm - 5);
    const botWpmMax = botWpm + 5;

    const botName = BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)];
    const bot: RacePlayer = {
      id: `bot_${crypto.randomUUID()}`,
      name: botName,
      isGuest: true,
      elo: player.eloByType?.[raceType] ?? player.elo,
    };

    const entry = { socket, player };
    const race = new RaceManager(
      this.io, [entry], this, [bot],
      { botWpmMin, botWpmMax },
      raceNumber,
      false,
      raceType,
    );
    this.races.set(race.raceId, race);
    this.socketToRace.set(socket.id, race.raceId);
    console.log(`[matchmaker] placement race ${race.raceId} created for type=${raceType}, calling start() for socket ${socket.id} (connected=${socket.connected})`);
    race.start();
    console.log(`[matchmaker] placement race ${race.raceId} start() completed`);
  }

  private startRaceWithBots(entries: QueueEntry[], botCount: number, raceType: RaceType) {
    // Average ELO of human players for bot scaling
    const avgElo = entries.reduce((sum, e) => sum + e.player.elo, 0) / entries.length;

    const bots: RacePlayer[] = [];
    for (let i = 0; i < botCount; i++) {
      const botName = BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)];
      const botElo = avgElo + Math.round((Math.random() - 0.5) * 100);
      bots.push({
        id: `bot_${crypto.randomUUID()}`,
        name: botName,
        isGuest: true,
        elo: Math.max(0, botElo),
      });
    }

    // Bot WPM scales with average ELO: base = 30 + (elo/1800) * 70
    const baseWpm = 30 + (avgElo / 1800) * 70;
    const botWpmMin = Math.max(20, baseWpm - 10);
    const botWpmMax = baseWpm + 10;

    const race = new RaceManager(
      this.io, entries, this, bots,
      { botWpmMin, botWpmMax },
      undefined, false, raceType,
    );
    this.races.set(race.raceId, race);
    for (const entry of entries) {
      this.socketToRace.set(entry.socket.id, race.raceId);
    }
    race.start();
  }

  getActiveRaces() {
    const active: Array<{ raceId: string; players: import("@typeoff/shared").RacePlayer[]; status: import("@typeoff/shared").RaceStatus }> = [];
    for (const race of this.races.values()) {
      const status = race.getRaceStatus();
      if (status === "racing" || status === "countdown") {
        active.push({
          raceId: race.getRaceId(),
          players: race.getPlayerList(),
          status,
        });
      }
    }
    return active;
  }

  getRace(raceId: string): RaceManager | undefined {
    return this.races.get(raceId);
  }

  private broadcastQueueCount(raceType: RaceType) {
    const queue = this.queues.get(raceType)!;
    for (const entry of queue) {
      entry.socket.emit("queueUpdate", { count: queue.length });
    }
  }
}
