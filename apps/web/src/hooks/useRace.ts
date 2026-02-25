"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type {
  RaceState,
  RacePlayerProgress,
  WpmSample,
  ModeCategory,
} from "@typeoff/shared";
import { useSocket } from "./useSocket";

export type RacePhase = "idle" | "queuing" | "countdown" | "racing" | "finished" | "placed";

export interface RaceResult {
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
  xpProgress?: {
    xpEarned: number;
    totalXp: number;
    level: number;
    levelUp: boolean;
    newRewards: Array<{
      level: number;
      type: string;
      id: string;
      name: string;
      value: string;
    }>;
  };
  isPro?: boolean;
  activeBadge?: string | null;
  activeNameColor?: string | null;
  activeNameEffect?: string | null;
  level?: number;
  previousBestWpm?: number;
}

export function useRace(myPlayerId?: string | null) {
  const { connected, emit, on, updateToken } = useSocket();
  const [phase, setPhase] = useState<RacePhase>("idle");
  const [queueCount, setQueueCount] = useState(0);
  const [maxWaitSeconds, setMaxWaitSeconds] = useState(5);
  const [queueElapsed, setQueueElapsed] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const [raceState, setRaceState] = useState<RaceState | null>(null);
  const [progress, setProgress] = useState<Record<string, RacePlayerProgress>>({});
  const [results, setResults] = useState<RaceResult[]>([]);
  const [placementRace, setPlacementRace] = useState<number | undefined>();
  const [placementTotal, setPlacementTotal] = useState<number | undefined>();
  const [finishTimeoutEnd, setFinishTimeoutEnd] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Keep track of own player id
  const myPlayerIdRef = useRef<string | null>(myPlayerId ?? null);
  myPlayerIdRef.current = myPlayerId ?? null;

  // Track previous connected state for reconnection detection
  const prevConnectedRef = useRef(connected);

  // Ref-based finish lock: set synchronously in sendFinish, checked in all
  // setProgress paths. Unlike React state, a ref update is immediate and can't
  // be lost to batching, stale closures, or event ordering.
  const localFinishRef = useRef<{
    playerId: string;
    entry: RacePlayerProgress;
  } | null>(null);

  // Track last sent progress for logging/diagnostics
  const lastSentProgressRef = useRef<{ progress: number; time: number } | null>(null);

  // Post-finish watchdog: track when finish was sent to detect unacknowledged finishes
  const finishSentTimeRef = useRef<number | null>(null);

  useEffect(() => {
    const unsubs = [
      on("queueUpdate", (data) => {
        setQueueCount(data.count);
        if (data.maxWaitSeconds != null) setMaxWaitSeconds(data.maxWaitSeconds);
      }),
      on("raceStart", (data) => {
        if (queueTimeoutRef.current) {
          clearTimeout(queueTimeoutRef.current);
          queueTimeoutRef.current = null;
        }
        setError(null);
        setRaceState(data);
        // During reconnection, preserve local finished state if the server
        // hasn't caught up yet (raceFinish event may have been lost)
        const finish = localFinishRef.current;
        if (finish && !data.progress[finish.playerId]?.finished) {
          setProgress({ ...data.progress, [finish.playerId]: finish.entry });
        } else {
          if (finish) localFinishRef.current = null; // server confirmed, clear lock
          setProgress(data.progress);
        }
        setCountdown(data.countdown);
        setPhase("countdown");
      }),
      on("raceCountdown", (data) => {
        setCountdown(data.countdown);
        if (data.countdown <= 0) {
          setPhase("racing");
        }
      }),
      on("raceProgress", (data) => {
        // Clear finish watchdog if server confirmed our finish
        const finish = localFinishRef.current;
        if (finish && finishSentTimeRef.current) {
          const serverEntry = data.progress[finish.playerId];
          if (serverEntry?.finished) {
            finishSentTimeRef.current = null;
          }
        }

        setProgress(prev => {
          // Ref-based finish lock: if we finished locally, never let any
          // server broadcast regress our state (regardless of myPlayerId,
          // React batching, or event ordering)
          const finish = localFinishRef.current;
          if (finish) {
            if (data.progress[finish.playerId]?.finished) {
              // Server confirmed our finish — use server data, clear lock
              localFinishRef.current = null;
              return data.progress;
            }
            // Server hasn't caught up — merge server data but keep our entry
            return { ...data.progress, [finish.playerId]: finish.entry };
          }
          const myId = myPlayerIdRef.current;
          if (!myId) return data.progress;
          const serverEntry = data.progress[myId];
          if (serverEntry?.finished) return data.progress;
          const localEntry = prev[myId];
          // Keep local progress if it's ahead of the server (optimistic update)
          if (localEntry && localEntry.progress > (serverEntry?.progress ?? 0)) {
            return { ...data.progress, [myId]: localEntry };
          }
          return data.progress;
        });
        if (data.finishTimeoutEnd != null) {
          setFinishTimeoutEnd(data.finishTimeoutEnd);
        }
      }),
      on("raceFinished", (data) => {
        // Merge enriched fields into existing results rather than replacing,
        // so React can diff minimally and avoid a full re-render flash
        setResults(prev => {
          if (prev.length === 0) return data.results;
          return data.results.map(r => {
            const existing = prev.find(p => p.playerId === r.playerId);
            return existing ? { ...existing, ...r } : r;
          });
        });
        setPlacementRace(data.placementRace);
        setPlacementTotal(data.placementTotal);
        // Show rank reveal screen after final placement race
        if (data.placementRace != null && data.placementTotal != null && data.placementRace >= data.placementTotal) {
          setPhase("placed");
        } else {
          setPhase("finished");
        }
      }),
      on("error", (data) => {
        if (queueTimeoutRef.current) {
          clearTimeout(queueTimeoutRef.current);
          queueTimeoutRef.current = null;
        }
        // Don't kick the user back to idle if results are already showing
        // (e.g. "No active race found" from a reconnection after the race ended)
        setPhase(prev => {
          if (prev === "finished" || prev === "placed") return prev;
          setError(data.message);
          return "idle";
        });
      }),
    ];

    return () => unsubs.forEach((unsub) => unsub());
  }, [on]);

  // Tick queueElapsed once per second while queuing
  useEffect(() => {
    if (phase !== "queuing") {
      setQueueElapsed(0);
      return;
    }
    const timer = setInterval(() => {
      setQueueElapsed((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [phase]);

  // Reconnect to active race after brief disconnect.
  // The server middleware already does proactive reconnection via the auth token,
  // so this is a fallback for cases where the middleware didn't have a token.
  useEffect(() => {
    const wasDisconnected = !prevConnectedRef.current;
    prevConnectedRef.current = connected;

    if (connected && wasDisconnected && (phase === "racing" || phase === "countdown")) {
      // Small delay: the server middleware's proactive reconnect should have
      // already restored the socket mapping. Only send rejoinRace if we're
      // still in a racing phase after the middleware had time to act.
      const timer = setTimeout(async () => {
        // Re-check phase — it may have transitioned to "finished" by now
        // (can't read React state directly in async, so rely on the ref)
        if (localFinishRef.current) return; // Already finished locally, don't rejoin
        try {
          const res = await fetch("/api/ws-token");
          if (res.ok) {
            const data = await res.json();
            if (data.token) {
              updateToken(data.token);
              emit("rejoinRace", { token: data.token });
            }
          }
        } catch {
          // Token fetch failed — server will end race after grace period
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [connected, phase, emit, updateToken]);

  const queueTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const joinQueue = useCallback(
    async (opts?: { privateRace?: boolean; modeCategories?: ModeCategory[] }) => {
      setError(null);
      setPhase("queuing");

      let token: string | undefined;
      try {
        const res = await fetch("/api/ws-token");
        if (res.ok) {
          const data = await res.json();
          token = data.token;
          // Share the token with the socket provider so reconnections
          // always have a valid token (prevents 0-WPM on reconnect)
          if (token) updateToken(token);
        }
      } catch {
        // Will fail below
      }

      if (token) {
        myPlayerIdRef.current = null; // Will be set from race state
        emit("joinQueue", { token, privateRace: opts?.privateRace, modeCategories: opts?.modeCategories ?? ["words"] });

        // Safety timeout: must exceed server BOT_WAIT_MS (20s)
        if (queueTimeoutRef.current) clearTimeout(queueTimeoutRef.current);
        queueTimeoutRef.current = setTimeout(() => {
          emit("leaveQueue");
          setError("Failed to join race. Please try again.");
          setPhase("idle");
        }, 25_000);
      } else {
        setError("Sign in required to play");
        setPhase("idle");
      }
    },
    [emit, updateToken]
  );

  const leaveQueue = useCallback(() => {
    if (queueTimeoutRef.current) {
      clearTimeout(queueTimeoutRef.current);
      queueTimeoutRef.current = null;
    }
    emit("leaveQueue");
    setPhase("idle");
    setQueueCount(0);
  }, [emit]);

  const leaveRace = useCallback(() => {
    emit("leaveRace");
    localFinishRef.current = null;
    setPhase("idle");
    setRaceState(null);
    setProgress({});
    setCountdown(0);
    setError(null);
  }, [emit]);

  const sendProgress = useCallback(
    (data: {
      wordIndex: number;
      charIndex: number;
      wpm: number;
      progress: number;
    }) => {
      // After finishing, keep sending progress=1 so the server's handleProgress
      // safety net can auto-finish us if the raceFinish event was dropped.
      // Block anything below 1 to prevent stale progress regression.
      if (localFinishRef.current && data.progress < 1) return;
      emit("raceProgress", data);
      // Track sent progress for stale connection detection
      lastSentProgressRef.current = { progress: data.progress, time: Date.now() };
    },
    [emit]
  );

  const sendFinish = useCallback(
    (data: { wpm: number; rawWpm: number; accuracy: number; misstypedChars?: number }) => {
      emit("raceFinish", data);
      finishSentTimeRef.current = Date.now();
      // Optimistically mark self as finished so RaceTrack shows WPM immediately
      // (placement stays null until the server assigns it)
      const myId = myPlayerIdRef.current;
      if (myId) {
        // Build the finished entry and store in the ref SYNCHRONOUSLY before
        // any async setProgress — this ref is the source of truth that
        // raceProgress / raceStart handlers check to prevent regression.
        const entry: RacePlayerProgress = {
          playerId: myId,
          wordIndex: 0,
          charIndex: 0,
          placement: null,
          wpm: data.wpm,
          progress: 1,
          finished: true,
          finalStats: data,
        };
        localFinishRef.current = { playerId: myId, entry };

        setProgress(prev => {
          const current = prev[myId];
          if (current?.finished) return prev;
          // Merge with current entry to preserve wordIndex/charIndex
          const merged = {
            ...entry,
            wordIndex: current?.wordIndex ?? 0,
            charIndex: current?.charIndex ?? 0,
            placement: current?.placement ?? null,
          };
          localFinishRef.current = { playerId: myId, entry: merged };
          return { ...prev, [myId]: merged };
        });
      }
    },
    [emit]
  );

  const reset = useCallback(() => {
    localFinishRef.current = null;
    lastSentProgressRef.current = null;
    finishSentTimeRef.current = null;
    setPhase("idle");
    setRaceState(null);
    setProgress({});
    setResults([]);
    setPlacementRace(undefined);
    setPlacementTotal(undefined);
    setCountdown(0);
    setQueueCount(0);
    setFinishTimeoutEnd(null);
    setError(null);
  }, []);

  const raceAgain = useCallback(
    (opts?: { privateRace?: boolean; modeCategories?: ModeCategory[] }) => {
      localFinishRef.current = null;
      lastSentProgressRef.current = null;
      finishSentTimeRef.current = null;
      setRaceState(null);
      setProgress({});
      setResults([]);
      setPlacementRace(undefined);
      setPlacementTotal(undefined);
      setCountdown(0);
      setFinishTimeoutEnd(null);
      setError(null);
      joinQueue(opts);
    },
    [joinQueue]
  );

  return {
    connected,
    phase,
    queueCount,
    queueElapsed,
    maxWaitSeconds,
    countdown,
    raceState,
    raceId: raceState?.raceId ?? null,
    progress,
    results,
    placementRace,
    placementTotal,
    finishTimeoutEnd,
    error,
    joinQueue,
    leaveQueue,
    leaveRace,
    sendProgress,
    sendFinish,
    reset,
    raceAgain,
  };
}
