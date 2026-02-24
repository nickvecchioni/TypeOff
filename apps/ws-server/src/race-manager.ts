import type { Server, Socket } from "socket.io";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  RacePlayer,
  RacePlayerProgress,
  RaceState,
  RaceStatus,
  WpmSample,
  EmoteKey,
} from "@typeoff/shared";
import { calculateRaceElo, getRankTier, generateWordsForMode, quotes, EMOTE_KEYS, scoreTextDifficulty, calculatePP, calculateTotalPP, CHALLENGE_MAP, ACHIEVEMENT_MAP, getXpLevel } from "@typeoff/shared";
import type { RankTier, RaceMode, ModeCategory, ReplaySnapshot } from "@typeoff/shared";
import type { NotificationManager } from "./notification-manager.js";
import { createDb, races, raceParticipants, userStats, userModeStats, users, userActiveCosmetics, textLeaderboards } from "@typeoff/db";
import { eq, inArray, and, sql, desc } from "drizzle-orm";
import { checkAchievements } from "./achievement-checker.js";
import { checkChallenges, type ChallengeCheckResult } from "./challenge-checker.js";
import { checkXpRewards, type XpContext, type XpProgress } from "./xp-checker.js";
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
  botReactionTicks: number;
  botRawProgress: number;
  botSpeedMultiplier: number;
  botNextRhythmTick: number;
  botTickCounter: number;
  botTypingTicks: number;
  wpmHistory?: WpmSample[];
  replaySnapshots: ReplaySnapshot[];
  misstypedChars?: number;
  lastProgressTime: number;
  progressEventsInWindow: number;
  progressWindowStart: number;
  lastEmoteAt: number;
}

const COUNTDOWN_SECONDS = 5;
const PROGRESS_INTERVAL_MS = 100;

const DEFAULT_BOT_WPM_MIN = 40;
const DEFAULT_BOT_WPM_MAX = 80;
const BOT_WPM_VARIANCE = 5;
const BOT_REACTION_MIN_MS = 300;
const BOT_REACTION_MAX_MS = 800;

export interface BotWpmConfig {
  botWpmMin: number;
  botWpmMax: number;
  perBotWpm?: number[];
}

