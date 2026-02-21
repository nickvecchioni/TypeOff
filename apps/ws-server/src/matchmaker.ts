import type { Server, Socket } from "socket.io";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  RacePlayer,
  ModeCategory,
  WpmSample,
  EmoteKey,
} from "@typeoff/shared";
import { RaceManager } from "./race-manager.js";
import type { RaceOwner } from "./race-manager.js";
import type { SocialManager } from "./social-manager.js";
import type { NotificationManager } from "./notification-manager.js";
import { createDb, users, userStats } from "@typeoff/db";
import { eq } from "drizzle-orm";

type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;
type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

interface QueueEntry {
  socket: TypedSocket;
  player: RacePlayer;
  joinedAt: number;
  partyId?: string;
  modeCategories: ModeCategory[];
}

const MAX_PLAYERS = 4;
const PLACEMENT_RACES = 3;
const ELO_WINDOW_INITIAL = 100;
const ELO_WINDOW_EXPAND = 50;
const ELO_WINDOW_EXPAND_INTERVAL_MS = 5_000;
const ELO_WINDOW_MAX = 400;
const BOT_FILL_DELAY_MS = 0;

const BOT_NAMES = [
  "SpeedyBot", "TypeRacer", "KeyMaster", "SwiftKeys",
  "QuickType", "FlashFingers", "TurboTypist", "NimbleBot",
];

export class Matchmaker implements RaceOwner {
  private queue: QueueEntry[] = [];
  private races = new Map<string, RaceManager>();
  private socketToRace = new Map<string, string>();
  private socketToUserId = new Map<string, string>();
  private userIdToRace = new Map<string, string>();
  private queueTimer: ReturnType<typeof setInterval> | null = null;
  private onRaceStarted?: (raceId: string, playerUserIds: string[]) => void;

  constructor(private io: TypedServer, private socialManager?: SocialManager, private notificationManager?: NotificationManager) {
    this.queueTimer = setInterval(() => this.checkQueue(), 1000);
  }

  setOnRaceStarted(cb: (raceId: string, playerUserIds: string[]) => void) {
    this.onRaceStarted = cb;
  }

  async addToQueue(socket: TypedSocket, player: RacePlayer, modeCategories: ModeCategory[] = ["words"]) {
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
    this.queue.push({ socket, player, joinedAt: Date.now(), modeCategories });
    this.broadcastQueueCount();

    // Try to match immediately (solo players get bots, groups get matched)
    this.checkQueue();
  }

