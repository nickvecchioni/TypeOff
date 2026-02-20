"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSocket } from "./useSocket";
import type {
  RaceState,
  RacePlayer,
  RacePlayerProgress,
  RaceStatus,
} from "@typeoff/shared";

export type SpectatePhase = "browsing" | "connecting" | "watching" | "finished";

export interface ActiveRaceEntry {
  raceId: string;
  players: RacePlayer[];
  status: RaceStatus;
  spectatorCount: number;
}

export interface SpectatorInfo {
  userId: string;
  name: string;
}

export function useSpectate() {
  const { connected, emit, on } = useSocket();
  const [phase, setPhase] = useState<SpectatePhase>("browsing");
  const [activeRaces, setActiveRaces] = useState<ActiveRaceEntry[]>([]);
  const [raceState, setRaceState] = useState<RaceState | null>(null);
  const [progress, setProgress] = useState<Record<string, RacePlayerProgress>>({});
  const [spectators, setSpectators] = useState<SpectatorInfo[]>([]);
  const [spectatorCount, setSpectatorCount] = useState(0);
  const [watchedPlayerId, setWatchedPlayerId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<Array<{
    playerId: string;
    name: string;
    placement: number;
    wpm: number;
    accuracy: number;
    eloChange: number | null;
    activeBadge?: string | null;
    activeNameColor?: string | null;
    activeNameEffect?: string | null;
  }>>([]);

  const watchingRaceIdRef = useRef<string | null>(null);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const connectingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Core socket event listeners — no state in dependency array to avoid churn
  useEffect(() => {
    const unsubs = [
      on("activeRaces", (data) => {
        setActiveRaces(data.races);
      }),
      on("spectateStarted", (data) => {
        if (connectingTimerRef.current) {
          clearTimeout(connectingTimerRef.current);
          connectingTimerRef.current = null;
        }
        setRaceState(data);
        setProgress(data.progress);
        setError(null);
        setResults([]);
        // Auto-select first non-bot player to watch
        const firstReal = data.players.find((p) => !p.id.startsWith("bot_"));
        setWatchedPlayerId(firstReal?.id ?? data.players[0]?.id ?? null);
        watchingRaceIdRef.current = data.raceId;
        setPhase("watching");
      }),
      on("raceProgress", (data) => {
        if (watchingRaceIdRef.current) {
          setProgress(data.progress);
        }
      }),
      on("raceFinished", (data) => {
        if (watchingRaceIdRef.current) {
          setResults(data.results.map((r) => ({
            playerId: r.playerId,
            name: r.name,
            placement: r.placement,
            wpm: r.wpm,
            accuracy: r.accuracy,
            eloChange: r.eloChange,
            activeBadge: r.activeBadge,
            activeNameColor: r.activeNameColor,
            activeNameEffect: r.activeNameEffect,
          })));
          setPhase("finished");
        }
      }),
      on("spectatorUpdate", (data) => {
        if (data.raceId === watchingRaceIdRef.current) {
          setSpectators(data.spectators);
          setSpectatorCount(data.count);
        }
      }),
      on("raceCountdown", (data) => {
        if (watchingRaceIdRef.current) {
          setRaceState((prev) => prev ? { ...prev, countdown: data.countdown } : prev);
        }
      }),
      on("error", (data) => {
        if (phaseRef.current === "connecting") {
          if (connectingTimerRef.current) {
            clearTimeout(connectingTimerRef.current);
            connectingTimerRef.current = null;
          }
          setError(data.message);
          setPhase("browsing");
        }
      }),
    ];
    return () => unsubs.forEach((unsub) => unsub());
  }, [on]);

  // Fetch active races on mount and periodically while browsing
  useEffect(() => {
    if (!connected) return;
    if (phase === "browsing") {
      emit("listActiveRaces");
      const interval = setInterval(() => emit("listActiveRaces"), 5000);
      return () => clearInterval(interval);
    }
  }, [connected, emit, phase]);

  const refreshRaces = useCallback(() => {
    emit("listActiveRaces");
  }, [emit]);

  const watchRace = useCallback(
    async (raceId: string) => {
      setError(null);
      setPhase("connecting");

      // Safety timeout
      if (connectingTimerRef.current) clearTimeout(connectingTimerRef.current);
      connectingTimerRef.current = setTimeout(() => {
        setError("Connection timed out. Please try again.");
        setPhase("browsing");
      }, 8000);

      let token: string | undefined;
      try {
        const res = await fetch("/api/ws-token");
        if (res.ok) {
          const data = await res.json();
          token = data.token;
        }
      } catch {
        // Will spectate as anonymous
      }

      emit("spectateRace", { raceId, token });
    },
    [emit],
  );

  const stopWatching = useCallback(() => {
    emit("stopSpectating");
    watchingRaceIdRef.current = null;
    if (connectingTimerRef.current) {
      clearTimeout(connectingTimerRef.current);
      connectingTimerRef.current = null;
    }
    setPhase("browsing");
    setRaceState(null);
    setProgress({});
    setSpectators([]);
    setSpectatorCount(0);
    setWatchedPlayerId(null);
    setResults([]);
    setError(null);
  }, [emit]);

  return {
    phase,
    activeRaces,
    raceState,
    progress,
    spectators,
    spectatorCount,
    watchedPlayerId,
    error,
    results,
    refreshRaces,
    watchRace,
    stopWatching,
    setWatchedPlayer: setWatchedPlayerId,
  };
}
