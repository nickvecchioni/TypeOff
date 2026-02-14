import type { Server, Socket } from "socket.io";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  RacePlayer,
  RacePlayerProgress,
  RaceState,
  RaceStatus,
} from "@typeoff/shared";
import { calculateRaceElo, getRankTier, generateWords, commonWords } from "@typeoff/shared";
import { createDb, races, raceParticipants, userStats, users } from "@typeoff/db";
import { eq, sql } from "drizzle-orm";
import type { Matchmaker } from "./matchmaker.js";

type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;
type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

interface PlayerEntry {
  socket: TypedSocket | null;
  player: RacePlayer;
  progress: RacePlayerProgress;
  isBot: boolean;
  botTargetWpm: number;
}

const COUNTDOWN_SECONDS = 5;
const WORD_COUNT = 50;
const FINISH_TIMEOUT_MS = 30_000;
const PROGRESS_INTERVAL_MS = 100;

const DEFAULT_BOT_WPM_MIN = 40;
const DEFAULT_BOT_WPM_MAX = 80;
const BOT_WPM_VARIANCE = 5;

export interface BotWpmConfig {
  botWpmMin: number;
  botWpmMax: number;
}

const PLACEMENT_RACE_COUNT = 3;

export class RaceManager {
  readonly raceId: string;
  private status: RaceStatus = "waiting";
  private players = new Map<string, PlayerEntry>();
  private seed: number;
  private nextPlacement = 1;
  private countdownTimer: ReturnType<typeof setInterval> | null = null;
  private progressTimer: ReturnType<typeof setInterval> | null = null;
  private finishTimer: ReturnType<typeof setTimeout> | null = null;
  private finishTimeoutEnd: number | null = null;
  private startedAt: Date | null = null;
  private totalChars = 0;
  private placementRace?: number;

  constructor(
    private io: TypedServer,
    entries: Array<{ socket: TypedSocket; player: RacePlayer }>,
    private matchmaker: Matchmaker,
    bots: RacePlayer[] = [],
    botWpmConfig?: BotWpmConfig,
    placementRace?: number,
  ) {
    this.placementRace = placementRace;
    this.raceId = crypto.randomUUID();
    this.seed = Math.floor(Math.random() * 2147483647);

    // Compute total character count for bot simulation
    const words = generateWords(commonWords, WORD_COUNT, this.seed);
    this.totalChars = words.reduce((sum, w) => sum + w.length, 0) + (WORD_COUNT - 1);

    // Add real players first (Map insertion order matters for guest identification)
    for (const entry of entries) {
      this.players.set(entry.socket.id, {
        socket: entry.socket,
        player: entry.player,
        progress: {
          playerId: entry.player.id,
          wordIndex: 0,
          charIndex: 0,
          wpm: 0,
          progress: 0,
          finished: false,
          placement: null,
          finalStats: null,
        },
        isBot: false,
        botTargetWpm: 0,
      });
    }

    // Add bot players (keyed by player id, null socket)
    const wpmMin = botWpmConfig?.botWpmMin ?? DEFAULT_BOT_WPM_MIN;
    const wpmMax = botWpmConfig?.botWpmMax ?? DEFAULT_BOT_WPM_MAX;
    for (const bot of bots) {
      const targetWpm = wpmMin + Math.random() * (wpmMax - wpmMin);
      this.players.set(bot.id, {
        socket: null,
        player: bot,
        progress: {
          playerId: bot.id,
          wordIndex: 0,
          charIndex: 0,
          wpm: 0,
          progress: 0,
          finished: false,
          placement: null,
          finalStats: null,
        },
        isBot: true,
        botTargetWpm: targetWpm,
      });
    }
  }

  start() {
    this.status = "countdown";
    let countdown = COUNTDOWN_SECONDS;

    // Join all sockets to a room (skip bots)
    for (const entry of this.players.values()) {
      entry.socket?.join(this.raceId);
    }

    // Send initial race state
    const state = this.getState();
    state.countdown = countdown;
    this.io.to(this.raceId).emit("raceStart", state);

    this.countdownTimer = setInterval(() => {
      countdown--;
      this.io.to(this.raceId).emit("raceCountdown", { countdown });

      if (countdown <= 0) {
        if (this.countdownTimer) clearInterval(this.countdownTimer);
        this.countdownTimer = null;
        this.beginRacing();
      }
    }, 1000);
  }