  async addPartyToQueue(
    entries: Array<{ socket: TypedSocket; player: RacePlayer }>,
    partyId: string,
    modeCategories: ModeCategory[] = ["words"],
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
        modeCategories,
      });
    }

    this.broadcastQueueCount();
    this.checkQueue();
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
    data: { wpm: number; rawWpm: number; accuracy: number; misstypedChars?: number; wpmHistory?: WpmSample[] }
  ) {
    const raceId = this.socketToRace.get(socketId);
    if (!raceId) return;
    const race = this.races.get(raceId);
    race?.handleFinish(socketId, data);
  }

  handleEmote(socketId: string, emote: EmoteKey) {
    const raceId = this.socketToRace.get(socketId);
    if (!raceId) return;
    const race = this.races.get(raceId);
    race?.handleEmote(socketId, emote);
  }

  /** Voluntary leave during countdown — no penalty */
  handleLeaveRace(socketId: string): boolean {
    const raceId = this.socketToRace.get(socketId);
    if (!raceId) return false;
    const race = this.races.get(raceId);
    if (!race) return false;

    const left = race.handleLeaveCountdown(socketId);
    if (left) {
      this.socketToRace.delete(socketId);
    }
    return left;
  }

  handleDisconnect(socketId: string) {
    this.removeFromQueue(socketId);
    const raceId = this.socketToRace.get(socketId);
    if (raceId) {
      const race = this.races.get(raceId);
      race?.handleDisconnect(socketId);
      this.socketToRace.delete(socketId);

      // Clear social race status so friends don't see a stale "in race" indicator
      const userId = this.socketToUserId.get(socketId);
      if (userId) {
        this.socialManager?.setUserRace(userId, null);
        this.socketToUserId.delete(socketId);
        // Note: userIdToRace is intentionally NOT cleared here —
        // it persists so tryReconnect() can find the race during grace period.
        // It will be cleaned up by cleanupRace() when the race ends.
      }
    }
  }

  tryReconnect(socket: TypedSocket, userId: string): { raceId: string; race: RaceManager } | null {
    const raceId = this.userIdToRace.get(userId);
    if (!raceId) return null;

    const race = this.races.get(raceId);
    if (!race) {
      // Stale mapping — clean up
      this.userIdToRace.delete(userId);
      return null;
    }

    const success = race.reconnectPlayer(userId, socket);
    if (!success) {
      this.userIdToRace.delete(userId);
      return null;
    }

    // Update socket-level mappings with the new socket
    this.socketToRace.set(socket.id, raceId);
    this.socketToUserId.set(socket.id, userId);
    this.socialManager?.setUserRace(userId, raceId);

    return { raceId, race };
  }

  cleanupRace(raceId: string, socketIds: string[]) {
    this.races.delete(raceId);
    for (const id of socketIds) {
      this.socketToRace.delete(id);
      const userId = this.socketToUserId.get(id);
      if (userId) {
        this.socialManager?.setUserRace(userId, null);
        this.socketToUserId.delete(id);
        this.userIdToRace.delete(userId);
      }
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

      // Collect ELO-compatible players with matching modeCategory
      for (let j = 0; j < this.queue.length; j++) {
        if (j === i || matched.has(j) || group.includes(j)) continue;
        if (group.length >= MAX_PLAYERS) break;

        const candidate = this.queue[j];
        const shared = candidate.modeCategories.filter(m => entry.modeCategories.includes(m));
        if (shared.length === 0) continue;
        const dist = Math.abs(entry.player.elo - candidate.player.elo);
        if (dist <= window) {
          addWithParty(j);
        }
      }

      // Start race — fill remaining slots with bots after waiting for humans
      if (group.length >= MAX_PLAYERS) {
        // Full lobby — no bots needed
        const raceGroup = group.slice(0, MAX_PLAYERS);
        for (const idx of raceGroup) matched.add(idx);
        this.startRace(raceGroup.map((idx) => this.queue[idx]));
      } else if (group.length >= 1 && waited >= BOT_FILL_DELAY_MS) {
        // Waited long enough — fill with bots
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
    const shared = entries.reduce<ModeCategory[]>(
      (acc, e) => acc.filter(m => e.modeCategories.includes(m)),
      entries[0]?.modeCategories ?? ["words"],
    );
    const modeCategory = shared[Math.floor(Math.random() * shared.length)] ?? "words";
    const race = new RaceManager(
      this.io, entries, this, [], undefined, undefined, this.notificationManager, modeCategory,
    );

    this.races.set(race.raceId, race);
    const userIds: string[] = [];
    for (const entry of entries) {
      this.socketToRace.set(entry.socket.id, race.raceId);
      if (!entry.player.isGuest) {
        this.socketToUserId.set(entry.socket.id, entry.player.id);
        this.userIdToRace.set(entry.player.id, race.raceId);
        this.socialManager?.setUserRace(entry.player.id, race.raceId);
        userIds.push(entry.player.id);
      }
    }

    race.start();
    this.onRaceStarted?.(race.raceId, userIds);
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
      this.notificationManager,
    );
    this.races.set(race.raceId, race);
    this.socketToRace.set(socket.id, race.raceId);
    if (!player.isGuest) {
      this.socketToUserId.set(socket.id, player.id);
      this.userIdToRace.set(player.id, race.raceId);
      this.socialManager?.setUserRace(player.id, race.raceId);
    }
    console.log(`[matchmaker] placement race ${race.raceId} created, calling start() for socket ${socket.id} (connected=${socket.connected})`);
    race.start();
    if (!player.isGuest) {
      this.onRaceStarted?.(race.raceId, [player.id]);
    }
    console.log(`[matchmaker] placement race ${race.raceId} start() completed`);
  }

  private startRaceWithBots(entries: QueueEntry[], botCount: number) {
    const shared = entries.reduce<ModeCategory[]>(
      (acc, e) => acc.filter(m => e.modeCategories.includes(m)),
      entries[0]?.modeCategories ?? ["words"],
    );
    const modeCategory = shared[Math.floor(Math.random() * shared.length)] ?? "words";
    const elos = entries.map((e) => e.player.elo);
    const minElo = Math.min(...elos);
    const maxElo = Math.max(...elos);
    const avgElo = elos.reduce((a, b) => a + b, 0) / elos.length;
    const spread = maxElo - minElo;

    // Shuffle and pick unique bot names
    const shuffled = [...BOT_NAMES].sort(() => Math.random() - 0.5);
    const bots: RacePlayer[] = [];
    const perBotWpm: number[] = [];

    for (let i = 0; i < botCount; i++) {
      let botElo: number;
      if (entries.length > 1 && spread > 200) {
        // Mixed-skill party: distribute bots evenly across the ELO range
        botElo = botCount === 1
          ? (minElo + maxElo) / 2
          : minElo + (i / (botCount - 1)) * spread;
        botElo += Math.round((Math.random() - 0.5) * 50); // small jitter
      } else {
        // Solo or tight-skill party: cluster around avg ELO
        botElo = avgElo + Math.round((Math.random() - 0.5) * 100);
      }
      botElo = Math.max(0, Math.round(botElo));

      bots.push({
        id: `bot_${crypto.randomUUID()}`,
        name: shuffled[i % shuffled.length],
        isGuest: true,
        elo: botElo,
      });

      // Per-bot WPM from individual ELO: wpm = (elo - 500) / 10
      perBotWpm.push(Math.max(20, (botElo - 500) / 10));
    }

    // Fallback range (used if perBotWpm not supported)
    const baseWpm = Math.max(20, (avgElo - 500) / 10);
    const botWpmMin = Math.max(20, baseWpm - 10);
    const botWpmMax = baseWpm + 10;

    const race = new RaceManager(
      this.io, entries, this, bots,
      { botWpmMin, botWpmMax, perBotWpm },
      undefined,
      this.notificationManager,
      modeCategory,
    );
    this.races.set(race.raceId, race);
    const userIds: string[] = [];
    for (const entry of entries) {
      this.socketToRace.set(entry.socket.id, race.raceId);
      if (!entry.player.isGuest) {
        this.socketToUserId.set(entry.socket.id, entry.player.id);
        this.userIdToRace.set(entry.player.id, race.raceId);
        this.socialManager?.setUserRace(entry.player.id, race.raceId);
        userIds.push(entry.player.id);
      }
    }
    race.start();
    this.onRaceStarted?.(race.raceId, userIds);
  }

  async startPrivatePartyRace(
    entries: Array<{ socket: TypedSocket; player: RacePlayer }>,
    modeCategory: ModeCategory = "words",
  ) {
    if (entries.length < 2) {
      entries[0]?.socket.emit("error", {
        message: "Private races require at least 2 party members",
      });
      return;
    }

    // Remove all from queue if they happen to be there
    for (const entry of entries) {
      this.removeFromQueue(entry.socket.id);
      if (this.socketToRace.has(entry.socket.id)) {
        console.log(`[matchmaker] private race: ${entry.player.id} already in race, skipping`);
        return;
      }
    }

    // Check placement for each member
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

    // Start race directly — no bots, no queue
    const race = new RaceManager(
      this.io, entries, this, [], undefined, undefined, this.notificationManager, modeCategory,
    );

    this.races.set(race.raceId, race);
    for (const entry of entries) {
      this.socketToRace.set(entry.socket.id, race.raceId);
      if (!entry.player.isGuest) {
        this.socketToUserId.set(entry.socket.id, entry.player.id);
        this.userIdToRace.set(entry.player.id, race.raceId);
        this.socialManager?.setUserRace(entry.player.id, race.raceId);
      }
    }

    race.start();
    const userIds = entries
      .filter((e) => !e.player.isGuest)
      .map((e) => e.player.id);
    this.onRaceStarted?.(race.raceId, userIds);
    console.log(`[matchmaker] private party race ${race.raceId} started with ${entries.length} members`);
  }

  getActiveRaces() {
    const active: Array<{ raceId: string; players: import("@typeoff/shared").RacePlayer[]; status: import("@typeoff/shared").RaceStatus; spectatorCount: number }> = [];
    for (const race of this.races.values()) {
      const status = race.getRaceStatus();
      if (status === "racing" || status === "countdown") {
        active.push({
          raceId: race.getRaceId(),
          players: race.getPlayerList(),
          status,
          spectatorCount: race.getSpectatorCount(),
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
      entry.socket.emit("queueUpdate", { count: this.queue.length, maxWaitSeconds: BOT_FILL_DELAY_MS / 1000 });
    }
  }
}
