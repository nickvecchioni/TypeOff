import type { Server, Socket } from "socket.io";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  RacePlayer,
  WpmSample,
} from "@typeoff/shared";
import { RaceManager } from "./race-manager.js";
import type { RaceOwner } from "./race-manager.js";
import { createDb, users, userStats } from "@typeoff/db";
import { eq } from "drizzle-orm";

type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;
type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

interface QueueEntry {
  socket: TypedSocket;
  player: RacePlayer;
  joinedAt: number;
  partyId?: string;
}

const MAX_PLAYERS = 4;
const PLACEMENT_RACES = 1;
const ELO_WINDOW_INITIAL = 100;
const ELO_WINDOW_EXPAND = 50;
const ELO_WINDOW_EXPAND_INTERVAL_MS = 5_000;
const ELO_WINDOW_MAX = 400;

const BOT_NAMES = [
  "SpeedyBot", "TypeRacer", "KeyMaster", "SwiftKeys",
  "QuickType", "FlashFingers", "TurboTypist", "NimbleBot",
];

export class Matchmaker implements RaceOwner {
  private queue: QueueEntry[] = [];
  private races = new Map<string, RaceManager>();
  private socketToRace = new Map<string, string>();
  private queueTimer: ReturnType<typeof setInterval> | null = null;

  constructor(private io: TypedServer) {
    this.queueTimer = setInterval(() => this.checkQueue(), 1000);
  }

  async addToQueue(socket: TypedSocket, player: RacePlayer) {
    // Remove if already in queue
    this.removeFromQueue(socket.id);

    // If already in a race, prevent duplicate joins
    if (this.socketToRace.has(socket.id)) {
      console.log(`[matchmaker] player ${player.id} already in race, ignoring joinQueue`);
      return;
    }

    // Check placement for authenticated players
    if (!player.isGuest) {
      console.log(`[matchmaker] checking stats for ${player.id}...`);
      const playerData = await this.getPlayerData(player.id);
      if (playerData === undefined) {
        console.log(`[matchmaker] could not fetch data for ${player.id}, retrying queue`);
        socket.emit("error", { message: "Could not verify placement status. Please try again." });
        return;
      }
      const racesPlayed = playerData.racesPlayed;
      console.log(`[matchmaker] player ${player.id} racesPlayed=${racesPlayed}`);
      if (racesPlayed < PLACEMENT_RACES) {
        console.log(`[matchmaker] starting placement race ${racesPlayed + 1} for ${player.id}`);
        this.startPlacementRace(socket, player, racesPlayed + 1);
        return;
      }
    }

    // Normal ranked queue
    this.queue.push({ socket, player, joinedAt: Date.now() });
    this.broadcastQueueCount();

    // If we have enough players, try to match immediately
    if (this.queue.length >= MAX_PLAYERS) {
      this.checkQueue();
    }
  }