  handleProgress(
    socketId: string,
    data: { wordIndex: number; charIndex: number; wpm: number; progress: number }
  ) {
    const entry = this.players.get(socketId);
    if (!entry || this.status !== "racing" || entry.progress.finished) return;

    entry.progress.wordIndex = data.wordIndex;
    entry.progress.charIndex = data.charIndex;
    entry.progress.wpm = data.wpm;
    entry.progress.progress = data.progress;
  }

  handleFinish(
    socketId: string,
    data: { wpm: number; rawWpm: number; accuracy: number }
  ) {
    const entry = this.players.get(socketId);
    if (!entry || this.status !== "racing" || entry.progress.finished) return;

    entry.progress.finished = true;
    entry.progress.placement = this.nextPlacement++;
    entry.progress.progress = 1;
    entry.progress.finalStats = data;

    // First finisher starts the finish timeout
    if (entry.progress.placement === 1) {
      this.finishTimeoutEnd = Date.now() + FINISH_TIMEOUT_MS;
      this.finishTimer = setTimeout(() => this.endRace(), FINISH_TIMEOUT_MS);
    }

    // Broadcast progress immediately
    this.broadcastProgress();

    // Check if all players finished
    const allFinished = [...this.players.values()].every(
      (p) => p.progress.finished
    );
    if (allFinished) {
      this.endRace();
    }
  }

  handleDisconnect(socketId: string) {
    const entry = this.players.get(socketId);
    if (!entry) return;

    // Mark as finished with last placement
    if (!entry.progress.finished && this.status === "racing") {
      entry.progress.finished = true;
      entry.progress.placement = this.nextPlacement++;
      entry.progress.finalStats = { wpm: 0, rawWpm: 0, accuracy: 0 };
    }

    this.players.delete(socketId);

    // End race if no real players remain
    const hasRealPlayers = [...this.players.values()].some((p) => !p.isBot);
    if (!hasRealPlayers) {
      this.endRace();
    }
  }

  private beginRacing() {
    this.status = "racing";
    this.startedAt = new Date();

    // Broadcast progress at 10Hz
    this.progressTimer = setInterval(() => {
      this.tickBots();
      this.broadcastProgress();
    }, PROGRESS_INTERVAL_MS);
  }

  private tickBots() {
    for (const entry of this.players.values()) {
      if (!entry.isBot || entry.progress.finished) continue;

      // Per-tick WPM jitter for natural feel
      const jitter = (Math.random() - 0.5) * 2 * BOT_WPM_VARIANCE;
      const effectiveWpm = Math.max(10, entry.botTargetWpm + jitter);

      // WPM = (chars / 5) / minutes → chars/min = WPM * 5
      // At 100ms intervals: chars/tick = (WPM * 5) / (60 * 10)
      const charsPerTick = (effectiveWpm * 5) / 600;
      const progressPerTick = charsPerTick / this.totalChars;

      entry.progress.progress = Math.min(1, entry.progress.progress + progressPerTick);
      entry.progress.wpm = Math.round(effectiveWpm);
      entry.progress.wordIndex = Math.floor(entry.progress.progress * WORD_COUNT);

      if (entry.progress.progress >= 1) {
        entry.progress.progress = 1;
        entry.progress.finished = true;
        entry.progress.placement = this.nextPlacement++;
        entry.progress.wordIndex = WORD_COUNT;
        entry.progress.finalStats = {
          wpm: Math.round(entry.botTargetWpm),
          rawWpm: Math.round(entry.botTargetWpm),
          accuracy: Math.round(95 + Math.random() * 5),
        };

        // First finisher starts the finish timeout
        if (entry.progress.placement === 1) {
          this.finishTimeoutEnd = Date.now() + FINISH_TIMEOUT_MS;
          this.finishTimer = setTimeout(() => this.endRace(), FINISH_TIMEOUT_MS);
        }

        // Check if all players finished
        const allFinished = [...this.players.values()].every(
          (p) => p.progress.finished
        );
        if (allFinished) {
          this.endRace();
          return;
        }
      }
    }
  }

