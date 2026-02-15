"use client";

import { useState, useCallback, useEffect } from "react";
import type {
  RaceState,
  RacePlayer,
  RacePlayerProgress,
  RaceStatus,
} from "@typeoff/shared";
import { useSocket } from "./useSocket";

export type SpectatorPhase = "idle" | "browsing" | "watching";

export interface ActiveRace {
  raceId: string;
  players: RacePlayer[];
  status: RaceStatus;
}

export function useSpectator() {
  const { connected, emit, on } = useSocket();
  const [phase, setPhase] = useState<SpectatorPhase>("idle");
  const [activeRaces, setActiveRaces] = useState<ActiveRace[]>([]);
  const [raceState, setRaceState] = useState<RaceState | null>(null);
  const [progress, setProgress] = useState<Record<string, RacePlayerProgress>>({});

  useEffect(() => {
    const unsubs = [
      on("activeRaces", (data) => {
        setActiveRaces(data.races);
        if (phase === "idle") setPhase("browsing");
      }),
      on("spectateStarted", (data) => {
        setRaceState(data);
        setProgress(data.progress);
        setPhase("watching");
      }),
      on("raceProgress", (data) => {
        if (phase === "watching") {
          setProgress(data.progress);
        }
      }),
      on("raceFinished", () => {
        // Race ended, go back to browsing
        setPhase("browsing");
        setRaceState(null);
        setProgress({});
        // Auto-refresh list
        emit("listActiveRaces");
      }),
    ];

    return () => unsubs.forEach((unsub) => unsub());
  }, [on, emit, phase]);

  const listRaces = useCallback(() => {
    emit("listActiveRaces");
    setPhase("browsing");
  }, [emit]);

  const watchRace = useCallback(
    (raceId: string) => {
      emit("spectateRace", { raceId });
    },
    [emit]
  );

  const stopWatching = useCallback(() => {
    emit("stopSpectating");
    setPhase("browsing");
    setRaceState(null);
    setProgress({});
    emit("listActiveRaces");
  }, [emit]);

  return {
    connected,
    phase,
    activeRaces,
    raceState,
    progress,
    listRaces,
    watchRace,
    stopWatching,
  };
}
