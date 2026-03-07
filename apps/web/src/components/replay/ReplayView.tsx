"use client";

import React, { useState, useMemo } from "react";
import type { RacePlayer, RacePlayerProgress, WpmSample } from "@typeoff/shared";
import { getRankTier } from "@typeoff/shared";
import { RaceTrack } from "@/components/race/RaceTrack";
import { SpectatorWordDisplay } from "@/components/spectate/SpectatorWordDisplay";
import { WpmChart } from "@/components/typing/WpmChart";
import { ReplayControls } from "./ReplayControls";
import { RankBadge } from "@/components/RankBadge";

interface ReplayPlayer {
  id: string;
  name: string;
  placement: number;
  wpm: number;
  rawWpm: number;
  accuracy: number;
  rankTier: string | null;
  wpmHistory: WpmSample[] | null;
}

interface ReplayViewProps {
  players: ReplayPlayer[];
  words: string[];
  playerProgress: Record<string, { wordIndex: number; charIndex: number; progress: number }>;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  speed: number;
  onPlay: () => void;
  onPause: () => void;
  onSeek: (time: number) => void;
  onSetSpeed: (speed: number) => void;
}

export function ReplayView({
  players,
  words,
  playerProgress,
  currentTime,
  duration,
  isPlaying,
  speed,
  onPlay,
  onPause,
  onSeek,
  onSetSpeed,
}: ReplayViewProps) {
  const [selectedPlayer, setSelectedPlayer] = useState(players[0]?.id ?? "");

  const racePlayersForTrack: RacePlayer[] = useMemo(
    () =>
      players.map((p) => ({
        id: p.id,
        name: p.name,
        isGuest: false,
        elo: 0,
      })),
    [players]
  );

  const progressForTrack: Record<string, RacePlayerProgress> = useMemo(() => {
    const result: Record<string, RacePlayerProgress> = {};
    for (const p of players) {
      const prog = playerProgress[p.id];
      result[p.id] = {
        playerId: p.id,
        wordIndex: prog?.wordIndex ?? 0,
        charIndex: prog?.charIndex ?? 0,
        wpm: p.wpm,
        progress: prog?.progress ?? 0,
        finished: (prog?.progress ?? 0) >= 1,
        placement: p.placement,
        finalStats: null,
      };
    }
    return result;
  }, [players, playerProgress]);

  const selectedProg = playerProgress[selectedPlayer];
  const selectedPlayerData = players.find((p) => p.id === selectedPlayer);

  return (
    <div className="flex flex-col gap-3 w-full max-w-5xl mx-auto">
      {/* Badge */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-accent/60 uppercase tracking-wider bg-accent/[0.06] rounded px-2 py-0.5">
          Replay
        </span>
      </div>

      {/* Race Track */}
      <RaceTrack
        players={racePlayersForTrack}
        progress={progressForTrack}
        myPlayerId={null}
      />

      {/* Player selector tabs */}
      <div className="flex items-center gap-1 overflow-x-auto">
        {players.map((p) => (
          <button
            key={p.id}
            onClick={() => setSelectedPlayer(p.id)}
            className={`text-xs px-3 py-1.5 rounded transition-colors shrink-0 ${
              selectedPlayer === p.id
                ? "bg-accent/[0.1] text-accent ring-1 ring-accent/20"
                : "text-muted/60 hover:text-text"
            }`}
          >
            {p.rankTier && (
              <span className="mr-1.5">
                <RankBadge tier={p.rankTier as any} showElo={false} size="xs" />
              </span>
            )}
            {p.name}
          </button>
        ))}
      </div>

      {/* Word display for selected player */}
      <div className="rounded-xl bg-surface/30 ring-1 ring-white/[0.04] px-4 py-4 sm:px-6 sm:py-5 min-h-[120px]">
        <SpectatorWordDisplay
          words={words}
          wordIndex={selectedProg?.wordIndex ?? 0}
          charIndex={selectedProg?.charIndex ?? 0}
          finished={(selectedProg?.progress ?? 0) >= 1}
        />
      </div>

      {/* WPM Chart for selected player */}
      {selectedPlayerData?.wpmHistory && selectedPlayerData.wpmHistory.length >= 2 && (
        <div className="rounded-xl bg-surface/30 ring-1 ring-white/[0.04] p-3 h-32">
          <WpmChart samples={selectedPlayerData.wpmHistory} />
        </div>
      )}

      {/* Playback controls */}
      <ReplayControls
        currentTime={currentTime}
        duration={duration}
        isPlaying={isPlaying}
        speed={speed}
        onPlay={onPlay}
        onPause={onPause}
        onSeek={onSeek}
        onSetSpeed={onSetSpeed}
      />

      {/* Results summary */}
      <div className="rounded-xl bg-surface/30 ring-1 ring-white/[0.04] overflow-hidden">
        <div className="grid grid-cols-[2rem_1fr_4rem_4rem] text-xs text-muted/65 uppercase tracking-wider px-4 py-1.5 border-b border-white/[0.06]">
          <span>#</span>
          <span>Player</span>
          <span className="text-right">WPM</span>
          <span className="text-right">Acc</span>
        </div>
        {players.map((p) => (
          <div
            key={p.id}
            className="grid grid-cols-[2rem_1fr_4rem_4rem] items-center px-4 py-1.5 border-b border-white/[0.03] last:border-0 text-sm"
          >
            <span className="font-bold tabular-nums text-muted">{p.placement}</span>
            <span className="text-text truncate">{p.name}</span>
            <span className="text-right tabular-nums text-text">
              {Math.floor(p.wpm)}
            </span>
            <span className="text-right tabular-nums text-muted">
              {p.accuracy != null ? `${Math.floor(p.accuracy)}%` : "-"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
