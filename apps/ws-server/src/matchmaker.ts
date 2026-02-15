import type { Server, Socket } from "socket.io";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  RacePlayer,
  WpmSample,
} from "@typeoff/shared";
import { RaceManager } from "./race-manager.js";
import type { RaceOwner } from "./race-manager.js";
import { createDb, userStats } from "@typeoff/db";
import { eq } from "drizzle-orm";

type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;
type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

interface QueueEntry {
  socket: TypedSocket;
  player: RacePlayer;
  joinedAt: number;
}

const MAX_PLAYERS = 4;
const PLACEMENT_RACES = 3;
const ELO_WINDOW_INITIAL = 100;
const ELO_WINDOW_EXPAND = 50;
const ELO_WINDOW_EXPAND_INTERVAL_MS = 5_000;
const ELO_WINDOW_MAX = 400;
const MIN_WAIT_FOR_PAIR_MS = 10_000;
const BOT_WAIT_MS = 20_000;

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

    // Check placement for authenticated players
    if (!player.isGuest) {
      const stats = await this.getPlayerStats(player.id);
      const racesPlayed = stats?.racesPlayed ?? 0;
      if (racesPlayed < PLACEMENT_RACES) {
        this.startPlacementRace(socket, player, racesPlayed + 1, stats);
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

  private async getPlayerStats(userId: string) {
    try {
      const db = createDb(process.env.DATABASE_URL!);
      const rows = await db
        .select()
        .from(userStats)
        .where(eq(userStats.userId, userId))
        .limit(1);
      return rows[0] ?? null;
    } catch {
      return null;
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

    // Process queue entries oldest first — try to build groups of up to MAX_PLAYERS
    for (let i = 0; i < this.queue.length; i++) {
      if (matched.has(i)) continue;

      const entry = this.queue[i];
      const waited = now - entry.joinedAt;
      const window = this.getEloWindow(waited);

      // Collect ELO-compatible players for this group
      const group: number[] = [i];
      for (let j = 0; j < this.queue.length; j++) {
        if (j === i || matched.has(j)) continue;
        const dist = Math.abs(entry.player.elo - this.queue[j].player.elo);
        if (dist <= window) {
          group.push(j);
          if (group.length >= MAX_PLAYERS) break;
        }
      }

      // Start race if we have enough players or waited long enough
      if (group.length >= MAX_PLAYERS) {
        // Full lobby — start immediately
        for (const idx of group) matched.add(idx);
        this.startRace(group.map((idx) => this.queue[idx]));
      } else if (waited >= BOT_WAIT_MS && group.length >= 1) {
        // Waited long enough — start with bots filling remaining slots
        for (const idx of group) matched.add(idx);
        const entries = group.map((idx) => this.queue[idx]);
        const botCount = MAX_PLAYERS - entries.length;
        this.startRaceWithBots(entries, botCount);
      } else if (waited >= MIN_WAIT_FOR_PAIR_MS && group.length >= 2) {
        // At least 2 humans and waited a while — start with bots
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
    const race = new RaceManager(this.io, entries, this);

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
    stats: { avgWpm: number; racesPlayed: number } | null
  ) {
    // Adaptive bot WPM based on player's prior performance
    let botWpm: number;
    if (!stats || stats.racesPlayed === 0) {
      botWpm = 50; // Race 1: baseline
    } else {
      botWpm = stats.avgWpm + 5; // Race 2+: slightly above player avg
    }

    const botWpmMin = Math.max(20, botWpm - 5);
    const botWpmMax = botWpm + 5;

    const botName = BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)];
    const bot: RacePlayer = {
      id: `bot_${crypto.randomUUID()}`,
      name: botName,
      isGuest: true,
      elo: player.elo,
    };

    const entry = { socket, player };
    const race = new RaceManager(
      this.io, [entry], this, [bot],
      { botWpmMin, botWpmMax },
      raceNumber,
    );
    this.races.set(race.raceId, race);
    this.socketToRace.set(socket.id, race.raceId);
    race.start();
  }

  private startRaceWithBots(entries: QueueEntry[], botCount: number) {
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

    const race = new RaceManager(this.io, entries, this, bots, { botWpmMin, botWpmMax });
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
