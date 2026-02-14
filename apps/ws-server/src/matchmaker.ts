import type { Server, Socket } from "socket.io";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  RacePlayer,
} from "@typeoff/shared";
import { RaceManager } from "./race-manager.js";

type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;
type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

interface QueueEntry {
  socket: TypedSocket;
  player: RacePlayer;
  joinedAt: number;
}

const MAX_PLAYERS = 5;
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

export class Matchmaker {
  private queue: QueueEntry[] = [];
  private races = new Map<string, RaceManager>();
  private socketToRace = new Map<string, string>();
  private queueTimer: ReturnType<typeof setInterval> | null = null;

  constructor(private io: TypedServer) {
    this.queueTimer = setInterval(() => this.checkQueue(), 1000);
  }

  addToQueue(socket: TypedSocket, player: RacePlayer) {
    // Remove if already in queue
    this.removeFromQueue(socket.id);

    this.queue.push({ socket, player, joinedAt: Date.now() });
    this.broadcastQueueCount();

    // If we hit max players, try to start a match immediately
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
    data: { wpm: number; rawWpm: number; accuracy: number }
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

  private getEloWindow(waitedMs: number): number {
    const expansions = Math.floor(waitedMs / ELO_WINDOW_EXPAND_INTERVAL_MS);
    return Math.min(ELO_WINDOW_INITIAL + expansions * ELO_WINDOW_EXPAND, ELO_WINDOW_MAX);
  }

  private checkQueue() {
    if (this.queue.length === 0) return;

    const now = Date.now();
    const matched = new Set<number>();

    // Process queue entries oldest first
    for (let i = 0; i < this.queue.length; i++) {
      if (matched.has(i)) continue;

      const entry = this.queue[i];
      const waited = now - entry.joinedAt;
      const window = this.getEloWindow(waited);

      // Find all compatible entries within ELO window
      const compatible: number[] = [i];
      for (let j = 0; j < this.queue.length; j++) {
        if (j === i || matched.has(j)) continue;
        const other = this.queue[j];
        if (Math.abs(entry.player.elo - other.player.elo) <= window) {
          compatible.push(j);
        }
      }

      // Enough players for an immediate start
      if (compatible.length >= MAX_PLAYERS) {
        // Sort by ELO proximity to the anchor player
        compatible.sort(
          (a, b) =>
            Math.abs(this.queue[a].player.elo - entry.player.elo) -
            Math.abs(this.queue[b].player.elo - entry.player.elo)
        );
        const batch = compatible.slice(0, MAX_PLAYERS);
        for (const idx of batch) matched.add(idx);

        const entries = batch.map((idx) => this.queue[idx]);
        this.startRace(entries);
        continue;
      }

      // 2+ compatible and waited long enough
      if (compatible.length >= 2 && waited >= MIN_WAIT_FOR_PAIR_MS) {
        compatible.sort(
          (a, b) =>
            Math.abs(this.queue[a].player.elo - entry.player.elo) -
            Math.abs(this.queue[b].player.elo - entry.player.elo)
        );
        const batch = compatible.slice(0, MAX_PLAYERS);
        for (const idx of batch) matched.add(idx);

        const entries = batch.map((idx) => this.queue[idx]);
        this.startRace(entries);
        continue;
      }

      // Solo player waited long enough — inject ELO-scaled bot
      if (compatible.length === 1 && waited >= BOT_WAIT_MS) {
        matched.add(i);
        this.startRaceWithBot(entry);
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

  private startRaceWithBot(entry: QueueEntry) {
    const playerElo = entry.player.elo;

    // Bot WPM scales with player ELO: base = 30 + (elo/1800) * 70
    const baseWpm = 30 + (playerElo / 1800) * 70;
    const botWpmMin = Math.max(20, baseWpm - 10);
    const botWpmMax = baseWpm + 10;

    const botName = BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)];
    // Bot ELO near the player's for realism
    const botElo = playerElo + Math.round((Math.random() - 0.5) * 100);
    const bot: RacePlayer = {
      id: `bot_${crypto.randomUUID()}`,
      name: botName,
      isGuest: true,
      elo: Math.max(0, botElo),
    };

    const race = new RaceManager(this.io, [entry], this, [bot], { botWpmMin, botWpmMax });
    this.races.set(race.raceId, race);
    this.socketToRace.set(entry.socket.id, race.raceId);
    race.start();
  }

  private broadcastQueueCount() {
    for (const entry of this.queue) {
      entry.socket.emit("queueUpdate", { count: this.queue.length });
    }
  }
}