const FINISH_TIMEOUT_SECONDS = 15;
const PLACEMENT_RACE_COUNT = 3;
const DISCONNECT_GRACE_MS = 10_000;

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
  private wordCharsTotal = 0;          // sum of token lengths only (no inter-word spaces)
  private cumulativeWordChars: number[] = []; // cumulativeWordChars[i] = char offset of word i
  private placementRace?: number;
  private finishTimeoutEnd: number | null = null;
  private finishTimeoutTimer: ReturnType<typeof setTimeout> | null = null;
  private wordCount: number;
  private expectedWords: string[] = [];
  private playerFlags = new Map<string, string[]>();
  private mode: RaceMode;
  private modeCategory: ModeCategory;
  private disconnectGraceTimer: ReturnType<typeof setTimeout> | null = null;
  private resultsCleanupTimer: ReturnType<typeof setTimeout> | null = null;
  private spectatorInfo = new Map<string, { userId: string; name: string }>();

  private static readonly CATEGORY_MODES: Record<ModeCategory, RaceMode[]> = {
    words: ["standard", "sprint", "marathon"],
    special: ["special"],
    quotes: ["quotes"],
    code: ["code"],
  };

  constructor(
    private io: TypedServer,
    entries: Array<{ socket: TypedSocket; player: RacePlayer }>,
    private owner: RaceOwner,
    bots: RacePlayer[] = [],
    botWpmConfig?: BotWpmConfig,
    placementRace?: number,
    private notificationManager?: NotificationManager,
    modeCategory?: ModeCategory,
  ) {
    this.placementRace = placementRace;
    this.raceId = crypto.randomUUID();
    this.modeCategory = placementRace !== undefined ? "words" : (modeCategory ?? "words");

    // Select race mode (placement races always use standard)
    if (placementRace) {
      this.mode = "standard";
    } else {
      const pool = RaceManager.CATEGORY_MODES[this.modeCategory];
      this.mode = pool[Math.floor(Math.random() * pool.length)];
    }

    // For quotes mode, seed is a quote index; otherwise a PRNG seed
    this.seed = this.mode === "quotes"
      ? Math.floor(Math.random() * quotes.length)
      : Math.floor(Math.random() * 2147483647);

    this.expectedWords = generateWordsForMode(this.mode, this.seed);
    this.wordCount = this.expectedWords.length;
    this.wordCharsTotal = this.expectedWords.reduce((sum, w) => sum + w.length, 0);
    this.totalChars = this.wordCharsTotal + (this.wordCount - 1);

    // Precompute cumulative char offsets for accurate bot wordIndex mapping
    let cumsum = 0;
    this.cumulativeWordChars = this.expectedWords.map((w) => {
      const offset = cumsum;
      cumsum += w.length;
      return offset;
    });

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
        botReactionTicks: 0,
        botRawProgress: 0,
        botSpeedMultiplier: 1,
        botNextRhythmTick: 0,
        botTickCounter: 0,
        botTypingTicks: 0,
        replaySnapshots: [],
        lastProgressTime: now,
        progressEventsInWindow: 0,
        progressWindowStart: now,
        lastEmoteAt: 0,
      });
    }

    // Add bot players (keyed by player id, null socket)
    const wpmMin = botWpmConfig?.botWpmMin ?? DEFAULT_BOT_WPM_MIN;
    const wpmMax = botWpmConfig?.botWpmMax ?? DEFAULT_BOT_WPM_MAX;
    const perBotWpm = botWpmConfig?.perBotWpm;

    // Harder modes slow bots down so they aren't unreasonably fast
    const modeDifficultyMultiplier: Record<RaceMode, number> = {
      standard: 1.0,
      quotes: 0.95,
      marathon: 0.92,
      sprint: 1.0,
      punctuation: 0.78,
      numbers: 0.82,
      difficult: 0.75,
      code: 0.65,
      special: 0.78,
    };
    const modeMultiplier = modeDifficultyMultiplier[this.mode];

    for (let botIdx = 0; botIdx < bots.length; botIdx++) {
      const bot = bots[botIdx];
      const baseWpm = perBotWpm?.[botIdx] != null
        ? perBotWpm[botIdx] + (Math.random() - 0.5) * 2 * BOT_WPM_VARIANCE
        : wpmMin + Math.random() * (wpmMax - wpmMin);
      const targetWpm = baseWpm * modeMultiplier;
      const reactionMs = BOT_REACTION_MIN_MS + Math.random() * (BOT_REACTION_MAX_MS - BOT_REACTION_MIN_MS);
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
        botReactionTicks: Math.ceil(reactionMs / PROGRESS_INTERVAL_MS),
        botRawProgress: 0,
        botSpeedMultiplier: 1.0,
        botNextRhythmTick: Math.floor(5 + Math.random() * 10),
        botTickCounter: 0,
        botTypingTicks: 0,
        replaySnapshots: [],
        lastProgressTime: now,
        progressEventsInWindow: 0,
        progressWindowStart: now,
        lastEmoteAt: 0,
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

    // Capture replay snapshot
    if (this.startedAt) {
      entry.replaySnapshots.push({
        t: Date.now() - this.startedAt.getTime(),
        w: validated.wordIndex,
        c: validated.charIndex,
      });
    }

    // Safety net: auto-finish player when progress reaches 1.0 but raceFinish
    // event was never received (e.g. client-side finish detection failed)
    if (validated.progress >= 1 && !entry.progress.finished && validated.wpm > 0) {
      console.log(
        `[race-manager] Auto-finishing player ${entry.player.id} via progress safety net (progress=${validated.progress}, wpm=${validated.wpm})`,
      );
      this.handleFinish(socketId, {
        wpm: validated.wpm,
        rawWpm: validated.wpm,
        accuracy: 100,
      });
    }
  }

  handleFinish(
    socketId: string,
    data: { wpm: number; rawWpm: number; accuracy: number; misstypedChars?: number; wpmHistory?: WpmSample[]; keystrokeTimings?: number[] }
  ) {
    const entry = this.players.get(socketId);
    if (!entry || this.status !== "racing" || entry.progress.finished) return;

    const rejection = this.validateFinish(data, entry);
    if (rejection) return;

    entry.progress.finished = true;
    entry.progress.placement = this.nextPlacement++;
    entry.progress.progress = 1;
    entry.progress.finalStats = data;
    if (data.misstypedChars != null) entry.misstypedChars = data.misstypedChars;
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

  /** Remove a player during countdown — no penalty, no stats */
  handleLeaveCountdown(socketId: string): boolean {
    if (this.status !== "countdown") return false;
    const entry = this.players.get(socketId);
    if (!entry) return false;

    entry.socket?.leave(this.raceId);
    this.players.delete(socketId);

    // Cancel race entirely if no real players remain (don't persist anything)
    const hasRealPlayers = [...this.players.values()].some((p) => !p.isBot);
    if (!hasRealPlayers) {
      this.cancelRace();
    }
    return true;
  }

  handleDisconnect(socketId: string) {
    const entry = this.players.get(socketId);
    if (!entry) return;

    // During countdown — clean removal, no penalty
    if (this.status === "countdown") {
      this.handleLeaveCountdown(socketId);
      return;
    }

    // Null out the socket and leave the room (keep entry for reconnection / persist)
    entry.socket?.leave(this.raceId);
    entry.socket = null;

    // Check if other humans are still connected
    const hasConnectedRealPlayers = [...this.players.values()].some(
      (p) => !p.isBot && p.socket != null,
    );

    if (hasConnectedRealPlayers) {
      // Multi-human race: immediate forfeit for the disconnected player
      if (!entry.progress.finished && this.status === "racing") {
        entry.progress.finished = true;
        entry.progress.placement = this.nextPlacement++;
        entry.progress.finalStats = { wpm: 0, rawWpm: 0, accuracy: 0 };
      }
    } else {
      // Last human disconnected — start grace period (bots keep ticking)
      if (!this.disconnectGraceTimer && this.status === "racing") {
        this.disconnectGraceTimer = setTimeout(() => {
          this.disconnectGraceTimer = null;
          // Grace expired — mark all disconnected humans as forfeited, then end
          for (const p of this.players.values()) {
            if (!p.isBot && p.socket == null && !p.progress.finished) {
              p.progress.finished = true;
              p.progress.placement = this.nextPlacement++;
              p.progress.finalStats = { wpm: 0, rawWpm: 0, accuracy: 0 };
            }
          }
          this.endRace();
        }, DISCONNECT_GRACE_MS);
      }
    }
  }

  /** Reconnect a player who briefly disconnected. Returns true on success. */
  reconnectPlayer(userId: string, newSocket: TypedSocket): boolean {
    if (this.status === "finished") return false;

    // Find existing entry by userId
    let oldSocketId: string | null = null;
    let entry: PlayerEntry | null = null;
    for (const [key, e] of this.players.entries()) {
      if (e.player.id === userId && !e.isBot) {
        oldSocketId = key;
        entry = e;
        break;
      }
    }
    if (!oldSocketId || !entry) return false;

    // Re-key the entry from old socketId to new socketId
    this.players.delete(oldSocketId);
    entry.socket = newSocket;
    this.players.set(newSocket.id, entry);

    // Join the new socket to the race room
    newSocket.join(this.raceId);

    // Cancel grace timer if running
    if (this.disconnectGraceTimer) {
      clearTimeout(this.disconnectGraceTimer);
      this.disconnectGraceTimer = null;
    }

    return true;
  }

  /** Get the current race state (used for reconnection and spectating) */
  getState(): RaceState {
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
      mode: this.mode,
    };
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
    data: { wpm: number; rawWpm: number; accuracy: number; misstypedChars?: number; wpmHistory?: WpmSample[]; keystrokeTimings?: number[] },
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

      // Simulate reaction time before bot starts typing
      if (entry.botReactionTicks > 0) {
        entry.botReactionTicks--;
        continue;
      }

      entry.botTypingTicks++;

      // Update typing rhythm: gentle burst/pause cycle
      entry.botTickCounter++;
      if (entry.botTickCounter >= entry.botNextRhythmTick) {
        // 70% chance slight burst (0.95-1.1), 30% chance slight pause (0.85-0.95)
        if (Math.random() < 0.7) {
          entry.botSpeedMultiplier = 0.95 + Math.random() * 0.15;
        } else {
          entry.botSpeedMultiplier = 0.85 + Math.random() * 0.1;
        }
        entry.botNextRhythmTick = Math.floor(5 + Math.random() * 10);
        entry.botTickCounter = 0;
      }

      // Per-tick WPM jitter for natural feel
      const jitter = (Math.random() - 0.5) * 2 * BOT_WPM_VARIANCE;
      const effectiveWpm = Math.max(10, (entry.botTargetWpm + jitter) * entry.botSpeedMultiplier);

      // WPM = (chars / 5) / minutes → chars/min = WPM * 5
      // At 100ms intervals: chars/tick = (WPM * 5) / (60 * 10)
      // charsPerTick includes inter-word spaces (standard WPM definition), so divide
      // by totalChars (which also includes spaces) for an accurate progress ratio.
      const charsPerTick = (effectiveWpm * 5) / 600;
      const progressPerTick = charsPerTick / this.totalChars;

      // Track raw progress internally, cap broadcast at 97% until truly done
      entry.botRawProgress += progressPerTick;
      entry.progress.progress = Math.min(0.97, entry.botRawProgress);

      // Derive wordIndex from cumulative char offsets (word-chars only, no spaces)
      const charsTyped = entry.botRawProgress * this.wordCharsTotal;
      let wordIndex = this.wordCount - 1;
      for (let i = 0; i < this.cumulativeWordChars.length; i++) {
        if (this.cumulativeWordChars[i] > charsTyped) { wordIndex = i - 1; break; }
      }
      entry.progress.wordIndex = Math.max(0, wordIndex);

      // Running average WPM based on actual progress and elapsed time
      const elapsedMinutes = (entry.botTypingTicks * PROGRESS_INTERVAL_MS) / 60_000;
      const wordsTyped = (entry.botRawProgress * this.totalChars) / 5;
      const runningWpm = elapsedMinutes > 0 ? Math.round(wordsTyped / elapsedMinutes) : 0;
      entry.progress.wpm = runningWpm;

      if (entry.botRawProgress >= 1) {
        entry.progress.progress = 1;
        entry.progress.finished = true;
        entry.progress.placement = this.nextPlacement++;
        entry.progress.wordIndex = this.wordCount;
        entry.progress.finalStats = {
          wpm: runningWpm,
          rawWpm: runningWpm,
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

  get isFinished() { return this.status === "finished"; }

  private async endRace() {
    if (this.status === "finished") return;
    this.status = "finished";

    if (this.progressTimer) clearInterval(this.progressTimer);

    // Mark unfinished players as finished with their current stats
    for (const entry of this.players.values()) {
      if (!entry.progress.finished) {
        entry.progress.finished = true;
        entry.progress.finalStats = {
          wpm: entry.progress.wpm,
          rawWpm: entry.progress.wpm,
          accuracy: 100,
        };
      }
    }

    // Re-assign placements by WPM (highest first).
    // Finish-order alone is unfair because bots have zero reaction time,
    // while humans' WPM is measured from their first keystroke.
    const sorted = [...this.players.values()].sort((a, b) => {
      const aWpm = a.progress.finalStats?.wpm ?? 0;
      const bWpm = b.progress.finalStats?.wpm ?? 0;
      // Finished players beat unfinished (progress < 1)
      if (a.progress.progress >= 1 && b.progress.progress < 1) return -1;
      if (b.progress.progress >= 1 && a.progress.progress < 1) return 1;
      // Among finished: highest WPM wins
      return bWpm - aWpm;
    });
    for (let i = 0; i < sorted.length; i++) {
      sorted[i].progress.placement = i + 1;
    }

    // Emit immediate results from in-memory data so the client gets results ASAP.
    // DB persistence (ELO, achievements, etc.) happens in the background afterward.
    const immediateResults = [...this.players.values()]
      .map((entry) => ({
        playerId: entry.player.id,
        name: entry.player.name,
        placement: entry.progress.placement ?? 99,
        wpm: entry.progress.finalStats?.wpm ?? 0,
        rawWpm: entry.progress.finalStats?.rawWpm ?? 0,
        accuracy: entry.progress.finalStats?.accuracy ?? 0,
        eloChange: null as number | null,
        elo: entry.player.elo,
        activeBadge: entry.player.activeBadge,
        activeNameColor: entry.player.activeNameColor,
        activeNameEffect: entry.player.activeNameEffect,
      }))
      .sort((a, b) => a.placement - b.placement);

    const immediatePayload = {
      results: immediateResults,
      ...(this.placementRace != null
        ? { placementRace: this.placementRace, placementTotal: PLACEMENT_RACE_COUNT }
        : {}),
    };

    // Send results to clients IMMEDIATELY — don't wait for DB
    this.io.to(this.raceId).emit("raceFinished", immediatePayload);

    // Persist to DB in the background, then send enriched results (ELO, achievements, etc.)
    this.persistResults()
      .then((enrichedResults) => {
        const enrichedPayload = {
          results: enrichedResults,
          ...(this.placementRace != null
            ? { placementRace: this.placementRace, placementTotal: PLACEMENT_RACE_COUNT }
            : {}),
        };
        // Send enriched results so clients can update with ELO changes, achievements, etc.
        this.io.to(this.raceId).emit("raceFinished", enrichedPayload);
      })
      .catch((err) => {
        console.error("[race-manager] persistResults failed:", err);
        // Immediate results already sent — client has basic data
      });

    // Keep race alive for 90s so players can emote on the results screen
    this.resultsCleanupTimer = setTimeout(() => this.cleanup(), 90_000);
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
      misstypedChars?: number;
      eloChange: number | null;
      elo?: number;
      streak?: number;
      wpmHistory?: WpmSample[];
      newAchievements?: string[];
      challengeProgress?: Array<{
        challengeId: string;
        progress: number;
        target: number;
        completed: boolean;
        justCompleted: boolean;
        xpAwarded: number;
      }>;
      xpEarned?: number;
      xpProgress?: XpProgress;
      activeBadge?: string | null;
      activeNameColor?: string | null;
      activeNameEffect?: string | null;
      level?: number;
    }> = [];

    // Track per-player data for results
    const eloChanges = new Map<string, number>();
    const usernameMap = new Map<string, string>();
    const eloAfterMap = new Map<string, number>();
    const streakMap = new Map<string, number>();
    const levelMap = new Map<string, number>();
    const achievementMap = new Map<string, string[]>();
    const challengeMap = new Map<string, ChallengeCheckResult>();
    const xpProgressMap = new Map<string, XpProgress>();
    const playerStatsMap = new Map<string, { racesPlayed: number; racesWon: number; currentStreak: number; maxStreak: number }>();
    const cosmeticsMap = new Map<string, { activeBadge: string | null; activeNameColor: string | null; activeNameEffect: string | null }>();

    const db = createDb(process.env.DATABASE_URL!);

    // Steps 1-3: race insert, participants, stats, ELO
    try {
      // 1. Insert race record
      await db.insert(races).values({
        id: this.raceId,
        seed: this.seed,
        wordCount: this.wordCount,
        wordPool: this.mode,
        modeCategory: this.modeCategory,
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
          wpmHistory: entry.wpmHistory ? JSON.stringify(entry.wpmHistory) : null,
          replayData: entry.replaySnapshots.length > 0 ? JSON.stringify(entry.replaySnapshots) : null,
        });

        // Update user stats for authenticated players
        if (!entry.player.isGuest) {
          const existing = await db
            .select()
            .from(userStats)
            .where(eq(userStats.userId, entry.player.id));

          const todayUTC = new Date().toISOString().slice(0, 10);

          if (existing.length === 0) {
            const newStreak = placement === 1 ? 1 : 0;
            const newWon = placement === 1 ? 1 : 0;
            streakMap.set(entry.player.id, newStreak);
            playerStatsMap.set(entry.player.id, { racesPlayed: 1, racesWon: newWon, currentStreak: newStreak, maxStreak: newStreak });
            await db.insert(userStats).values({
              userId: entry.player.id,
              racesPlayed: 1,
              racesWon: newWon,
              avgWpm: stats.wpm,
              maxWpm: stats.wpm,
              avgAccuracy: stats.accuracy,
              currentStreak: newStreak,
              maxStreak: newStreak,
              lastRankedDate: todayUTC,
              rankedDayStreak: 1,
              maxRankedDayStreak: 1,
            });
          } else {
            const s = existing[0];
            const newPlayed = s.racesPlayed + 1;
            const newWon = s.racesWon + (placement === 1 ? 1 : 0);
            const newStreak = placement === 1 ? s.currentStreak + 1 : 0;
            const newMaxStreak = Math.max(s.maxStreak, newStreak);
            streakMap.set(entry.player.id, newStreak);
            playerStatsMap.set(entry.player.id, { racesPlayed: newPlayed, racesWon: newWon, currentStreak: newStreak, maxStreak: newMaxStreak });

            // Ranked day streak logic
            let rankedDayStreak = s.rankedDayStreak;
            if (s.lastRankedDate === todayUTC) {
              // Already played today — no streak change
            } else {
              const yd = new Date();
              yd.setUTCDate(yd.getUTCDate() - 1);
              const yesterdayUTC = yd.toISOString().slice(0, 10);
              if (s.lastRankedDate === yesterdayUTC) {
                rankedDayStreak = s.rankedDayStreak + 1;
              } else {
                rankedDayStreak = 1;
              }
            }
            const maxRankedDayStreak = Math.max(rankedDayStreak, s.maxRankedDayStreak);

            await db
              .update(userStats)
              .set({
                racesPlayed: newPlayed,
                racesWon: newWon,
                avgWpm: (s.avgWpm * s.racesPlayed + stats.wpm) / newPlayed,
                maxWpm: Math.max(s.maxWpm, stats.wpm),
                avgAccuracy:
                  (s.avgAccuracy * s.racesPlayed + stats.accuracy) / newPlayed,
                currentStreak: newStreak,
                maxStreak: newMaxStreak,
                lastRankedDate: todayUTC,
                rankedDayStreak,
                maxRankedDayStreak,
                updatedAt: new Date(),
              })
              .where(eq(userStats.userId, entry.player.id));
          }

          // Upsert per-mode stats
          const modeWon = placement === 1 ? 1 : 0;
          await db
            .insert(userModeStats)
            .values({
              userId: entry.player.id,
              modeCategory: this.modeCategory,
              racesPlayed: 1,
              racesWon: modeWon,
              avgWpm: stats.wpm,
              bestWpm: stats.wpm,
              avgAccuracy: stats.accuracy,
              updatedAt: new Date(),
            })
            .onConflictDoUpdate({
              target: [userModeStats.userId, userModeStats.modeCategory],
              set: {
                racesPlayed: sql`${userModeStats.racesPlayed} + 1`,
                racesWon: sql`${userModeStats.racesWon} + ${modeWon}`,
                avgWpm: sql`(${userModeStats.avgWpm} * ${userModeStats.racesPlayed} + excluded.avg_wpm) / (${userModeStats.racesPlayed} + 1)`,
                bestWpm: sql`CASE WHEN excluded.best_wpm > ${userModeStats.bestWpm} THEN excluded.best_wpm ELSE ${userModeStats.bestWpm} END`,
                avgAccuracy: sql`(${userModeStats.avgAccuracy} * ${userModeStats.racesPlayed} + excluded.avg_accuracy) / (${userModeStats.racesPlayed} + 1)`,
                updatedAt: new Date(),
              },
            });

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
            wpm: e.progress.finalStats?.wpm ?? 0,
            accuracy: e.progress.finalStats?.accuracy,
            isBot: false,
          })),
          ...botEntries.map((e) => ({
            id: e.player.id,
            elo: e.player.elo,
            placement: e.progress.placement!,
            gamesPlayed: 30, // Bots use experienced K-factor
            wpm: e.progress.finalStats?.wpm ?? 0,
            isBot: true,
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

        // Notify rank changes
        if (this.notificationManager) {
          for (const entry of authPlayers) {
            const user = userMap.get(entry.player.id);
            const oldElo = user?.eloRating ?? 1000;
            const newElo = eloAfterMap.get(entry.player.id) ?? oldElo;
            const oldTier = getRankTier(oldElo);
            const newTier = getRankTier(newElo);
            if (oldTier !== newTier) {
              const direction = newElo > oldElo ? "up" : "down";
              this.notificationManager.notify(entry.player.id, {
                type: direction === "up" ? "rank_up" : "rank_down",
                title: direction === "up" ? "Rank Up!" : "Rank Down",
                body: `You ${direction === "up" ? "promoted" : "demoted"} to ${newTier.charAt(0).toUpperCase() + newTier.slice(1)}`,
                actionUrl: `/profile/${usernameMap.get(entry.player.id) ?? entry.player.name}`,
              });
            }
          }
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
    } catch (err) {
      console.error("[race-manager] DB error (persist):", err);
    }

    // 3b. PP calculation + text leaderboard upsert (non-placement races only)
    if (!this.placementRace) {
      try {
        const difficulty = scoreTextDifficulty(this.expectedWords);
        const textHash = `${this.seed}:${this.mode}`;

        for (const entry of entries) {
          if (entry.isBot || entry.player.isGuest) continue;
          const flags = this.playerFlags.get(entry.player.id);
          if (flags && flags.length > 0) continue; // Skip flagged players

          const stats = entry.progress.finalStats;
          if (!stats || stats.wpm <= 0) continue;

          const pp = calculatePP(stats.wpm, stats.accuracy, difficulty.score);

          // Update participant PP
          await db
            .update(raceParticipants)
            .set({ pp })
            .where(
              and(
                eq(raceParticipants.raceId, this.raceId),
                eq(raceParticipants.userId, entry.player.id),
              ),
            );

          // Upsert text leaderboard (best WPM wins)
          await db
            .insert(textLeaderboards)
            .values({
              textHash,
              seed: this.seed,
              mode: this.mode,
              userId: entry.player.id,
              bestWpm: stats.wpm,
              bestAccuracy: stats.accuracy,
              bestRaceId: this.raceId,
              pp,
              textDifficulty: difficulty.score,
            })
            .onConflictDoUpdate({
              target: [textLeaderboards.textHash, textLeaderboards.userId],
              set: {
                bestWpm: sql`CASE WHEN excluded.best_wpm > ${textLeaderboards.bestWpm} THEN excluded.best_wpm ELSE ${textLeaderboards.bestWpm} END`,
                bestAccuracy: sql`CASE WHEN excluded.best_wpm > ${textLeaderboards.bestWpm} THEN excluded.best_accuracy ELSE ${textLeaderboards.bestAccuracy} END`,
                bestRaceId: sql`CASE WHEN excluded.best_wpm > ${textLeaderboards.bestWpm} THEN excluded.best_race_id ELSE ${textLeaderboards.bestRaceId} END`,
                pp: sql`CASE WHEN excluded.best_wpm > ${textLeaderboards.bestWpm} THEN excluded.pp ELSE ${textLeaderboards.pp} END`,
                updatedAt: new Date(),
              },
            });

          // Recalculate user's total PP (weighted sum of top 50)
          const topScores = await db
            .select({ pp: textLeaderboards.pp })
            .from(textLeaderboards)
            .where(eq(textLeaderboards.userId, entry.player.id))
            .orderBy(desc(textLeaderboards.pp))
            .limit(50);

          const totalPp = calculateTotalPP(topScores.map((s) => s.pp));
          await db
            .update(userStats)
            .set({ totalPp })
            .where(eq(userStats.userId, entry.player.id));
        }
      } catch (ppErr) {
        console.error("[race-manager] PP/text-leaderboard error:", ppErr);
      }
    }

    // 4. Load display data (usernames + elo + cosmetics for players not yet in eloAfterMap)
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

        // Load active cosmetics
        const cosmeticRows = await db
          .select({
            userId: userActiveCosmetics.userId,
            activeBadge: userActiveCosmetics.activeBadge,
            activeNameColor: userActiveCosmetics.activeNameColor,
            activeNameEffect: userActiveCosmetics.activeNameEffect,
          })
          .from(userActiveCosmetics)
          .where(inArray(userActiveCosmetics.userId, authPlayerIds));
        for (const row of cosmeticRows) {
          cosmeticsMap.set(row.userId, row);
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
          .select({ userId: userStats.userId, currentStreak: userStats.currentStreak, totalXp: userStats.totalXp })
          .from(userStats)
          .where(inArray(userStats.userId, authPlayerIds));
        for (const row of streakRows) {
          streakMap.set(row.userId, row.currentStreak);
          levelMap.set(row.userId, getXpLevel(row.totalXp ?? 0).level);
        }
      }
    } catch (streakErr) {
      console.error("[race-manager] streak data error:", streakErr);
    }

    // 6. Check achievements for authenticated players
    try {
      for (const entry of entries) {
        if (entry.isBot || entry.player.isGuest) continue;
        const pStats = playerStatsMap.get(entry.player.id);
        if (!pStats) continue;

        const finalStats = entry.progress.finalStats!;
        const newElo = eloAfterMap.get(entry.player.id) ?? entry.player.elo;
        const rankTier = getRankTier(newElo) as RankTier;

        const newAchievements = await checkAchievements(
          {
            userId: entry.player.id,
            raceWpm: finalStats.wpm,
            raceAccuracy: finalStats.accuracy,
            placement: entry.progress.placement!,
            racesPlayed: pStats.racesPlayed,
            racesWon: pStats.racesWon,
            currentStreak: pStats.currentStreak,
            maxStreak: pStats.maxStreak,
            rankTier,
          },
          db,
        );
        if (newAchievements.length > 0) {
          achievementMap.set(entry.player.id, newAchievements);
          if (this.notificationManager) {
            const profileUrl = `/profile/${usernameMap.get(entry.player.id) ?? entry.player.name}`;
            if (newAchievements.length === 1) {
              const achDef = ACHIEVEMENT_MAP.get(newAchievements[0]);
              this.notificationManager.notify(entry.player.id, {
                type: "achievement",
                title: achDef?.name ?? "Achievement Unlocked!",
                body: achDef?.description ?? newAchievements[0],
                actionUrl: profileUrl,
              });
            } else {
              this.notificationManager.notify(entry.player.id, {
                type: "achievement",
                title: `${newAchievements.length} Achievements Unlocked!`,
                body: newAchievements.map((id) => ACHIEVEMENT_MAP.get(id)?.name ?? id).join(", "),
                actionUrl: profileUrl,
              });
            }
          }
        }
      }
    } catch (achievementErr) {
      console.error("[race-manager] achievement check error:", achievementErr);
    }

    // 7. Check challenges for authenticated players (skip bots, guests, placement races)
    if (!this.placementRace) {
      try {
        for (const entry of entries) {
          if (entry.isBot || entry.player.isGuest) continue;
          const pStats = playerStatsMap.get(entry.player.id);
          if (!pStats) continue;

          const finalStats = entry.progress.finalStats!;
          const result = await checkChallenges(
            {
              userId: entry.player.id,
              raceWpm: finalStats.wpm,
              raceAccuracy: finalStats.accuracy,
              placement: entry.progress.placement!,
              playerCount: entries.length,
              currentStreak: pStats.currentStreak,
            },
            db,
          );
          if (result.results.length > 0) {
            challengeMap.set(entry.player.id, result);
            // Notify for completed challenges (batched)
            if (this.notificationManager) {
              const completed = result.results.filter((ch) => ch.justCompleted);
              if (completed.length === 1) {
                const ch = completed[0];
                this.notificationManager.notify(entry.player.id, {
                  type: "challenge_complete",
                  title: "Challenge Complete!",
                  body: `${CHALLENGE_MAP.get(ch.challengeId)?.name ?? ch.challengeId} — earned ${ch.xpAwarded} XP`,
                });
              } else if (completed.length > 1) {
                const totalXp = completed.reduce((sum, ch) => sum + ch.xpAwarded, 0);
                this.notificationManager.notify(entry.player.id, {
                  type: "challenge_complete",
                  title: `${completed.length} Challenges Complete!`,
                  body: `Earned ${totalXp} XP`,
                });
              }
            }
          }
        }
      } catch (challengeErr) {
        console.error("[race-manager] challenge check error:", challengeErr);
      }

      // 8. Check XP rewards for authenticated players
      try {
        for (const entry of entries) {
          if (entry.isBot || entry.player.isGuest) continue;
          const finalStats = entry.progress.finalStats!;
          const xpResult = await checkXpRewards(
            {
              userId: entry.player.id,
              raceWpm: finalStats.wpm,
              raceAccuracy: finalStats.accuracy,
              placement: entry.progress.placement!,
              playerCount: entries.length,
            },
            db,
          );
          xpProgressMap.set(entry.player.id, xpResult);
        }
      } catch (xpErr) {
        console.error("[race-manager] xp check error:", xpErr);
      }
    }

    // Build results array (always runs, even if DB failed)
    for (const entry of entries) {
      const stats = entry.progress.finalStats!;
      const streak = streakMap.get(entry.player.id);
      const challengeResult = challengeMap.get(entry.player.id);
      const cosmetics = cosmeticsMap.get(entry.player.id);
      results.push({
        playerId: entry.player.id,
        name: entry.player.name,
        username: usernameMap.get(entry.player.id),
        placement: entry.progress.placement!,
        wpm: stats.wpm,
        rawWpm: stats.rawWpm,
        accuracy: stats.accuracy,
        misstypedChars: entry.misstypedChars,
        eloChange: eloChanges.get(entry.player.id) ?? null,
        elo: eloAfterMap.get(entry.player.id) ?? entry.player.elo,
        streak: streak !== undefined ? streak : undefined,
        wpmHistory: !entry.isBot ? entry.wpmHistory : undefined,
        newAchievements: achievementMap.get(entry.player.id),
        challengeProgress: challengeResult?.results,
        xpEarned: challengeResult?.totalXpEarned,
        xpProgress: xpProgressMap.get(entry.player.id),
        activeBadge: cosmetics?.activeBadge ?? entry.player.activeBadge,
        activeNameColor: cosmetics?.activeNameColor ?? entry.player.activeNameColor,
        activeNameEffect: cosmetics?.activeNameEffect ?? entry.player.activeNameEffect,
        level: levelMap.get(entry.player.id),
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

  /** Cancel race without persisting anything (e.g. all players left during countdown) */
  private cancelRace() {
    if (this.status === "finished") return;
    this.status = "finished";
    this.cleanup();
  }

  private cleanup() {
    if (this.countdownTimer) clearInterval(this.countdownTimer);
    if (this.progressTimer) clearInterval(this.progressTimer);
    if (this.finishTimeoutTimer) clearTimeout(this.finishTimeoutTimer);
    if (this.disconnectGraceTimer) clearTimeout(this.disconnectGraceTimer);
    if (this.resultsCleanupTimer) { clearTimeout(this.resultsCleanupTimer); this.resultsCleanupTimer = null; }

    // Evict spectators from the room
    for (const socketId of this.spectatorInfo.keys()) {
      const sock = this.io.sockets.sockets.get(socketId);
      sock?.leave(this.raceId);
    }
    this.spectatorInfo.clear();

    const socketIds: string[] = [];
    for (const [key, entry] of this.players.entries()) {
      if (entry.socket) {
        entry.socket.leave(this.raceId);
        socketIds.push(key);
      }
    }
    this.owner.cleanupRace(this.raceId, socketIds);
  }

  handleEmote(socketId: string, emote: EmoteKey) {
    if (!EMOTE_KEYS.includes(emote)) return;
    const entry = this.players.get(socketId);
    if (!entry || (this.status !== "racing" && this.status !== "finished")) return;

    // Rate limit: 2s cooldown per player
    const now = Date.now();
    if (now - entry.lastEmoteAt < 2000) return;
    entry.lastEmoteAt = now;

    this.io.to(this.raceId).emit("raceEmote", {
      playerId: entry.player.id,
      playerName: entry.player.name,
      emote,
    });
  }

  handleEmoteByUserId(userId: string, emote: EmoteKey) {
    if (!EMOTE_KEYS.includes(emote)) return;
    if (this.status !== "racing" && this.status !== "finished") return;

    // Find entry by userId (survives socket reconnects)
    let entry: PlayerEntry | undefined;
    for (const e of this.players.values()) {
      if (e.player.id === userId) { entry = e; break; }
    }
    if (!entry) return;

    // Rate limit: 2s cooldown per player
    const now = Date.now();
    if (now - entry.lastEmoteAt < 2000) return;
    entry.lastEmoteAt = now;

    this.io.to(this.raceId).emit("raceEmote", {
      playerId: entry.player.id,
      playerName: entry.player.name,
      emote,
    });
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

  addSpectator(socket: TypedSocket, userId: string, name: string) {
    socket.join(this.raceId);
    this.spectatorInfo.set(socket.id, { userId, name });
    this.broadcastSpectatorUpdate();
  }

  removeSpectator(socket: TypedSocket) {
    socket.leave(this.raceId);
    this.spectatorInfo.delete(socket.id);
    this.broadcastSpectatorUpdate();
  }

  getSpectatorCount(): number {
    return this.spectatorInfo.size;
  }

  private broadcastSpectatorUpdate() {
    const spectators = [...this.spectatorInfo.values()];
    this.io.to(this.raceId).emit("spectatorUpdate", {
      raceId: this.raceId,
      count: spectators.length,
      spectators,
    });
  }

}
