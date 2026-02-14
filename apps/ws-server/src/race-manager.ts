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
import { eq, inArray } from "drizzle-orm";
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

    // 1v1: race ends as soon as one player finishes
    this.endRace();
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

        // 1v1: race ends as soon as one player finishes
        this.endRace();
        return;
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

    // Give unfinished players their placement with current progress stats
    for (const entry of this.players.values()) {
      if (!entry.progress.finished) {
        entry.progress.finished = true;
        entry.progress.placement = this.nextPlacement++;
        entry.progress.finalStats = {
          wpm: entry.progress.wpm,
          rawWpm: entry.progress.wpm,
          accuracy: 100,
        };
      }
    }

    // Persist to DB and calculate ELO
    const results = await this.persistResults();

    this.io.to(this.raceId).emit("raceFinished", {
      results,
      ...(this.placementRace != null
        ? { placementRace: this.placementRace, placementTotal: PLACEMENT_RACE_COUNT }
        : {}),
    });
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
      streak?: number;
    }> = [];

    // Track per-player data for results
    const eloChanges = new Map<string, number>();
    const usernameMap = new Map<string, string>();
    const eloAfterMap = new Map<string, number>();
    const streakMap = new Map<string, number>();

    try {
      const db = createDb(process.env.DATABASE_URL!);

      // 1. Insert race record
      await db.insert(races).values({
        id: this.raceId,
        seed: this.seed,
        wordCount: WORD_COUNT,
        playerCount: entries.length,
        startedAt: this.startedAt ?? new Date(),
        finishedAt: new Date(),
      });

      // 2. Insert participants and update stats FIRST (critical path)
      for (const entry of entries) {
        if (entry.isBot) continue;

        const stats = entry.progress.finalStats!;
        const placement = entry.progress.placement!;

        // Insert participant record
        await db.insert(raceParticipants).values({
          raceId: this.raceId,
          userId: entry.player.isGuest ? null : entry.player.id,
          guestName: entry.player.isGuest ? entry.player.name : null,
          placement,
          wpm: stats.wpm,
          rawWpm: stats.rawWpm,
          accuracy: stats.accuracy,
          finishedAt: new Date(),
        });

        // Update user stats for authenticated players
        if (!entry.player.isGuest) {
          const existing = await db
            .select()
            .from(userStats)
            .where(eq(userStats.userId, entry.player.id));

          if (existing.length === 0) {
            const newStreak = placement === 1 ? 1 : 0;
            streakMap.set(entry.player.id, newStreak);
            await db.insert(userStats).values({
              userId: entry.player.id,
              racesPlayed: 1,
              racesWon: placement === 1 ? 1 : 0,
              avgWpm: stats.wpm,
              maxWpm: stats.wpm,
              avgAccuracy: stats.accuracy,
              currentStreak: newStreak,
              maxStreak: newStreak,
            });
          } else {
            const s = existing[0];
            const newPlayed = s.racesPlayed + 1;
            const newStreak = placement === 1 ? s.currentStreak + 1 : 0;
            streakMap.set(entry.player.id, newStreak);
            await db
              .update(userStats)
              .set({
                racesPlayed: newPlayed,
                racesWon: s.racesWon + (placement === 1 ? 1 : 0),
                avgWpm: (s.avgWpm * s.racesPlayed + stats.wpm) / newPlayed,
                maxWpm: Math.max(s.maxWpm, stats.wpm),
                avgAccuracy:
                  (s.avgAccuracy * s.racesPlayed + stats.accuracy) / newPlayed,
                currentStreak: newStreak,
                maxStreak: Math.max(s.maxStreak, newStreak),
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
              const initialElo = Math.min(2200, Math.max(600, Math.round(500 + avgWpm * 8.5)));
              const initialTier = getRankTier(initialElo);
              await db
                .update(users)
                .set({
                  eloRating: initialElo,
                  rankTier: initialTier,
                  peakEloRating: initialElo,
                  peakRankTier: initialTier,
                })
                .where(eq(users.id, entry.player.id));
            }
          }
        }
      }

      // 3. Calculate ELO for non-placement races (includes bot opponents)
      const authPlayers = entries.filter((e) => !e.player.isGuest && !e.isBot);
      const botEntries = entries.filter((e) => e.isBot);

      if (!this.placementRace && authPlayers.length >= 1) {
        const playerIds = authPlayers.map((e) => e.player.id);
        const statsRows = await db
          .select()
          .from(userStats)
          .where(inArray(userStats.userId, playerIds));
        const statsMap = new Map(statsRows.map((s) => [s.userId, s]));

        const userRows = await db
          .select({ id: users.id, eloRating: users.eloRating, peakEloRating: users.peakEloRating })
          .from(users)
          .where(inArray(users.id, playerIds));
        const eloMap = new Map(userRows.map((u) => [u.id, u.eloRating]));
        const peakEloMap = new Map(userRows.map((u) => [u.id, u.peakEloRating]));

        // Include bots as virtual opponents for ELO calculation
        const eloInput = [
          ...authPlayers.map((e) => ({
            id: e.player.id,
            elo: eloMap.get(e.player.id) ?? 1000,
            placement: e.progress.placement!,
            gamesPlayed: statsMap.get(e.player.id)?.racesPlayed ?? 0,
          })),
          ...botEntries.map((e) => ({
            id: e.player.id,
            elo: e.player.elo,
            placement: e.progress.placement!,
            gamesPlayed: 30, // Bots use experienced K-factor
          })),
        ];

        const changes = calculateRaceElo(eloInput);

        // Only apply ELO changes to real players
        for (const [userId, change] of changes) {
          if (botEntries.some((b) => b.player.id === userId)) continue;
          eloChanges.set(userId, change);
          const currentElo = eloMap.get(userId) ?? 1000;
          const newElo = Math.max(0, currentElo + change);
          const peakElo = peakEloMap.get(userId) ?? 1000;
          const updateData: Record<string, unknown> = {
            eloRating: newElo,
            rankTier: getRankTier(newElo),
          };
          if (newElo > peakElo) {
            updateData.peakEloRating = newElo;
            updateData.peakRankTier = getRankTier(newElo);
          }
          await db
            .update(users)
            .set(updateData)
            .where(eq(users.id, userId));
        }

        // Update participant records with elo data
        for (const entry of authPlayers) {
          const currentElo = eloMap.get(entry.player.id) ?? 1000;
          const change = eloChanges.get(entry.player.id) ?? 0;
          const newElo = Math.max(0, currentElo + change);
          await db
            .update(raceParticipants)
            .set({ eloBefore: currentElo, eloAfter: newElo })
            .where(eq(raceParticipants.raceId, this.raceId));
        }
      }

      // 4. Load display data (non-critical — if this fails, results still work)
      try {
        const authPlayerIds = entries
          .filter((e) => !e.player.isGuest && !e.isBot)
          .map((e) => e.player.id);
        if (authPlayerIds.length > 0) {
          const userRows = await db
            .select({ id: users.id, username: users.username, eloRating: users.eloRating })
            .from(users)
            .where(inArray(users.id, authPlayerIds));
          for (const row of userRows) {
            if (row.username) usernameMap.set(row.id, row.username);
            eloAfterMap.set(row.id, row.eloRating);
          }
        }
      } catch (displayErr) {
        console.error("[race-manager] display data error:", displayErr);
      }

      // 5. Load streak data for results
      try {
        const authPlayerIds = entries
          .filter((e) => !e.player.isGuest && !e.isBot)
          .map((e) => e.player.id);
        if (authPlayerIds.length > 0 && streakMap.size === 0) {
          const streakRows = await db
            .select({ userId: userStats.userId, currentStreak: userStats.currentStreak })
            .from(userStats)
            .where(inArray(userStats.userId, authPlayerIds));
          for (const row of streakRows) {
            streakMap.set(row.userId, row.currentStreak);
          }
        }
      } catch (streakErr) {
        console.error("[race-manager] streak data error:", streakErr);
      }
    } catch (err) {
      console.error("[race-manager] DB error:", err);
    }

    // Build results array (always runs, even if DB failed)
    for (const entry of entries) {
      const stats = entry.progress.finalStats!;
      const streak = streakMap.get(entry.player.id);
      results.push({
        playerId: entry.player.id,
        name: entry.player.name,
        username: usernameMap.get(entry.player.id),
        placement: entry.progress.placement!,
        wpm: stats.wpm,
        rawWpm: stats.rawWpm,
        accuracy: stats.accuracy,
        eloChange: eloChanges.get(entry.player.id) ?? null,
        elo: eloAfterMap.get(entry.player.id) ?? entry.player.elo,
        streak: streak !== undefined ? streak : undefined,
      });
    }

    return results.sort((a, b) => a.placement - b.placement);
  }

  private cleanup() {
    if (this.countdownTimer) clearInterval(this.countdownTimer);
    if (this.progressTimer) clearInterval(this.progressTimer);

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
      finishTimeoutEnd: null,
      placementRace: this.placementRace,
    };
  }
}
