"use client";

import { useState, useCallback, useEffect } from "react";
import type {
  LobbyState,
  RaceState,
  RacePlayerProgress,
  WpmSample,
} from "@typeoff/shared";
import { useSocket } from "./useSocket";

export type LobbyPhase =
  | "idle"
  | "creating"
  | "waiting"
  | "countdown"
  | "racing"
  | "finished";

export interface LobbyResult {
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
}

export function useLobby() {
  const { connected, emit, on } = useSocket();
  const [phase, setPhase] = useState<LobbyPhase>("idle");
  const [lobby, setLobby] = useState<LobbyState | null>(null);
  const [raceState, setRaceState] = useState<RaceState | null>(null);
  const [progress, setProgress] = useState<Record<string, RacePlayerProgress>>({});
  const [results, setResults] = useState<LobbyResult[]>([]);
  const [countdown, setCountdown] = useState(0);
  const [finishTimeoutEnd, setFinishTimeoutEnd] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubs = [
      on("lobbyCreated", (data) => {
        setLobby(data);
        setPhase("waiting");
        setError(null);
      }),
      on("lobbyUpdate", (data) => {
        setLobby(data);
        // If we're in finished phase and lobby updates, it means race cleanup happened
        if (phase === "finished") {
          setPhase("waiting");
          setRaceState(null);
          setProgress({});
          setResults([]);
          setFinishTimeoutEnd(null);
        }
      }),
      on("lobbyError", (data) => {
        setError(data.message);
        if (phase === "creating") setPhase("idle");
      }),
      on("lobbyClosed", () => {
        setPhase("idle");
        setLobby(null);
        setError(null);
      }),
      on("raceStart", (data) => {
        setRaceState(data);
        setProgress(data.progress);
        setCountdown(data.countdown);
        setPhase("countdown");
      }),
      on("raceCountdown", (data) => {
        setCountdown(data.countdown);
        if (data.countdown <= 0) setPhase("racing");
      }),
      on("raceProgress", (data) => {
        setProgress(data.progress);
        if (data.finishTimeoutEnd != null) setFinishTimeoutEnd(data.finishTimeoutEnd);
      }),
      on("raceFinished", (data) => {
        setResults(data.results);
        setPhase("finished");
      }),
      on("error", (data) => {
        setError(data.message);
      }),
    ];

    return () => unsubs.forEach((unsub) => unsub());
  }, [on, phase]);

  const createLobby = useCallback(
    async () => {
      setError(null);
      setPhase("creating");

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
        emit("createLobby", { token });
      } else {
        setError("Sign in required");
        setPhase("idle");
      }
    },
    [emit]
  );

  const joinLobby = useCallback(
    async (code: string) => {
      setError(null);

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
        emit("joinLobby", { code, token });
      } else {
        setError("Sign in required");
      }
    },
    [emit]
  );

  const leaveLobby = useCallback(() => {
    emit("leaveLobby");
    setPhase("idle");
    setLobby(null);
    setError(null);
  }, [emit]);

  const startLobby = useCallback(() => {
    emit("startLobby");
  }, [emit]);

  const sendProgress = useCallback(
    (data: { wordIndex: number; charIndex: number; wpm: number; progress: number }) => {
      emit("raceProgress", data);
    },
    [emit]
  );

  const sendFinish = useCallback(
    (data: { wpm: number; rawWpm: number; accuracy: number; wpmHistory?: WpmSample[] }) => {
      emit("raceFinish", data);
    },
    [emit]
  );

  return {
    connected,
    phase,
    lobby,
    raceState,
    progress,
    results,
    countdown,
    finishTimeoutEnd,
    error,
    createLobby,
    joinLobby,
    leaveLobby,
    startLobby,
    sendProgress,
    sendFinish,
  };
}