  private broadcastProgress() {
    const progress: Record<string, RacePlayerProgress> = {};
    for (const entry of this.players.values()) {
      progress[entry.player.id] = entry.progress;
    }
    this.io.to(this.raceId).emit("raceProgress", { progress });
  }

  private async endRace() {
    if (this.status === "finished") return;
    this.status = "finished";

    if (this.progressTimer) clearInterval(this.progressTimer);
    if (this.finishTimer) clearTimeout(this.finishTimer);

    // Give unfinished players their placement
    for (const entry of this.players.values()) {
      if (!entry.progress.finished) {
        entry.progress.finished = true;
        entry.progress.placement = this.nextPlacement++;
        entry.progress.finalStats = { wpm: 0, rawWpm: 0, accuracy: 0 };
      }
    }

    // Persist to DB and calculate ELO
    const results = await this.persistResults();

    this.io.to(this.raceId).emit("raceFinished", { results });
    this.cleanup();
  }

  private async persistResults() {
    const entries = [...this.players.values()];
    const results: Array<{
      playerId: string;
      name: string;
      username?: string;
      placement: number;
      wpm: number;
      rawWpm: number;
      accuracy: number;
      eloChange: number | null;
      elo?: number;
    }> = [];

    try {
      const db = createDb(process.env.DATABASE_URL!);

      // Insert race record
      await db.insert(races).values({
        id: this.raceId,
        seed: this.seed,
        wordCount: WORD_COUNT,
        playerCount: entries.length,
        startedAt: this.startedAt ?? new Date(),
        finishedAt: new Date(),
      });

      // Calculate ELO for authenticated (non-bot) players
      const authPlayers = entries.filter((e) => !e.player.isGuest && !e.isBot);
      let eloChanges = new Map<string, number>();

      if (authPlayers.length >= 2) {
        // Load current stats for K-factor
        const playerIds = authPlayers.map((e) => e.player.id);
        const statsRows = await db
          .select()
          .from(userStats)
          .where(sql`${userStats.userId} = ANY(${playerIds})`);
        const statsMap = new Map(statsRows.map((s) => [s.userId, s]));

        // Load current ELO
        const userRows = await db
          .select({ id: users.id, eloRating: users.eloRating })
          .from(users)
          .where(sql`${users.id} = ANY(${playerIds})`);
        const eloMap = new Map(userRows.map((u) => [u.id, u.eloRating]));

        eloChanges = calculateRaceElo(
          authPlayers.map((e) => ({
            id: e.player.id,
            elo: eloMap.get(e.player.id) ?? 1000,
            placement: e.progress.placement!,
            gamesPlayed: statsMap.get(e.player.id)?.racesPlayed ?? 0,
          }))
        );

        // Update ELO and rank in users table
        for (const [userId, change] of eloChanges) {
          const currentElo = eloMap.get(userId) ?? 1000;
          const newElo = Math.max(0, currentElo + change);
          await db
            .update(users)
            .set({ eloRating: newElo, rankTier: getRankTier(newElo) })
            .where(eq(users.id, userId));
        }
      }

      // Load usernames for authenticated players
      const authPlayerIds = entries
        .filter((e) => !e.player.isGuest && !e.isBot)
        .map((e) => e.player.id);
      const usernameMap = new Map<string, string>();
      const eloAfterMap = new Map<string, number>();
      if (authPlayerIds.length > 0) {
        const userRows = await db
          .select({ id: users.id, username: users.username, eloRating: users.eloRating })
          .from(users)
          .where(sql`${users.id} = ANY(${authPlayerIds})`);
        for (const row of userRows) {
          if (row.username) usernameMap.set(row.id, row.username);
          eloAfterMap.set(row.id, row.eloRating);
        }
      }

      // Insert participant rows and update stats (skip bots for DB)
      for (const entry of entries) {
        const stats = entry.progress.finalStats!;
        const placement = entry.progress.placement!;
        const eloChange = eloChanges.get(entry.player.id) ?? null;

        if (!entry.isBot) {
          const eloBefore = entry.player.isGuest
            ? null
            : (eloChanges.has(entry.player.id)
                ? (await db.select({ elo: users.eloRating }).from(users).where(eq(users.id, entry.player.id)))[0]?.elo ?? 1000
                : null);

          await db.insert(raceParticipants).values({
            raceId: this.raceId,
            userId: entry.player.isGuest ? null : entry.player.id,
            guestName: entry.player.isGuest ? entry.player.name : null,
            placement,
            wpm: stats.wpm,
            rawWpm: stats.rawWpm,
            accuracy: stats.accuracy,
            finishedAt: new Date(),
            eloBefore: eloBefore != null ? eloBefore - (eloChange ?? 0) : null,
            eloAfter: eloBefore ?? null,
          });

          // Update user stats for authenticated players
          if (!entry.player.isGuest) {
            const existing = await db
              .select()
              .from(userStats)
              .where(eq(userStats.userId, entry.player.id));

            let newPlayed = 1;
            if (existing.length === 0) {
              await db.insert(userStats).values({
                userId: entry.player.id,
                racesPlayed: 1,
                racesWon: placement === 1 ? 1 : 0,
                avgWpm: stats.wpm,
                maxWpm: stats.wpm,
                avgAccuracy: stats.accuracy,
              });
            } else {
              const s = existing[0];
              newPlayed = s.racesPlayed + 1;
              await db
                .update(userStats)
                .set({
                  racesPlayed: newPlayed,
                  racesWon: s.racesWon + (placement === 1 ? 1 : 0),
                  avgWpm: (s.avgWpm * s.racesPlayed + stats.wpm) / newPlayed,
                  maxWpm: Math.max(s.maxWpm, stats.wpm),
                  avgAccuracy:
                    (s.avgAccuracy * s.racesPlayed + stats.accuracy) / newPlayed,
                  updatedAt: new Date(),
                })
                .where(eq(userStats.userId, entry.player.id));
            }

            // Calibrate initial ELO after final placement race
            if (this.placementRace === PLACEMENT_RACE_COUNT) {
              const updatedStats = await db
                .select()
                .from(userStats)
                .where(eq(userStats.userId, entry.player.id))
                .limit(1);
              if (updatedStats.length > 0) {
                const avgWpm = updatedStats[0].avgWpm;
                // Map WPM to ELO: ~60 WPM → 1000, scales linearly
                const initialElo = Math.min(1800, Math.max(600, Math.round(500 + avgWpm * 8.5)));
                await db
                  .update(users)
                  .set({ eloRating: initialElo, rankTier: getRankTier(initialElo) })
                  .where(eq(users.id, entry.player.id));
              }
            }
          }
        }

        results.push({
          playerId: entry.player.id,
          name: entry.player.name,
          username: usernameMap.get(entry.player.id),
          placement,
          wpm: stats.wpm,
          rawWpm: stats.rawWpm,
          accuracy: stats.accuracy,
          eloChange,
          elo: eloAfterMap.get(entry.player.id) ?? entry.player.elo,
        });
      }
    } catch (err) {
      console.error("[race-manager] DB error:", err);

      // Still return results even if DB fails
      for (const entry of entries) {
        const stats = entry.progress.finalStats!;
        results.push({
          playerId: entry.player.id,
          name: entry.player.name,
          placement: entry.progress.placement!,
          wpm: stats.wpm,
          rawWpm: stats.rawWpm,
          accuracy: stats.accuracy,
          eloChange: null,
          elo: entry.player.elo,
        });
      }
    }

    return results.sort((a, b) => a.placement - b.placement);
  }

  private cleanup() {
    if (this.countdownTimer) clearInterval(this.countdownTimer);
    if (this.progressTimer) clearInterval(this.progressTimer);
    if (this.finishTimer) clearTimeout(this.finishTimer);

    const socketIds: string[] = [];
    for (const [key, entry] of this.players.entries()) {
      if (entry.socket) {
        entry.socket.leave(this.raceId);
        socketIds.push(key);
      }
    }
    this.matchmaker.cleanupRace(this.raceId, socketIds);
  }

  private getState(): RaceState {
    const players: RacePlayer[] = [];
    const progress: Record<string, RacePlayerProgress> = {};

    for (const entry of this.players.values()) {
      players.push(entry.player);
      progress[entry.player.id] = entry.progress;
    }

    return {
      raceId: this.raceId,
      status: this.status,
      players,
      progress,
      seed: this.seed,
      wordCount: WORD_COUNT,
      countdown: 0,
      finishTimeoutEnd: this.finishTimeoutEnd,
      placementRace: this.placementRace,
    };
  }
}