  async addPartyToQueue(
    entries: Array<{ socket: TypedSocket; player: RacePlayer }>,
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
        const playerData = await this.getPlayerData(entry.player.id);
        if (playerData === undefined) {
          entries[0].socket.emit("error", {
            message: "Could not verify placement status. Please try again.",
          });
          return;
        }
        if (playerData.racesPlayed < PLACEMENT_RACES) {
          entries[0].socket.emit("error", {
            message: `${entry.player.name} needs to complete placement races first`,
          });
          return;
        }
      }
    }

    const now = Date.now();

    for (const entry of entries) {
      if (this.socketToRace.has(entry.socket.id)) continue;

      this.queue.push({
        socket: entry.socket,
        player: entry.player,
        joinedAt: now,
        partyId,
      });
    }

    this.broadcastQueueCount();

    if (this.queue.length >= MAX_PLAYERS) {
      this.checkQueue();
    }
  }

  removeFromQueue(socketId: string) {
    const idx = this.queue.findIndex((e) => e.socket.id === socketId);
    if (idx !== -1) {
      this.queue.splice(idx, 1);
      this.broadcastQueueCount();
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

  /** Returns player data for placement check, or undefined on timeout/error */
  private async getPlayerData(userId: string) {
    const start = Date.now();
    try {
      const db = createDb(process.env.DATABASE_URL!);
      const result = await Promise.race([
        db
          .select({ racesPlayed: userStats.racesPlayed })
          .from(userStats)
          .where(eq(userStats.userId, userId))
          .limit(1),
        new Promise<undefined>((resolve) => setTimeout(() => resolve(undefined), 3000)),
      ]);
      console.log(`[matchmaker] getPlayerData took ${Date.now() - start}ms for ${userId}`);
      if (result === undefined) {
        console.log(`[matchmaker] getPlayerData timed out for ${userId}`);
        return undefined;
      }
      return { racesPlayed: result[0]?.racesPlayed ?? 0 };
    } catch (err) {
      console.error(`[matchmaker] getPlayerData error for ${userId} after ${Date.now() - start}ms:`, err);
      return undefined;
    }
  }

  private getEloWindow(waitedMs: number): number {
    const expansions = Math.floor(waitedMs / ELO_WINDOW_EXPAND_INTERVAL_MS);
    return Math.min(ELO_WINDOW_INITIAL + expansions * ELO_WINDOW_EXPAND, ELO_WINDOW_MAX);
  }

  private checkQueue() {
    if (this.queue.length === 0) return;

    const now = Date.now();
    const matched = new Set<number>();

    // Build index of partyId → indices for quick lookup
    const partyIndices = new Map<string, number[]>();
    for (let i = 0; i < this.queue.length; i++) {
      const pid = this.queue[i].partyId;
      if (pid) {
        const list = partyIndices.get(pid) ?? [];
        list.push(i);
        partyIndices.set(pid, list);
      }
    }

    // Process queue entries oldest first — try to build groups of up to MAX_PLAYERS
    for (let i = 0; i < this.queue.length; i++) {
      if (matched.has(i)) continue;

      const entry = this.queue[i];
      const waited = now - entry.joinedAt;
      const window = this.getEloWindow(waited);

      // Start the group with this entry (and all party members if in a party)
      const group: number[] = [];
      const groupParties = new Set<string>();

      const addWithParty = (idx: number) => {
        if (matched.has(idx) || group.includes(idx)) return;
        group.push(idx);
        const pid = this.queue[idx].partyId;
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
      for (let j = 0; j < this.queue.length; j++) {
        if (j === i || matched.has(j) || group.includes(j)) continue;
        if (group.length >= MAX_PLAYERS) break;

        const dist = Math.abs(entry.player.elo - this.queue[j].player.elo);
        if (dist <= window) {
          addWithParty(j);
        }
      }

      // Start race — fill remaining slots with bots immediately
      if (group.length >= MAX_PLAYERS) {
        // Full lobby — no bots needed
        const raceGroup = group.slice(0, MAX_PLAYERS);
        for (const idx of raceGroup) matched.add(idx);
        this.startRace(raceGroup.map((idx) => this.queue[idx]));
      } else if (group.length >= 1) {
        for (const idx of group) matched.add(idx);
        const entries = group.map((idx) => this.queue[idx]);
        const botCount = MAX_PLAYERS - entries.length;
        this.startRaceWithBots(entries, botCount);
      }
    }

    // Remove matched entries (reverse order to maintain indices)
    const toRemove = [...matched].sort((a, b) => b - a);
    for (const idx of toRemove) {
      this.queue.splice(idx, 1);
    }
    if (toRemove.length > 0) {
      this.broadcastQueueCount();
    }
  }

  private startRace(entries: QueueEntry[]) {
    const race = new RaceManager(
      this.io, entries, this,
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
  ) {
    const entry = { socket, player };
    const race = new RaceManager(
      this.io, [entry], this, [],
      undefined,
      raceNumber,
    );
    this.races.set(race.raceId, race);
    this.socketToRace.set(socket.id, race.raceId);
    console.log(`[matchmaker] placement race ${race.raceId} created, calling start() for socket ${socket.id} (connected=${socket.connected})`);
    race.start();
    console.log(`[matchmaker] placement race ${race.raceId} start() completed`);
  }

  private startRaceWithBots(entries: QueueEntry[], botCount: number) {
    // Average ELO of human players for bot scaling
    const avgElo = entries.reduce((sum, e) => sum + e.player.elo, 0) / entries.length;

    // Shuffle and pick unique bot names
    const shuffled = [...BOT_NAMES].sort(() => Math.random() - 0.5);
    const bots: RacePlayer[] = [];
    for (let i = 0; i < botCount; i++) {
      const botElo = avgElo + Math.round((Math.random() - 0.5) * 100);
      bots.push({
        id: `bot_${crypto.randomUUID()}`,
        name: shuffled[i % shuffled.length],
        isGuest: true,
        elo: Math.max(0, botElo),
      });
    }

    // Bot WPM scales with average ELO: base = 30 + (elo/2500) * 180
    const baseWpm = 30 + (avgElo / 2500) * 180;
    const botWpmMin = Math.max(20, baseWpm - 10);
    const botWpmMax = baseWpm + 10;

    const race = new RaceManager(
      this.io, entries, this, bots,
      { botWpmMin, botWpmMax },
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

  private broadcastQueueCount() {
    for (const entry of this.queue) {
      entry.socket.emit("queueUpdate", { count: this.queue.length });
    }
  }
}
