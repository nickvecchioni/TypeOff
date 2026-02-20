"use client";

import React, { useMemo } from "react";
import type { RaceMode, WpmSample, ReplaySnapshot } from "@typeoff/shared";
import { generateWordsForMode, getRankTier } from "@typeoff/shared";
import { useReplay } from "@/hooks/useReplay";
import { ReplayView } from "./ReplayView";

interface ParticipantData {
  id: string;
  name: string;
  placement: number;
  wpm: number;
  rawWpm: number;
  accuracy: number;
  rankTier: string | null;
  wpmHistory: WpmSample[] | null;
  replayData: ReplaySnapshot[] | null;
}

interface ReplayClientProps {
  race: {
    id: string;
    seed: number;
    wordCount: number;
    wordPool: string | null;
  };
  participants: ParticipantData[];
}

export function ReplayClient({ race, participants }: ReplayClientProps) {
  const mode = (race.wordPool ?? "standard") as RaceMode;
  const words = useMemo(() => generateWordsForMode(mode, race.seed), [mode, race.seed]);

  const playerReplayData = useMemo(
    () =>
      participants.map((p) => ({
        playerId: p.id,
        name: p.name,
        replayData: p.replayData,
        wpmHistory: p.wpmHistory,
        wpm: p.wpm,
        placement: p.placement,
      })),
    [participants]
  );

  const replayPlayers = useMemo(
    () =>
      participants.map((p) => ({
        id: p.id,
        name: p.name,
        placement: p.placement,
        wpm: p.wpm,
        rawWpm: p.rawWpm,
        accuracy: p.accuracy,
        rankTier: p.rankTier,
        wpmHistory: p.wpmHistory,
      })),
    [participants]
  );

  const {
    currentTime,
    duration,
    isPlaying,
    speed,
    playerProgress,
    play,
    pause,
    seek,
    setSpeed,
  } = useReplay(playerReplayData, words.length);

  return (
    <ReplayView
      players={replayPlayers}
      words={words}
      playerProgress={playerProgress}
      currentTime={currentTime}
      duration={duration}
      isPlaying={isPlaying}
      speed={speed}
      onPlay={play}
      onPause={pause}
      onSeek={seek}
      onSetSpeed={setSpeed}
    />
  );
}
