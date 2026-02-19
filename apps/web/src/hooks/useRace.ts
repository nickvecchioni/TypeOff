"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type {
  RaceState,
  RacePlayerProgress,
  WpmSample,
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
  typePassProgress?: {
    seasonId: string;
    seasonalXp: number;
    currentTier: number;
    isPremium: boolean;
    xpEarned: number;
    tierUp: boolean;
    newTier: number;
    newRewards: Array<{
      tier: number;
      type: string;
      id: string;
      name: string;
      value: string;
      premium: boolean;
    }>;
  };
}

export function useRace() {
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
  const myPlayerIdRef = useRef<string | null>(null);

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
        setProgress(data.progress);
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

  const queueTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const joinQueue = useCallback(
    async (opts?: { privateRace?: boolean }) => {
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
        emit("joinQueue", { token, privateRace: opts?.privateRace });

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

  const sendProgress = useCallback(
    (data: {
      wordIndex: number;
      charIndex: number;
      wpm: number;
      progress: number;
    }) => {
      emit("raceProgress", data);
    },
    [emit]
  );

  const sendFinish = useCallback(
    (data: { wpm: number; rawWpm: number; accuracy: number; misstypedChars?: number }) => {
      emit("raceFinish", data);
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
    (opts?: { privateRace?: boolean }) => {
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
    progress,
    results,
    placementRace,
    placementTotal,
    finishTimeoutEnd,
    error,
    joinQueue,
    leaveQueue,
    sendProgress,
    sendFinish,
    reset,
    raceAgain,
  };
}
