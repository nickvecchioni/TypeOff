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
import { calculateRaceElo, getRankTier, generateWordsForMode, quotes, EMOTE_KEYS, scoreTextDifficulty, calculatePP, calculateTotalPP, CHALLENGE_MAP, ACHIEVEMENT_MAP, getXpLevel, PLACEMENT_RACES_REQUIRED } from "@typeoff/shared";
import type { RankTier, RaceMode, ModeCategory, ReplaySnapshot } from "@typeoff/shared";
import type { NotificationManager } from "./notification-manager.js";
import { races, raceParticipants, userStats, userModeStats, users, userActiveCosmetics, textLeaderboards } from "@typeoff/db";
import type { Database } from "@typeoff/db";
import { getDb } from "./db.js";
import { eq, inArray, and, sql, desc } from "drizzle-orm";
import { checkAchievements } from "./achievement-checker.js";
import { checkChallenges, type ChallengeCheckResult } from "./challenge-checker.js";
import { checkXpRewards, type XpContext, type XpProgress } from "./xp-checker.js";
export interface RaceOwner {
  cleanupRace(raceId: string, socketIds: string[]): void;
  clearUserRace(userId: string): void;
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

const COUNTDOWN_SECONDS = 3;
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
  private finishTimeoutEnd: number | null = null;
  private finishTimeoutTimer: ReturnType<typeof setTimeout> | null = null;
  private wordCount: number;
  private expectedWords: string[] = [];
  private playerFlags = new Map<string, string[]>();
  private mode: RaceMode;
  private modeCategory: ModeCategory;
  private disconnectGraceTimer: ReturnType<typeof setTimeout> | null = null;
  private playerGraceTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private resultsCleanupTimer: ReturnType<typeof setTimeout> | null = null;
  private spectatorInfo = new Map<string, { userId: string; name: string }>();
  private isPlacement = false;
  private placementNumber = 0; // 1-3

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
    private notificationManager?: NotificationManager,
    modeCategory?: ModeCategory,
  ) {
    this.raceId = crypto.randomUUID();
    this.modeCategory = modeCategory ?? "words";

    // Select race mode
    const pool = RaceManager.CATEGORY_MODES[this.modeCategory];
    this.mode = pool[Math.floor(Math.random() * pool.length)];

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

    // Add real players first — keyed by player.id for stable lookups across reconnects
    const now = Date.now();
    for (const entry of entries) {
      this.players.set(entry.player.id, {
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

    // Determine placement status from human players
    for (const entry of entries) {
      if (entry.player.isGuest) continue;
      const racesInMode = entry.player.modeRacesPlayed?.[this.modeCategory] ?? 0;
      if (racesInMode < PLACEMENT_RACES_REQUIRED) {
        this.isPlacement = true;
        this.placementNumber = racesInMode + 1; // 1-indexed
        break; // Use first human's placement status
      }
    }
  }

  start() {
    this.status = "countdown";
    let countdown = COUNTDOWN_SECONDS;

    // Log player map keys for diagnostics
    const playerKeys = [...this.players.entries()].map(([k, e]) => `${k}(${e.player.id},bot=${e.isBot})`);
    console.log(`[race-manager] start race=${this.raceId} players=[${playerKeys.join(", ")}]`);

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

    // Auto-disqualify after 3+ flags: force-finish with zeroed stats
    if (existing.length >= 3) {
      const entry = this.players.get(playerId);
      if (entry && !entry.progress.finished) {
        console.warn(`[race-manager] auto-disqualifying player ${playerId} (${existing.length} flags: ${existing.join("; ")})`);
        entry.progress.finished = true;
        entry.progress.placement = this.nextPlacement++;
        entry.progress.progress = 1;
        entry.progress.finalStats = { wpm: 0, rawWpm: 0, accuracy: 0 };
      }
    }
  }

  handleProgress(
    socketId: string,
    data: { wordIndex: number; charIndex: number; wpm: number; progress: number; finalStats?: { wpm: number; rawWpm: number; accuracy: number; misstypedChars?: number } }
  ) {
    // Look up by userId (stable key) via socket.data, with single-human fallback
    const sock = this.io.sockets.sockets.get(socketId);
    const userId = sock?.data?.userId as string | undefined;
    let entry = userId ? this.players.get(userId) : undefined;
    if (!entry) {
      // Fallback: if there's exactly one non-bot human player, it must be them
      const nonBotHumans = [...this.players.values()].filter((e) => !e.isBot);
      if (nonBotHumans.length === 1) {
        entry = nonBotHumans[0];
        entry.socket = sock ?? null;
        if (sock) sock.join(this.raceId);
        console.log(`[race-manager] handleProgress: single-human fallback for ${entry.player.id}`);
      }
    }
    if (!entry) {
      console.warn(
        `[race-manager] handleProgress: no player entry for socketId=${socketId} userId=${userId} race=${this.raceId} ` +
        `(players: ${[...this.players.keys()].join(", ")}, status=${this.status})`,
      );
      return;
    }
    // Update socket reference if it changed (reconnection)
    if (entry.socket?.id !== socketId && sock) {
      entry.socket = sock;
      sock.join(this.raceId);
    }
    if (this.status !== "racing" || entry.progress.finished) return;

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
    // event was never received (e.g. client-side finish detection failed, socket
    // reconnected with new id dropping the event, etc.)
    // Also trust the client's progress=1 when finalStats are piggybacked, even if
    // the server's validated progress is < 1 (can happen when a micro-disconnect
    // caused earlier progress events to be dropped, making the server's word-index
    // lag behind the client's actual position).
    const clientReportsFinished = data.progress >= 1 && data.finalStats && data.finalStats.wpm > 0;
    if ((validated.progress >= 1 || clientReportsFinished) && !entry.progress.finished && (validated.wpm > 0 || clientReportsFinished)) {
      // Use piggybacked finalStats if available (more accurate than progress-event WPM)
      const finishData = data.finalStats && data.finalStats.wpm > 0
        ? { wpm: data.finalStats.wpm, rawWpm: data.finalStats.rawWpm, accuracy: data.finalStats.accuracy, misstypedChars: data.finalStats.misstypedChars }
        : { wpm: validated.wpm, rawWpm: validated.wpm, accuracy: entry.progress.finalStats?.accuracy ?? 95 };
      console.log(
        `[race-manager] Auto-finishing player ${entry.player.id} via progress safety net ` +
        `(serverProgress=${validated.progress}, clientProgress=${data.progress}, wpm=${finishData.wpm}, ` +
        `hadFinalStats=${!!data.finalStats}, clientReportsFinished=${!!clientReportsFinished})`,
      );
      this.handleFinish(socketId, finishData);
    }
  }

  handleFinish(
    socketId: string,
    data: { wpm: number; rawWpm: number; accuracy: number; misstypedChars?: number; wpmHistory?: WpmSample[]; keystrokeTimings?: number[] }
  ) {
    // Look up by userId (stable key) via socket.data, with single-human fallback
    const finishSock = this.io.sockets.sockets.get(socketId);
    const finishUserId = finishSock?.data?.userId as string | undefined;
    let entry = finishUserId ? this.players.get(finishUserId) : undefined;
    if (!entry) {
      // Fallback: single non-bot human
      const nonBotHumans = [...this.players.values()].filter((e) => !e.isBot);
      if (nonBotHumans.length === 1) {
        entry = nonBotHumans[0];
        entry.socket = finishSock ?? null;
        if (finishSock) finishSock.join(this.raceId);
        console.log(`[race-manager] handleFinish: single-human fallback for ${entry.player.id}`);
      }
    }
    if (!entry) {
      console.warn(`[race-manager] handleFinish: no player entry for socketId=${socketId} userId=${finishUserId} race=${this.raceId}`);
      return;
    }
    if (this.status !== "racing") {
      console.warn(`[race-manager] handleFinish: race status is ${this.status}, not racing. player=${entry.player.id} race=${this.raceId}`);
      return;
    }
    if (entry.progress.finished) {
      // Already finished (likely via the progress safety net which uses
      // approximate integer WPM). If this is the real raceFinish event with
      // more accurate stats, update finalStats so results show precise WPM.
      if (entry.progress.finalStats && data.wpmHistory) {
        entry.progress.finalStats = data;
        entry.progress.wpm = data.wpm;
        if (data.misstypedChars != null) entry.misstypedChars = data.misstypedChars;
        if (data.wpmHistory) entry.wpmHistory = data.wpmHistory;
      }
      // Still check allFinished — the safety net that auto-finished this player
      // may not have triggered endRace if other players finished between checks.
      const allFinished = [...this.players.values()].every((p) => p.progress.finished);
      if (allFinished && this.status === "racing") {
        console.log(`[race-manager] handleFinish: all players finished (already-finished path), ending race ${this.raceId}`);
        if (this.finishTimeoutTimer) clearTimeout(this.finishTimeoutTimer);
        this.endRace();
      }
      return;
    }

    const rejection = this.validateFinish(data, entry);
    if (rejection) {
      console.warn(`[race-manager] raceFinish REJECTED for ${entry.player.id}: ${rejection}`, {
        wpm: data.wpm, rawWpm: data.rawWpm, accuracy: data.accuracy,
      });
      return;
    }

    entry.progress.finished = true;
    entry.progress.placement = this.nextPlacement++;
    entry.progress.progress = 1;
    entry.progress.finalStats = data;
    if (data.misstypedChars != null) entry.misstypedChars = data.misstypedChars;
    if (data.wpmHistory) entry.wpmHistory = data.wpmHistory;

    // Check if all players finished
    const allFinished = [...this.players.values()].every((p) => p.progress.finished);
    if (allFinished) {
      if (this.finishTimeoutTimer) clearTimeout(this.finishTimeoutTimer);
      this.endRace();
    } else {
      // Diagnostic: log which players are still unfinished
      const unfinished = [...this.players.values()]
        .filter((p) => !p.progress.finished)
        .map((p) => `${p.player.name}(${p.player.id.slice(0, 8)}, bot=${p.isBot}, progress=${p.progress.progress.toFixed(3)}, wpm=${p.progress.wpm})`);
      console.log(
        `[race-manager] handleFinish: player ${entry.player.id} finished but race continues. ` +
        `Unfinished: [${unfinished.join(", ")}] race=${this.raceId}`,
      );
      if (this.finishTimeoutEnd === null) {
        // First finish — start the finish timeout
        this.finishTimeoutEnd = Date.now() + FINISH_TIMEOUT_SECONDS * 1000;
        this.finishTimeoutTimer = setTimeout(() => this.endRace(), FINISH_TIMEOUT_SECONDS * 1000);
      }
    }
  }

  /** Remove a player during countdown — no penalty, no stats */
  handleLeaveCountdown(socketId: string): boolean {
    if (this.status !== "countdown") return false;
    // Find entry by socket id (key is now userId)
    let entry: PlayerEntry | undefined;
    let entryKey: string | undefined;
    for (const [key, e] of this.players.entries()) {
      if (e.socket?.id === socketId) { entry = e; entryKey = key; break; }
    }
    if (!entry || !entryKey) return false;

    entry.socket?.leave(this.raceId);
    this.players.delete(entryKey);

    // Cancel race entirely if no real players remain (don't persist anything)
    const hasRealPlayers = [...this.players.values()].some((p) => !p.isBot);
    if (!hasRealPlayers) {
      this.cancelRace();
    }
    return true;
  }

  handleDisconnect(socketId: string) {
    // Find entry by socket id (key is now userId)
    let entry: PlayerEntry | undefined;
    for (const e of this.players.values()) {
      if (e.socket?.id === socketId) { entry = e; break; }
    }
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
      // Multi-human race: give a grace period for reconnection before forfeiting.
      // Brief disconnects (network blip, stale detection) should not cause permanent
      // forfeiture — only sustained disconnects should.
      if (!entry.progress.finished && this.status === "racing") {
        const PLAYER_GRACE_MS = 5_000;
        const playerId = entry.player.id;
        // Clear any existing grace timer for this player (idempotent)
        const existing = this.playerGraceTimers.get(playerId);
        if (existing) clearTimeout(existing);
        this.playerGraceTimers.set(playerId, setTimeout(() => {
          this.playerGraceTimers.delete(playerId);
          // Only forfeit if still disconnected and race still running
          if (entry.socket == null && !entry.progress.finished && this.status === "racing") {
            console.log(`[race-manager] grace expired for ${playerId}, forfeiting`);
            entry.progress.finished = true;
            entry.progress.placement = this.nextPlacement++;
            entry.progress.finalStats = { wpm: 0, rawWpm: 0, accuracy: 0 };
            // Check if all players are now finished
            const allFinished = [...this.players.values()].every((p) => p.progress.finished);
            if (allFinished) {
              if (this.finishTimeoutTimer) clearTimeout(this.finishTimeoutTimer);
              this.endRace();
            }
          }
        }, PLAYER_GRACE_MS));
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

  /** Reconnect a player who briefly disconnected. Returns true on success.
   *  Idempotent — safe to call multiple times with the same socket. */
  reconnectPlayer(userId: string, newSocket: TypedSocket): boolean {
    if (this.status === "finished") return false;

    const entry = this.players.get(userId);
    if (!entry || entry.isBot) return false;

    // Already connected with this socket — nothing to do
    if (entry.socket === newSocket) return true;

    entry.socket = newSocket;

    // Join the new socket to the race room
    newSocket.join(this.raceId);

    // Cancel grace timers if running
    if (this.disconnectGraceTimer) {
      clearTimeout(this.disconnectGraceTimer);
      this.disconnectGraceTimer = null;
    }
    const playerGrace = this.playerGraceTimers.get(userId);
    if (playerGrace) {
      clearTimeout(playerGrace);
      this.playerGraceTimers.delete(userId);
    }

    console.log(`[race-manager] reconnectPlayer: ${userId} reconnected with socket ${newSocket.id} in race ${this.raceId}`);
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
      finishTimeoutEnd: this.finishTimeoutEnd != null ? Math.max(0, this.finishTimeoutEnd - Date.now()) : null,
      mode: this.mode,
      isPlacement: this.isPlacement || undefined,
      placementNumber: this.isPlacement ? this.placementNumber : undefined,
    };
  }

  private validateProgress(
    data: { wordIndex: number; charIndex: number; wpm: number; progress: number },
    entry: PlayerEntry,
  ) {
    const now = Date.now();
    let { wordIndex, charIndex, wpm } = data;

    // Clamp basic values
    wpm = Math.min(wpm, 350);

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

    // Clamp charIndex to the current word's length
    if (wordIndex < this.expectedWords.length) {
      charIndex = Math.min(charIndex, this.expectedWords[wordIndex].length);
    }

    // Compute progress server-side from wordIndex + charIndex — authoritative,
    // immune to client calculation mismatches, reconnection edge cases, or stale closures.
    // cumulativeWordChars[i] = total word-chars before word i (no spaces)
    const wordCharsTyped = wordIndex < this.cumulativeWordChars.length
      ? this.cumulativeWordChars[wordIndex]
      : this.wordCharsTotal;
    const spacesTyped = wordIndex; // one space after each completed word
    const totalTyped = wordCharsTyped + spacesTyped + charIndex;
    let progress = this.totalChars > 0 ? totalTyped / this.totalChars : 0;
    progress = Math.max(0, Math.min(1, progress));

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

    if (data.wpm > 350) {
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
      // Auto-correct: can happen due to React batching causing counter drift in the client
      this.addFlag(entry.player.id, `rawWpm (${data.rawWpm}) < wpm (${data.wpm}), auto-corrected`);
      data.rawWpm = data.wpm;
    }
    // Check elapsed time vs theoretical minimum (350 WPM)
    if (this.startedAt) {
      const elapsedSec = (Date.now() - this.startedAt.getTime()) / 1000;
      const minTimeSec = (this.totalChars / 5) / (350 / 60); // time at 350 WPM
      if (elapsedSec < minTimeSec * 0.8) {
        socket?.emit("error", { message: "Invalid finish: completed too quickly" });
        return "too fast";
      }

      // Cross-validate claimed WPM against server-measured elapsed time
      const expectedWpm = (this.totalChars / 5) / (elapsedSec / 60);
      if (data.wpm > expectedWpm * 1.15) {
        socket?.emit("error", { message: "Invalid finish: WPM exceeds server-measured rate" });
        return "wpm exceeds server-measured rate";
      }
    }

    // Cross-validate wpmHistory if provided
    if (data.wpmHistory && data.wpmHistory.length > 1) {
      // Reject if elapsed is not monotonic (clear data fabrication)
      for (let i = 1; i < data.wpmHistory.length; i++) {
        if (data.wpmHistory[i].elapsed < data.wpmHistory[i - 1].elapsed) {
          socket?.emit("error", { message: "Invalid finish: wpmHistory not monotonic" });
          return "wpmHistory elapsed not monotonic";
        }
      }
      // Check no wpm > 350
      if (data.wpmHistory.some((s) => s.wpm > 350)) {
        this.addFlag(entry.player.id, "wpmHistory wpm exceeds 350");
      }
      // Reject if final sample's elapsed diverges > 50% from actual race duration
      if (this.startedAt) {
        const actualDuration = (Date.now() - this.startedAt.getTime()) / 1000;
        const lastSample = data.wpmHistory[data.wpmHistory.length - 1];
        if (Math.abs(lastSample.elapsed - actualDuration) > actualDuration * 0.5) {
          socket?.emit("error", { message: "Invalid finish: wpmHistory duration mismatch" });
          return "wpmHistory duration mismatch";
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

      entry.botRawProgress += progressPerTick;
      entry.progress.progress = Math.min(1, entry.botRawProgress);

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
      const runningWpm = elapsedMinutes > 0 ? Math.round((wordsTyped / elapsedMinutes) * 100) / 100 : 0;
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
    // Send remaining ms instead of absolute timestamp to avoid clock skew between
    // server and client causing the timer to display wrong values.
    const remainingMs = this.finishTimeoutEnd != null ? Math.max(0, this.finishTimeoutEnd - Date.now()) : null;
    const payload = {
      progress,
      ...(remainingMs != null ? { finishTimeoutEnd: remainingMs } : {}),
    };
    this.io.to(this.raceId).emit("raceProgress", payload);
    // Also emit directly to each connected socket — ensures delivery even if
    // the socket is no longer in the room (e.g. after a reconnect race condition).
    for (const entry of this.players.values()) {
      if (entry.socket?.connected && !entry.isBot) {
        entry.socket.emit("raceProgress", payload);
      }
    }

    // Safety net 1: auto-finish players whose progress is high but whose
    // raceFinish event was never received (transient network blip, socket
    // micro-disconnect dropping events). Uses a lower threshold when the
    // finish timeout is active (at least one player already finished) since
    // the race is clearly ending and we want to avoid the full 15s wait.
    if (this.status === "racing") {
      const now = Date.now();
      const finishTimeoutActive = this.finishTimeoutEnd !== null;
      const stallThreshold = finishTimeoutActive ? 0.75 : 0.9;
      const stallTimeMs = 4000;

      for (const entry of this.players.values()) {
        if (
          !entry.progress.finished &&
          !entry.isBot &&
          entry.progress.progress >= stallThreshold &&
          entry.progress.wpm > 0 &&
          now - entry.lastProgressTime > stallTimeMs
        ) {
          console.log(
            `[race-manager] broadcastProgress stall safety net: auto-finishing player ${entry.player.id} ` +
            `(progress=${entry.progress.progress.toFixed(3)}, wpm=${entry.progress.wpm}, ` +
            `stalled ${((now - entry.lastProgressTime) / 1000).toFixed(1)}s, ` +
            `threshold=${stallThreshold}, finishTimeoutActive=${finishTimeoutActive}) race=${this.raceId}`,
          );
          entry.progress.finished = true;
          entry.progress.placement = this.nextPlacement++;
          entry.progress.progress = 1;
          entry.progress.finalStats = {
            wpm: entry.progress.wpm,
            rawWpm: entry.progress.wpm,
            accuracy: entry.progress.finalStats?.accuracy ?? 95,
          };
        }
      }

      // Safety net 2: finish-timeout watchdog — when the finish timeout has been
      // running for >= 5s, aggressively auto-finish any stalled unfinished players
      // (no progress updates for > 2s). Catches the case where progress events are
      // silently dropped at the matchmaker routing level.
      if (finishTimeoutActive && this.finishTimeoutEnd! - now <= (FINISH_TIMEOUT_SECONDS - 5) * 1000) {
        for (const entry of this.players.values()) {
          if (
            !entry.progress.finished &&
            !entry.isBot &&
            now - entry.lastProgressTime > 2000
          ) {
            console.log(
              `[race-manager] finish-timeout watchdog: force-finishing player ${entry.player.id} ` +
              `(progress=${entry.progress.progress.toFixed(3)}, wpm=${entry.progress.wpm}, ` +
              `stalled ${((now - entry.lastProgressTime) / 1000).toFixed(1)}s, ` +
              `timeout remaining ${((this.finishTimeoutEnd! - now) / 1000).toFixed(1)}s) race=${this.raceId}`,
            );
            entry.progress.finished = true;
            entry.progress.placement = this.nextPlacement++;
            entry.progress.progress = 1;
            entry.progress.finalStats = {
              wpm: entry.progress.wpm,
              rawWpm: entry.progress.wpm,
              accuracy: entry.progress.finalStats?.accuracy ?? 95,
            };
          }
        }
      }

      // Safety net 3: catch "all finished" state that was missed by handleFinish/tickBots
      const allFinished = [...this.players.values()].every((p) => p.progress.finished);
      if (allFinished) {
        console.log(`[race-manager] broadcastProgress safety net: all players finished, ending race ${this.raceId}`);
        if (this.finishTimeoutTimer) clearTimeout(this.finishTimeoutTimer);
        this.endRace();
      }
    }
  }

  get isFinished() { return this.status === "finished"; }

  /** Returns the userId of a disconnected (or unmapped) non-bot human player,
   *  but ONLY if there's exactly one such player. Used as a last-resort routing
   *  fallback when auth failed on reconnect and socket.data.userId is not set. */
  getDisconnectedHumanUserId(): string | null {
    const candidates: string[] = [];
    for (const entry of this.players.values()) {
      if (entry.isBot || entry.progress.finished) continue;
      // Consider "disconnected" if socket is null OR not connected
      if (!entry.socket || !entry.socket.connected) {
        candidates.push(entry.player.id);
      }
    }
    return candidates.length === 1 ? candidates[0] : null;
  }

  private async endRace() {
    if (this.status === "finished") return;
    this.status = "finished";

    if (this.progressTimer) clearInterval(this.progressTimer);

    // Clear LIVE status immediately so friends no longer see a stale "LIVE" badge.
    for (const entry of this.players.values()) {
      if (!entry.isBot) {
        this.owner.clearUserRace(entry.player.id);
      }
    }

    // Mark unfinished players as finished with their current stats.
    // Players with high progress (>= 0.9) almost certainly completed typing but
    // their raceFinish event was lost (socket reconnect, network blip, etc.) —
    // treat them as legitimately finished with progress = 1.
    for (const entry of this.players.values()) {
      if (!entry.progress.finished) {
        if (entry.progress.progress >= 0.9 && entry.progress.wpm > 0) {
          console.log(
            `[race-manager] endRace: auto-finishing high-progress player ${entry.player.id} (progress=${entry.progress.progress}, wpm=${entry.progress.wpm})`,
          );
          entry.progress.progress = 1;
        }
        entry.progress.finished = true;
        entry.progress.finalStats = {
          wpm: entry.progress.wpm,
          rawWpm: entry.progress.wpm,
          accuracy: entry.progress.finalStats?.accuracy ?? 95,
        };
      }
    }

    // Re-assign placements by WPM (highest first), accuracy as tiebreaker.
    // Sort purely by WPM — progress-based sorting is unreliable when
    // finish events are lost due to socket issues.
    const sorted = [...this.players.values()].sort((a, b) => {
      const aWpm = a.progress.finalStats?.wpm ?? 0;
      const bWpm = b.progress.finalStats?.wpm ?? 0;
      if (bWpm !== aWpm) return bWpm - aWpm;
      const aAcc = a.progress.finalStats?.accuracy ?? 0;
      const bAcc = b.progress.finalStats?.accuracy ?? 0;
      return bAcc - aAcc;
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
    };

    // Send results to clients IMMEDIATELY — don't wait for DB.
    // Emit both to the room AND directly to each player's socket.
    // Direct emission ensures delivery even if the socket left the room
    // during a brief disconnect/reconnect cycle.
    this.io.to(this.raceId).emit("raceFinished", immediatePayload);
    for (const entry of this.players.values()) {
      if (entry.socket?.connected) {
        entry.socket.emit("raceFinished", immediatePayload);
      }
    }

    // Re-send immediate results a few times in case the first emission was dropped
    // by a transient network blip. The client's handler merges idempotently.
    let rebroadcastCount = 0;
    const rebroadcastTimer = setInterval(() => {
      rebroadcastCount++;
      this.io.to(this.raceId).emit("raceFinished", immediatePayload);
      // Also emit directly to connected sockets
      for (const entry of this.players.values()) {
        if (entry.socket?.connected) {
          entry.socket.emit("raceFinished", immediatePayload);
        }
      }
      if (rebroadcastCount >= 3) clearInterval(rebroadcastTimer);
    }, 500);

    // Persist to DB in the background, then send enriched results (ELO, achievements, etc.)
    this.persistResults()
      .then((enrichedResults) => {
        clearInterval(rebroadcastTimer); // enriched results supersede immediate rebroadcasts
        const enrichedPayload = {
          results: enrichedResults,
        };
        // Send enriched results so clients can update with ELO changes, achievements, etc.
        this.io.to(this.raceId).emit("raceFinished", enrichedPayload);
        // Also emit directly to each socket for reliability
        for (const entry of this.players.values()) {
          if (entry.socket?.connected) {
            entry.socket.emit("raceFinished", enrichedPayload);
          }
        }
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
      isPro?: boolean;
      activeBadge?: string | null;
      activeNameColor?: string | null;
      activeNameEffect?: string | null;
      level?: number;
      previousBestWpm?: number;
      previousTextBestWpm?: number;
      placementRaceNumber?: number;
      placementComplete?: boolean;
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
    const previousBestWpmMap = new Map<string, number>();
    const previousTextBestWpmMap = new Map<string, number>();

    const db = getDb();

    // Steps 1-3: race insert, participants, stats, ELO (wrapped in transaction)
    try {
      await db.transaction(async (tx) => {
      // 1. Insert race record
      await tx.insert(races).values({
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
        await tx.insert(raceParticipants).values({
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

        // Update user stats for authenticated, non-flagged players
        const playerFlags = this.playerFlags.get(entry.player.id);
        if (!entry.player.isGuest && !(playerFlags && playerFlags.length > 0)) {
          const existing = await tx
            .select()
            .from(userStats)
            .where(eq(userStats.userId, entry.player.id));

          const todayUTC = new Date().toISOString().slice(0, 10);

          if (existing.length === 0) {
            const newStreak = placement === 1 ? 1 : 0;
            const newWon = placement === 1 ? 1 : 0;
            streakMap.set(entry.player.id, newStreak);
            playerStatsMap.set(entry.player.id, { racesPlayed: 1, racesWon: newWon, currentStreak: newStreak, maxStreak: newStreak });
            previousBestWpmMap.set(entry.player.id, 0);
            await tx.insert(userStats).values({
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
            previousBestWpmMap.set(entry.player.id, s.maxWpm);
            const newPlayed = s.racesPlayed + 1;
            const newWon = s.racesWon + (placement === 1 ? 1 : 0);
            const newStreak = placement === 1 ? s.currentStreak + 1 : 0;
            const newMaxStreak = Math.max(s.maxStreak, newStreak);
            streakMap.set(entry.player.id, newStreak);
            playerStatsMap.set(entry.player.id, { racesPlayed: newPlayed, racesWon: newWon, currentStreak: newStreak, maxStreak: newMaxStreak });

            const wonThisRace = placement === 1 ? 1 : 0;
            const yd = new Date();
            yd.setUTCDate(yd.getUTCDate() - 1);
            const yesterdayUTC = yd.toISOString().slice(0, 10);

            await tx
              .update(userStats)
              .set({
                racesPlayed: sql`${userStats.racesPlayed} + 1`,
                racesWon: sql`${userStats.racesWon} + ${wonThisRace}`,
                avgWpm: sql`(${userStats.avgWpm} * ${userStats.racesPlayed} + ${stats.wpm}) / (${userStats.racesPlayed} + 1)`,
                maxWpm: sql`GREATEST(${userStats.maxWpm}, ${stats.wpm})`,
                avgAccuracy: sql`(${userStats.avgAccuracy} * ${userStats.racesPlayed} + ${stats.accuracy}) / (${userStats.racesPlayed} + 1)`,
                currentStreak: sql`CASE WHEN ${wonThisRace} = 1 THEN ${userStats.currentStreak} + 1 ELSE 0 END`,
                maxStreak: sql`CASE WHEN ${wonThisRace} = 1 THEN GREATEST(${userStats.maxStreak}, ${userStats.currentStreak} + 1) ELSE ${userStats.maxStreak} END`,
                lastRankedDate: todayUTC,
                rankedDayStreak: sql`CASE
                  WHEN ${userStats.lastRankedDate} = ${todayUTC} THEN ${userStats.rankedDayStreak}
                  WHEN ${userStats.lastRankedDate} = ${yesterdayUTC} THEN ${userStats.rankedDayStreak} + 1
                  ELSE 1
                END`,
                maxRankedDayStreak: sql`GREATEST(${userStats.maxRankedDayStreak}, CASE
                  WHEN ${userStats.lastRankedDate} = ${todayUTC} THEN ${userStats.rankedDayStreak}
                  WHEN ${userStats.lastRankedDate} = ${yesterdayUTC} THEN ${userStats.rankedDayStreak} + 1
                  ELSE 1
                END)`,
                updatedAt: new Date(),
              })
              .where(eq(userStats.userId, entry.player.id));
          }

          // Upsert per-mode stats
          const modeWon = placement === 1 ? 1 : 0;
          await tx
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

        }
      }

      // 3. Calculate per-mode ELO (exclude flagged players)
      const authPlayers = entries.filter((e) => !e.player.isGuest && !e.isBot && !((this.playerFlags.get(e.player.id)?.length ?? 0) > 0));
      const botEntries = entries.filter((e) => e.isBot);

      if (authPlayers.length >= 1) {
        const playerIds = authPlayers.map((e) => e.player.id);

        // Read per-mode ELO + stats from userModeStats
        const modeStatsRows = await tx
          .select()
          .from(userModeStats)
          .where(
            and(
              inArray(userModeStats.userId, playerIds),
              eq(userModeStats.modeCategory, this.modeCategory),
            )
          );
        const modeEloMap = new Map(modeStatsRows.map((r) => [r.userId, r]));
        const modeStatsMap = modeEloMap;

        // Include bots as virtual opponents for ELO calculation
        const eloInput = [
          ...authPlayers.map((e) => ({
            id: e.player.id,
            elo: modeEloMap.get(e.player.id)?.eloRating ?? 1000,
            placement: e.progress.placement!,
            gamesPlayed: modeStatsMap.get(e.player.id)?.racesPlayed ?? 0,
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

        // Apply ELO changes to per-mode stats
        for (const [userId, change] of changes) {
          if (botEntries.some((b) => b.player.id === userId)) continue;
          eloChanges.set(userId, change);

          const [updated] = await tx
            .update(userModeStats)
            .set({
              eloRating: sql`GREATEST(0, ${userModeStats.eloRating} + ${change})`,
              rankTier: sql`CASE
                WHEN GREATEST(0, ${userModeStats.eloRating} + ${change}) >= 2500 THEN 'grandmaster'
                WHEN GREATEST(0, ${userModeStats.eloRating} + ${change}) >= 2200 THEN 'master'
                WHEN GREATEST(0, ${userModeStats.eloRating} + ${change}) >= 1900 THEN 'diamond'
                WHEN GREATEST(0, ${userModeStats.eloRating} + ${change}) >= 1600 THEN 'platinum'
                WHEN GREATEST(0, ${userModeStats.eloRating} + ${change}) >= 1300 THEN 'gold'
                WHEN GREATEST(0, ${userModeStats.eloRating} + ${change}) >= 1000 THEN 'silver'
                ELSE 'bronze'
              END`,
              peakEloRating: sql`GREATEST(${userModeStats.peakEloRating}, GREATEST(0, ${userModeStats.eloRating} + ${change}))`,
              peakRankTier: sql`CASE
                WHEN GREATEST(${userModeStats.peakEloRating}, GREATEST(0, ${userModeStats.eloRating} + ${change})) >= 2500 THEN 'grandmaster'
                WHEN GREATEST(${userModeStats.peakEloRating}, GREATEST(0, ${userModeStats.eloRating} + ${change})) >= 2200 THEN 'master'
                WHEN GREATEST(${userModeStats.peakEloRating}, GREATEST(0, ${userModeStats.eloRating} + ${change})) >= 1900 THEN 'diamond'
                WHEN GREATEST(${userModeStats.peakEloRating}, GREATEST(0, ${userModeStats.eloRating} + ${change})) >= 1600 THEN 'platinum'
                WHEN GREATEST(${userModeStats.peakEloRating}, GREATEST(0, ${userModeStats.eloRating} + ${change})) >= 1300 THEN 'gold'
                WHEN GREATEST(${userModeStats.peakEloRating}, GREATEST(0, ${userModeStats.eloRating} + ${change})) >= 1000 THEN 'silver'
                ELSE 'bronze'
              END`,
            })
            .where(
              and(
                eq(userModeStats.userId, userId),
                eq(userModeStats.modeCategory, this.modeCategory),
              )
            )
            .returning({ eloRating: userModeStats.eloRating });

          const newElo = updated?.eloRating ?? 1000;
          eloAfterMap.set(userId, newElo);

          // Sync users.eloRating to best ELO across all modes
          await tx
            .update(users)
            .set({
              eloRating: sql`(SELECT COALESCE(MAX(elo_rating), 1000) FROM user_mode_stats WHERE user_id = ${userId})`,
              rankTier: sql`CASE
                WHEN (SELECT COALESCE(MAX(elo_rating), 1000) FROM user_mode_stats WHERE user_id = ${userId}) >= 2500 THEN 'grandmaster'
                WHEN (SELECT COALESCE(MAX(elo_rating), 1000) FROM user_mode_stats WHERE user_id = ${userId}) >= 2200 THEN 'master'
                WHEN (SELECT COALESCE(MAX(elo_rating), 1000) FROM user_mode_stats WHERE user_id = ${userId}) >= 1900 THEN 'diamond'
                WHEN (SELECT COALESCE(MAX(elo_rating), 1000) FROM user_mode_stats WHERE user_id = ${userId}) >= 1600 THEN 'platinum'
                WHEN (SELECT COALESCE(MAX(elo_rating), 1000) FROM user_mode_stats WHERE user_id = ${userId}) >= 1300 THEN 'gold'
                WHEN (SELECT COALESCE(MAX(elo_rating), 1000) FROM user_mode_stats WHERE user_id = ${userId}) >= 1000 THEN 'silver'
                ELSE 'bronze'
              END`,
              peakEloRating: sql`GREATEST(${users.peakEloRating}, (SELECT COALESCE(MAX(elo_rating), 1000) FROM user_mode_stats WHERE user_id = ${userId}))`,
              peakRankTier: sql`CASE
                WHEN GREATEST(${users.peakEloRating}, (SELECT COALESCE(MAX(elo_rating), 1000) FROM user_mode_stats WHERE user_id = ${userId})) >= 2500 THEN 'grandmaster'
                WHEN GREATEST(${users.peakEloRating}, (SELECT COALESCE(MAX(elo_rating), 1000) FROM user_mode_stats WHERE user_id = ${userId})) >= 2200 THEN 'master'
                WHEN GREATEST(${users.peakEloRating}, (SELECT COALESCE(MAX(elo_rating), 1000) FROM user_mode_stats WHERE user_id = ${userId})) >= 1900 THEN 'diamond'
                WHEN GREATEST(${users.peakEloRating}, (SELECT COALESCE(MAX(elo_rating), 1000) FROM user_mode_stats WHERE user_id = ${userId})) >= 1600 THEN 'platinum'
                WHEN GREATEST(${users.peakEloRating}, (SELECT COALESCE(MAX(elo_rating), 1000) FROM user_mode_stats WHERE user_id = ${userId})) >= 1300 THEN 'gold'
                WHEN GREATEST(${users.peakEloRating}, (SELECT COALESCE(MAX(elo_rating), 1000) FROM user_mode_stats WHERE user_id = ${userId})) >= 1000 THEN 'silver'
                ELSE 'bronze'
              END`,
            })
            .where(eq(users.id, userId));
        }

        // Notify rank changes (based on per-mode ELO)
        if (this.notificationManager) {
          for (const entry of authPlayers) {
            const modeElo = modeEloMap.get(entry.player.id);
            const oldElo = modeElo?.eloRating ?? 1000;
            const newElo = eloAfterMap.get(entry.player.id) ?? oldElo;
            const oldTier = getRankTier(oldElo);
            const newTier = getRankTier(newElo);
            if (oldTier !== newTier) {
              const direction = newElo > oldElo ? "up" : "down";
              const modeName = this.modeCategory.charAt(0).toUpperCase() + this.modeCategory.slice(1);
              this.notificationManager.notify(entry.player.id, {
                type: direction === "up" ? "rank_up" : "rank_down",
                title: direction === "up" ? "Rank Up!" : "Rank Down",
                body: `${modeName}: ${direction === "up" ? "promoted" : "demoted"} to ${newTier.charAt(0).toUpperCase() + newTier.slice(1)}`,
                actionUrl: `/profile/${usernameMap.get(entry.player.id) ?? entry.player.name}`,
              });
            }
          }
        }

        // Update participant records with elo data
        for (const entry of authPlayers) {
          const change = eloChanges.get(entry.player.id) ?? 0;
          const newElo = eloAfterMap.get(entry.player.id) ?? entry.player.elo;
          const eloBefore = newElo - change; // derive pre-race ELO from the atomic result
          await tx
            .update(raceParticipants)
            .set({ eloBefore, eloAfter: newElo })
            .where(
              and(
                eq(raceParticipants.raceId, this.raceId),
                eq(raceParticipants.userId, entry.player.id),
              )
            );
        }
      }
      }); // end transaction
    } catch (err) {
      console.error("[race-manager] DB error (persist):", err);
    }

    // 3b. PP calculation + text leaderboard upsert
    {
      try {
        const difficulty = scoreTextDifficulty(this.expectedWords);
        const textHash = `${this.seed}:${this.mode}`;

        // Read existing per-text bests before upserting (for per-text PB detection)
        const authPlayerIds = entries
          .filter((e) => !e.isBot && !e.player.isGuest)
          .map((e) => e.player.id);
        if (authPlayerIds.length > 0) {
          const existingTextBests = await db
            .select({ userId: textLeaderboards.userId, bestWpm: textLeaderboards.bestWpm })
            .from(textLeaderboards)
            .where(
              and(
                eq(textLeaderboards.textHash, textHash),
                inArray(textLeaderboards.userId, authPlayerIds),
              )
            );
          for (const row of existingTextBests) {
            previousTextBestWpmMap.set(row.userId, row.bestWpm);
          }
        }

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
        // Use best (display) ELO across all modes for rank achievements
        const [displayRow] = await db
          .select({ eloRating: users.eloRating })
          .from(users)
          .where(eq(users.id, entry.player.id))
          .limit(1);
        const bestElo = displayRow?.eloRating ?? (eloAfterMap.get(entry.player.id) ?? entry.player.elo);
        const rankTier = getRankTier(bestElo) as RankTier;

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

    // 7. Check challenges for authenticated players (skip bots, guests)
    {
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
                  body: `${CHALLENGE_MAP.get(ch.challengeId)?.name ?? ch.challengeId}: earned ${ch.xpAwarded} XP`,
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
        isPro: entry.player.isPro ?? false,
        activeBadge: cosmetics?.activeBadge ?? entry.player.activeBadge,
        activeNameColor: cosmetics?.activeNameColor ?? entry.player.activeNameColor,
        activeNameEffect: cosmetics?.activeNameEffect ?? entry.player.activeNameEffect,
        level: levelMap.get(entry.player.id),
        previousBestWpm: previousBestWpmMap.get(entry.player.id),
        previousTextBestWpm: previousTextBestWpmMap.get(entry.player.id),
        placementRaceNumber: this.isPlacement && !entry.isBot && !entry.player.isGuest ? this.placementNumber : undefined,
        placementComplete: this.isPlacement && !entry.isBot && !entry.player.isGuest && this.placementNumber >= PLACEMENT_RACES_REQUIRED ? true : undefined,
      });
    }

    return results.sort((a, b) => a.placement - b.placement);
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
    for (const timer of this.playerGraceTimers.values()) clearTimeout(timer);
    this.playerGraceTimers.clear();
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
    // Find entry by socket id (key is now userId)
    let entry: PlayerEntry | undefined;
    for (const e of this.players.values()) {
      if (e.socket?.id === socketId) { entry = e; break; }
    }
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
