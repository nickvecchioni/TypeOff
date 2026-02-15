"use client";

import { useState, useCallback, useEffect } from "react";
import type {
  TournamentState,
  TournamentBracket,
  RaceState,
  RacePlayerProgress,
  WpmSample,
} from "@typeoff/shared";
import { useSocket } from "./useSocket";

export type TournamentPhase =
  | "idle"
  | "browsing"
  | "joined"
  | "bracket"
  | "match"
  | "results";

export function useTournament() {
  const { connected, emit, on } = useSocket();
  const [phase, setPhase] = useState<TournamentPhase>("idle");
  const [tournament, setTournament] = useState<TournamentState | null>(null);
  const [tournaments, setTournaments] = useState<TournamentState[]>([]);
  const [bracket, setBracket] = useState<TournamentBracket | null>(null);
  const [raceState, setRaceState] = useState<RaceState | null>(null);
  const [progress, setProgress] = useState<Record<string, RacePlayerProgress>>({});
  const [finishTimeoutEnd, setFinishTimeoutEnd] = useState<number | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [results, setResults] = useState<Array<{ userId: string; name: string; placement: number }>>([]);
  const [error, setError] = useState<string | null>(null);
  const [currentMatchId, setCurrentMatchId] = useState<string | null>(null);

  useEffect(() => {
    const unsubs = [
      on("tournamentList", (data) => {
        setTournaments(data.tournaments);
        if (phase === "idle") setPhase("browsing");
      }),
      on("tournamentCreated", (data) => {
        setTournament(data);
        setPhase("joined");
        setError(null);
      }),
      on("tournamentUpdate", (data) => {
        setTournament(data);
        if (phase === "idle" || phase === "browsing") setPhase("joined");
      }),
      on("tournamentBracket", (data) => {
        setBracket(data);
        setPhase("bracket");
      }),
      on("tournamentMatchStart", (data) => {
        setCurrentMatchId(data.matchId);
        setRaceState(data.raceState);
        setProgress(data.raceState.progress);
        setCountdown(data.raceState.countdown);
        setPhase("match");
      }),
      on("raceCountdown", (data) => {
        setCountdown(data.countdown);
      }),
      on("raceProgress", (data) => {
        setProgress(data.progress);
        if (data.finishTimeoutEnd != null) setFinishTimeoutEnd(data.finishTimeoutEnd);
      }),
      on("raceFinished", () => {
        // After match race finishes, go back to bracket view
        setPhase("bracket");
        setRaceState(null);
      }),
      on("tournamentFinished", (data) => {
        setResults(data.results);
        setPhase("results");
      }),
      on("tournamentError", (data) => {
        setError(data.message);
      }),
      on("error", (data) => {
        setError(data.message);
      }),
    ];

    return () => unsubs.forEach((unsub) => unsub());
  }, [on, phase]);

  const listTournaments = useCallback(() => {
    emit("listTournaments");
  }, [emit]);

  const createTournament = useCallback(
    (name: string, maxPlayers?: number) => {
      setError(null);
      emit("createTournament", { name, maxPlayers });
    },
    [emit],
  );

  const joinTournament = useCallback(
    (tournamentId: string) => {
      setError(null);
      emit("joinTournament", { tournamentId });
    },
    [emit],
  );

  const leaveTournament = useCallback(() => {
    emit("leaveTournament");
    setPhase("browsing");
    setTournament(null);
    setBracket(null);
  }, [emit]);

  const startTournament = useCallback(() => {
    emit("startTournament");
  }, [emit]);

  const readyForMatch = useCallback(
    (matchId: string) => {
      emit("readyForMatch", { matchId });
    },
    [emit],
  );

  const sendProgress = useCallback(
    (data: { wordIndex: number; charIndex: number; wpm: number; progress: number }) => {
      emit("raceProgress", data);
    },
    [emit],
  );

  const sendFinish = useCallback(
    (data: { wpm: number; rawWpm: number; accuracy: number; wpmHistory?: WpmSample[] }) => {
      emit("raceFinish", data);
    },
    [emit],
  );

  const reset = useCallback(() => {
    setPhase("idle");
    setTournament(null);
    setTournaments([]);
    setBracket(null);
    setRaceState(null);
    setResults([]);
    setError(null);
  }, []);

  return {
    connected,
    phase,
    tournament,
    tournaments,
    bracket,
    raceState,
    progress,
    countdown,
    finishTimeoutEnd,
    results,
    error,
    currentMatchId,
    listTournaments,
    createTournament,
    joinTournament,
    leaveTournament,
    startTournament,
    readyForMatch,
    sendProgress,
    sendFinish,
    reset,
  };
}
