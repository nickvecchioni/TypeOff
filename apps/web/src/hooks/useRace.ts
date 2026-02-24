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
  activeBadge?: string | null;
  activeNameColor?: string | null;
  activeNameEffect?: string | null;
  level?: number;
}

export function useRace(myPlayerId?: string | null) {
  const { connected, emit, on } = useSocket();
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
        setProgress(data.progress);
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
        setProgress(prev => {
          const myId = myPlayerIdRef.current;
          if (!myId) return data.progress;
          const serverEntry = data.progress[myId];
          // If server marks us as finished, always use server value
          if (serverEntry?.finished) return data.progress;
          const localEntry = prev[myId];
          // Keep local progress if it's ahead of the server (optimistic update)
          if (localEntry && !localEntry.finished && localEntry.progress > (serverEntry?.progress ?? 0)) {
            return { ...data.progress, [myId]: localEntry };
          }
          return data.progress;
        });
        if (data.finishTimeoutEnd != null) {
          setFinishTimeoutEnd(data.finishTimeoutEnd);
        }
      }),
      on("raceFinished", (data) => {
        setResults(data.results);
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
        setError(data.message);
        setPhase("idle");
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

  // Reconnect to active race after brief disconnect
  useEffect(() => {
    const wasDisconnected = !prevConnectedRef.current;
    prevConnectedRef.current = connected;

    if (connected && wasDisconnected && (phase === "racing" || phase === "countdown")) {
      (async () => {
        try {
          const res = await fetch("/api/ws-token");
          if (res.ok) {
            const data = await res.json();
            if (data.token) {
              emit("rejoinRace", { token: data.token });
            }
          }
        } catch {
          // Token fetch failed — server will end race after grace period
        }
      })();
    }
  }, [connected, phase, emit]);

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
    [emit]
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
      emit("raceProgress", data);
      // Optimistically update own progress bar immediately
      const myId = myPlayerIdRef.current;
      if (myId) {
        setProgress(prev => {
          const current = prev[myId];
          if (current?.finished || (current && current.progress >= data.progress)) return prev;
          return {
            ...prev,
            [myId]: {
              playerId: myId,
              wordIndex: data.wordIndex,
              charIndex: data.charIndex,
              wpm: data.wpm,
              progress: data.progress,
              finished: false,
              placement: current?.placement ?? null,
              finalStats: current?.finalStats ?? null,
            },
          };
        });
      }
    },
    [emit]
  );

  const sendFinish = useCallback(
    (data: { wpm: number; rawWpm: number; accuracy: number; misstypedChars?: number }) => {
      emit("raceFinish", data);
      // Optimistically mark self as finished so RaceTrack shows WPM immediately
      // (placement stays null until the server assigns it)
      const myId = myPlayerIdRef.current;
      if (myId) {
        setProgress(prev => {
          const current = prev[myId];
          if (current?.finished) return prev;
          return {
            ...prev,
            [myId]: {
              ...(current ?? { playerId: myId, wordIndex: 0, charIndex: 0, placement: null }),
              wpm: data.wpm,
              progress: 1,
              finished: true,
              finalStats: data,
            },
          };
        });
      }
    },
    [emit]
  );

  const reset = useCallback(() => {
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
