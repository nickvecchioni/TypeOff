import type { Server, Socket } from "socket.io";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  RacePlayer,
  RacePlayerProgress,
  RaceState,
  RaceStatus,
  WpmSample,
} from "@typeoff/shared";
import { calculateRaceElo, getRankTier, generateFromPool } from "@typeoff/shared";
import { createDb, races, raceParticipants, userStats, users } from "@typeoff/db";
import { eq, inArray, and, sql } from "drizzle-orm";
export interface RaceOwner {
  cleanupRace(raceId: string, socketIds: string[]): void;
}

type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;
type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

interface PlayerEntry {
  socket: TypedSocket | null;
  player: RacePlayer;
  progress: RacePlayerProgress;
  isBot: boolean;
  botTargetWpm: number;
  wpmHistory?: WpmSample[];
  lastProgressTime: number;
  progressEventsInWindow: number;
  progressWindowStart: number;
}

const COUNTDOWN_SECONDS = 3;
const WORD_COUNT = 50;
const PROGRESS_INTERVAL_MS = 100;

const DEFAULT_BOT_WPM_MIN = 40;
const DEFAULT_BOT_WPM_MAX = 80;
const BOT_WPM_VARIANCE = 5;

export interface BotWpmConfig {
  botWpmMin: number;
  botWpmMax: number;
}

