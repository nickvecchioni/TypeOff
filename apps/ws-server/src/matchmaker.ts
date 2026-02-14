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

const MIN_PLAYERS = 2;
const MAX_PLAYERS = 5;
const QUEUE_WAIT_MS = 10_000;
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

    // If we hit max players, start immediately
    if (this.queue.length >= MAX_PLAYERS) {
      this.startRace(this.queue.splice(0, MAX_PLAYERS));
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

  private checkQueue() {
    if (this.queue.length === 0) return;

    const oldest = this.queue[0];
    const waited = Date.now() - oldest.joinedAt;

    // Solo player waited long enough — inject a bot
    if (this.queue.length === 1 && waited >= BOT_WAIT_MS) {
      const entry = this.queue.splice(0, 1)[0];
      this.startRaceWithBot(entry);
      this.broadcastQueueCount();
      return;
    }

    if (this.queue.length >= MIN_PLAYERS && waited >= QUEUE_WAIT_MS) {
      const batch = this.queue.splice(0, Math.min(this.queue.length, MAX_PLAYERS));
      this.startRace(batch);
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
    const botName = BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)];
    const bot: RacePlayer = {
      id: `bot_${crypto.randomUUID()}`,
      name: botName,
      isGuest: true,
      elo: 1000,
    };

    const race = new RaceManager(this.io, [entry], this, [bot]);
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