const FINISH_TIMEOUT_SECONDS = 15;
const PLACEMENT_RACE_COUNT = 1;

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
  private finishTimeoutEnd: number | null = null;
  private finishTimeoutTimer: ReturnType<typeof setTimeout> | null = null;
  private wordCount: number;
  private expectedWords: string[] = [];
  private playerFlags = new Map<string, string[]>();

  constructor(
    private io: TypedServer,
    entries: Array<{ socket: TypedSocket; player: RacePlayer }>,
    private owner: RaceOwner,
    bots: RacePlayer[] = [],
    botWpmConfig?: BotWpmConfig,
    placementRace?: number,
  ) {
    this.placementRace = placementRace;
    this.raceId = crypto.randomUUID();
    this.seed = Math.floor(Math.random() * 2147483647);
    this.wordCount = WORD_COUNT;

    // Generate words from common pool
    this.expectedWords = generateFromPool(this.wordCount, this.seed);
    this.totalChars = this.expectedWords.reduce((sum, w) => sum + w.length, 0) + (this.wordCount - 1);

    // Add real players first (Map insertion order matters for guest identification)
    const now = Date.now();
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
        lastProgressTime: now,
        progressEventsInWindow: 0,
        progressWindowStart: now,
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
        lastProgressTime: now,
        progressEventsInWindow: 0,
        progressWindowStart: now,
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

    // Send initial race state directly to each socket (avoids room-join race condition)
    const state = this.getState();
    state.countdown = countdown;
    for (const entry of this.players.values()) {
      if (entry.socket) {
        console.log(`[race-manager] emitting raceStart to ${entry.socket.id} (connected=${entry.socket.connected}) race=${this.raceId}`);
      }
      entry.socket?.emit("raceStart", state);
    }

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

  private addFlag(playerId: string, reason: string) {
    const existing = this.playerFlags.get(playerId) ?? [];
    existing.push(reason);
    this.playerFlags.set(playerId, existing);
  }

  handleProgress(
    socketId: string,
    data: { wordIndex: number; charIndex: number; wpm: number; progress: number }
  ) {
    const entry = this.players.get(socketId);
    if (!entry || this.status !== "racing" || entry.progress.finished) return;

    const validated = this.validateProgress(data, entry);
    entry.progress.wordIndex = validated.wordIndex;
    entry.progress.charIndex = validated.charIndex;
    entry.progress.wpm = validated.wpm;
    entry.progress.progress = validated.progress;
  }

  handleFinish(
    socketId: string,
    data: { wpm: number; rawWpm: number; accuracy: number; wpmHistory?: WpmSample[]; keystrokeTimings?: number[] }
  ) {
    const entry = this.players.get(socketId);
    if (!entry || this.status !== "racing" || entry.progress.finished) return;

    const rejection = this.validateFinish(data, entry);
    if (rejection) return;

    entry.progress.finished = true;
    entry.progress.placement = this.nextPlacement++;
    entry.progress.progress = 1;
    entry.progress.finalStats = data;
    if (data.wpmHistory) entry.wpmHistory = data.wpmHistory;

    // In placement races (all opponents are bots), end immediately when the human finishes
    if (this.placementRace) {
      if (this.finishTimeoutTimer) clearTimeout(this.finishTimeoutTimer);
      this.endRace();
      return;
    }

    // Check if all players finished
    const allFinished = [...this.players.values()].every((p) => p.progress.finished);
    if (allFinished) {
      if (this.finishTimeoutTimer) clearTimeout(this.finishTimeoutTimer);
      this.endRace();
    } else if (this.finishTimeoutEnd === null) {
      // First finish — start the finish timeout
      this.finishTimeoutEnd = Date.now() + FINISH_TIMEOUT_SECONDS * 1000;
      this.finishTimeoutTimer = setTimeout(() => this.endRace(), FINISH_TIMEOUT_SECONDS * 1000);
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

  private validateProgress(
    data: { wordIndex: number; charIndex: number; wpm: number; progress: number },
    entry: PlayerEntry,
  ) {
    const now = Date.now();
    let { wordIndex, charIndex, wpm, progress } = data;

    // Clamp basic values
    wpm = Math.min(wpm, 350);
    progress = Math.max(0, Math.min(1, progress));

    // Reject going backwards in word index
    if (wordIndex < entry.progress.wordIndex) {
      this.addFlag(entry.player.id, "wordIndex regression");
      wordIndex = entry.progress.wordIndex;
    }

    // Reject exceeding word count
    if (wordIndex > this.wordCount) {
      this.addFlag(entry.player.id, "wordIndex exceeds wordCount");
      wordIndex = this.wordCount;
    }

    // Reject progress regression
    if (progress < entry.progress.progress) {
      this.addFlag(entry.player.id, "progress regression");
      progress = entry.progress.progress;
    }

    // Rate limit: flag if >20 progress events per second
    if (now - entry.progressWindowStart > 1000) {
      entry.progressEventsInWindow = 0;
      entry.progressWindowStart = now;
    }
    entry.progressEventsInWindow++;
    if (entry.progressEventsInWindow > 20) {
      this.addFlag(entry.player.id, "excessive progress rate");
    }
    entry.lastProgressTime = now;

    return { wordIndex, charIndex, wpm, progress };
  }

  private validateFinish(
    data: { wpm: number; rawWpm: number; accuracy: number; wpmHistory?: WpmSample[]; keystrokeTimings?: number[] },
    entry: PlayerEntry,
  ): string | null {
    const socket = entry.socket;

    if (data.wpm > 300) {
      socket?.emit("error", { message: "Invalid finish: WPM exceeds maximum" });
      return "wpm too high";
    }
    if (data.rawWpm > 350) {
      socket?.emit("error", { message: "Invalid finish: raw WPM exceeds maximum" });
      return "rawWpm too high";
    }
    if (data.accuracy < 0 || data.accuracy > 100) {
      socket?.emit("error", { message: "Invalid finish: accuracy out of range" });
      return "accuracy out of range";
    }
    if (data.rawWpm < data.wpm) {
      socket?.emit("error", { message: "Invalid finish: raw WPM cannot be less than WPM" });
      return "rawWpm < wpm";
    }
    // Check elapsed time vs theoretical minimum (300 WPM)
    if (this.startedAt) {
      const elapsedSec = (Date.now() - this.startedAt.getTime()) / 1000;
      const minTimeSec = (this.totalChars / 5) / (300 / 60); // time at 300 WPM
      if (elapsedSec < minTimeSec * 0.8) {
        socket?.emit("error", { message: "Invalid finish: completed too quickly" });
        return "too fast";
      }
    }

    // Cross-validate wpmHistory if provided (flag, don't reject)
    if (data.wpmHistory && data.wpmHistory.length > 1) {
      // Check monotonically increasing elapsed
      for (let i = 1; i < data.wpmHistory.length; i++) {
        if (data.wpmHistory[i].elapsed < data.wpmHistory[i - 1].elapsed) {
          this.addFlag(entry.player.id, "wpmHistory elapsed not monotonic");
          break;
        }
      }
      // Check no wpm > 350
      if (data.wpmHistory.some((s) => s.wpm > 350)) {
        this.addFlag(entry.player.id, "wpmHistory wpm exceeds 350");
      }
      // Check final sample's elapsed roughly matches actual race duration
      if (this.startedAt) {
        const actualDuration = (Date.now() - this.startedAt.getTime()) / 1000;
        const lastSample = data.wpmHistory[data.wpmHistory.length - 1];
        if (Math.abs(lastSample.elapsed - actualDuration) > actualDuration * 0.3) {
          this.addFlag(entry.player.id, "wpmHistory duration mismatch");
        }
      }
    }

    // Validate keystroke timings if provided (flag, don't reject)
    if (data.keystrokeTimings && data.keystrokeTimings.length > 5) {
      const timings = data.keystrokeTimings;
      // Flag if any gaps are 0ms
      if (timings.some((t) => t === 0)) {
        this.addFlag(entry.player.id, "keystroke timing has 0ms gap");
      }
      // Flag if stddev is suspiciously low (< 10ms suggests bot/macro)
      const mean = timings.reduce((a, b) => a + b, 0) / timings.length;
      const variance = timings.reduce((sum, t) => sum + (t - mean) ** 2, 0) / timings.length;
      const stddev = Math.sqrt(variance);
      if (stddev < 10) {
        this.addFlag(entry.player.id, "keystroke timing stddev < 10ms (bot/macro)");
      }
    }

    return null;
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
      entry.progress.wordIndex = Math.floor(entry.progress.progress * this.wordCount);

      if (entry.progress.progress >= 1) {
        entry.progress.progress = 1;
        entry.progress.finished = true;
        entry.progress.placement = this.nextPlacement++;
        entry.progress.wordIndex = this.wordCount;
        entry.progress.finalStats = {
          wpm: Math.round(entry.botTargetWpm),
          rawWpm: Math.round(entry.botTargetWpm),
          accuracy: Math.round(95 + Math.random() * 5),
        };

        // Check if all players finished
        const allFinished = [...this.players.values()].every((p) => p.progress.finished);
        if (allFinished) {
          if (this.finishTimeoutTimer) clearTimeout(this.finishTimeoutTimer);
          this.endRace();
          return;
        } else if (this.finishTimeoutEnd === null) {
          this.finishTimeoutEnd = Date.now() + FINISH_TIMEOUT_SECONDS * 1000;
          this.finishTimeoutTimer = setTimeout(() => this.endRace(), FINISH_TIMEOUT_SECONDS * 1000);
        }
      }
    }
  }

  private broadcastProgress() {
    const progress: Record<string, RacePlayerProgress> = {};
    for (const entry of this.players.values()) {
      progress[entry.player.id] = entry.progress;
    }
    this.io.to(this.raceId).emit("raceProgress", {
      progress,
      ...(this.finishTimeoutEnd != null ? { finishTimeoutEnd: this.finishTimeoutEnd } : {}),
    });
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
      wpmHistory?: WpmSample[];
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
        wordCount: this.wordCount,
        wordPool: "common",
        playerCount: entries.length,
        startedAt: this.startedAt ?? new Date(),
        finishedAt: new Date(),
      });

      // 2. Insert participants and update stats
      for (const entry of entries) {
        if (entry.isBot) continue;

        const stats = entry.progress.finalStats!;
        const placement = entry.progress.placement!;

        // Insert participant record (with anti-cheat flags if any)
        const flags = this.playerFlags.get(entry.player.id);
        await db.insert(raceParticipants).values({
          raceId: this.raceId,
          userId: entry.player.isGuest ? null : entry.player.id,
          guestName: entry.player.isGuest ? entry.player.name : null,
          placement,
          wpm: stats.wpm,
          rawWpm: stats.rawWpm,
          accuracy: stats.accuracy,
          finishedAt: new Date(),
          flagged: flags != null && flags.length > 0,
          flagReason: flags?.join("; ") ?? null,
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
            await this.calibratePlacement(db, entry.player.id);
          }
        }
      }

      // 3. Calculate ELO for non-placement races
      const authPlayers = entries.filter((e) => !e.player.isGuest && !e.isBot);
      const botEntries = entries.filter((e) => e.isBot);

      if (!this.placementRace && authPlayers.length >= 1) {
        const playerIds = authPlayers.map((e) => e.player.id);

        // Read ELO from users table
        const userRows = await db
          .select({
            id: users.id,
            eloRating: users.eloRating,
            peakEloRating: users.peakEloRating,
          })
          .from(users)
          .where(inArray(users.id, playerIds));
        const userMap = new Map(userRows.map((r) => [r.id, r]));

        const statsRows = await db
          .select()
          .from(userStats)
          .where(inArray(userStats.userId, playerIds));
        const statsMap = new Map(statsRows.map((s) => [s.userId, s]));

        // Include bots as virtual opponents for ELO calculation
        const eloInput = [
          ...authPlayers.map((e) => ({
            id: e.player.id,
            elo: userMap.get(e.player.id)?.eloRating ?? 1000,
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

          const user = userMap.get(userId);
          const currentElo = user?.eloRating ?? 1000;
          const newElo = Math.max(0, currentElo + change);
          const peakElo = user?.peakEloRating ?? 1000;

          // Update users table directly
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

          eloAfterMap.set(userId, newElo);
        }

        // Update participant records with elo data
        for (const entry of authPlayers) {
          const user = userMap.get(entry.player.id);
          const currentElo = user?.eloRating ?? 1000;
          const change = eloChanges.get(entry.player.id) ?? 0;
          const newElo = Math.max(0, currentElo + change);
          await db
            .update(raceParticipants)
            .set({ eloBefore: currentElo, eloAfter: newElo })
            .where(
              and(
                eq(raceParticipants.raceId, this.raceId),
                eq(raceParticipants.userId, entry.player.id),
              )
            );
        }
      }

      // 4. Load display data (usernames + elo for players not yet in eloAfterMap)
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
            if (!eloAfterMap.has(row.id)) eloAfterMap.set(row.id, row.eloRating);
          }
        }
      } catch (displayErr) {
        console.error("[race-manager] display data error:", displayErr);
      }

      // 5. Load streak data
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
        wpmHistory: !entry.isBot ? entry.wpmHistory : undefined,
      });
    }

    return results.sort((a, b) => a.placement - b.placement);
  }

  /** Calibrate initial ELO after placement races */
  private async calibratePlacement(db: ReturnType<typeof createDb>, userId: string) {
    // Get avg WPM from this player's recent races
    const recentResults = await db
      .select({ wpm: raceParticipants.wpm })
      .from(raceParticipants)
      .where(eq(raceParticipants.userId, userId))
      .orderBy(sql`${raceParticipants.finishedAt} DESC`)
      .limit(PLACEMENT_RACE_COUNT);

    const wpms = recentResults.map((r) => r.wpm ?? 0);
    const avgWpm = wpms.length > 0 ? wpms.reduce((a, b) => a + b, 0) / wpms.length : 50;
    const initialElo = Math.min(2600, Math.max(600, Math.round(500 + avgWpm * 10)));
    const initialTier = getRankTier(initialElo);

    await db
      .update(users)
      .set({
        eloRating: initialElo,
        rankTier: initialTier,
        peakEloRating: initialElo,
        peakRankTier: initialTier,
        placementsCompleted: true,
      })
      .where(eq(users.id, userId));
  }

  private cleanup() {
    if (this.countdownTimer) clearInterval(this.countdownTimer);
    if (this.progressTimer) clearInterval(this.progressTimer);
    if (this.finishTimeoutTimer) clearTimeout(this.finishTimeoutTimer);

    const socketIds: string[] = [];
    for (const [key, entry] of this.players.entries()) {
      if (entry.socket) {
        entry.socket.leave(this.raceId);
        socketIds.push(key);
      }
    }
    this.owner.cleanupRace(this.raceId, socketIds);
  }

  getSpectatorState(): RaceState {
    return this.getState();
  }

  getRaceStatus(): RaceStatus {
    return this.status;
  }

  getPlayerList(): RacePlayer[] {
    return [...this.players.values()].map((e) => e.player);
  }

  getRaceId(): string {
    return this.raceId;
  }

  addSpectator(socket: TypedSocket) {
    socket.join(this.raceId);
  }

  removeSpectator(socket: TypedSocket) {
    socket.leave(this.raceId);
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
      wordCount: this.wordCount,
      countdown: 0,
      finishTimeoutEnd: this.finishTimeoutEnd,
      placementRace: this.placementRace,
    };
  }
}
