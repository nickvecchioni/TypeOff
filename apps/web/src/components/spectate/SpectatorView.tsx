"use client";

import React, { useMemo } from "react";
import type { RaceState, RacePlayer, RacePlayerProgress } from "@typeoff/shared";
import { getRankTier, generateWordsForMode } from "@typeoff/shared";
import { RaceTrack } from "@/components/race/RaceTrack";
import { RankBadge } from "@/components/RankBadge";
import { CosmeticBadge } from "@/components/CosmeticBadge";
import { CosmeticName } from "@/components/CosmeticName";
import { SpectatorWordDisplay } from "./SpectatorWordDisplay";

interface SpectatorResult {
  playerId: string;
  name: string;
  placement: number;
  wpm: number;
  accuracy: number;
  eloChange: number | null;
  activeBadge?: string | null;
  activeNameColor?: string | null;
  activeNameEffect?: string | null;
}

interface SpectatorViewProps {
  raceState: RaceState;
  progress: Record<string, RacePlayerProgress>;
  spectators: Array<{ userId: string; name: string }>;
  spectatorCount: number;
  watchedPlayerId: string | null;
  onSetWatchedPlayer: (id: string) => void;
  onStop: () => void;
  finished: boolean;
  results: SpectatorResult[];
}

function PlayerTab({
  player,
  isActive,
  progress,
  onClick,
}: {
  player: RacePlayer;
  isActive: boolean;
  progress?: RacePlayerProgress;
  onClick: () => void;
}) {
  const isBot = player.id.startsWith("bot_");
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap ${
        isActive
          ? "bg-accent/[0.12] text-accent ring-1 ring-accent/25"
          : "text-muted/50 hover:text-muted hover:bg-white/[0.04]"
      }`}
    >
      {!isBot && <RankBadge tier={getRankTier(player.elo)} />}
      {!isBot && <CosmeticBadge badge={player.activeBadge} />}
      <span className="truncate max-w-[100px]">
        {isBot ? player.name : (
          <CosmeticName nameColor={isActive ? null : player.activeNameColor} nameEffect={player.activeNameEffect}>
            {player.name}
          </CosmeticName>
        )}
      </span>
      {progress && (
        <span className="tabular-nums text-[10px] text-muted/30 ml-0.5">
          {Math.floor(progress.wpm)}
        </span>
      )}
    </button>
  );
}

export function SpectatorView({
  raceState,
  progress,
  spectators,
  spectatorCount,
  watchedPlayerId,
  onSetWatchedPlayer,
  onStop,
  finished,
  results,
}: SpectatorViewProps) {
  const words = useMemo(
    () => generateWordsForMode(raceState.mode, raceState.seed),
    [raceState.mode, raceState.seed],
  );

  const watchedProgress = watchedPlayerId ? progress[watchedPlayerId] : null;

  return (
    <div
      className="w-full flex flex-col gap-6 opacity-0 animate-fade-in"
      style={{ animationFillMode: "both" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* LIVE badge */}
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest ${
            finished
              ? "bg-muted/10 text-muted/40 ring-1 ring-white/[0.06]"
              : "bg-red-500/[0.12] text-red-400 ring-1 ring-red-500/25"
          }`}>
            {!finished && <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />}
            {finished ? "Ended" : "Live"}
          </div>

          {/* Spectator count */}
          {spectatorCount > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-muted/30">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              <span className="tabular-nums">{spectatorCount}</span>
            </div>
          )}

          {/* Mode badge */}
          <span className="text-[10px] text-muted/25 uppercase tracking-wider font-medium">
            {raceState.mode}
          </span>
        </div>

        <button
          onClick={onStop}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted/50 hover:text-text bg-white/[0.03] ring-1 ring-white/[0.06] hover:ring-white/[0.12] transition-all"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
          Stop Watching
        </button>
      </div>

      {/* Race Track */}
      <div
        className="opacity-0 animate-fade-in"
        style={{ animationDelay: "100ms", animationFillMode: "both" }}
      >
        <RaceTrack
          players={raceState.players}
          progress={progress}
          myPlayerId={null}
          isPlacement={raceState.placementRace != null}
        />
      </div>

      {/* Finished: Results table */}
      {finished && results.length > 0 ? (
        <div
          className="rounded-xl bg-surface/50 ring-1 ring-white/[0.06] overflow-hidden opacity-0 animate-fade-in"
          style={{ animationDelay: "200ms", animationFillMode: "both" }}
        >
          <div className="h-px bg-gradient-to-r from-transparent via-accent/20 to-transparent" />
          <div className="p-4">
            <h3 className="text-[10px] font-bold text-muted/40 uppercase tracking-widest mb-3">
              Results
            </h3>
            <div className="space-y-2">
              {results
                .sort((a, b) => a.placement - b.placement)
                .map((r) => {
                  const isBot = r.playerId.startsWith("bot_");
                  return (
                    <div
                      key={r.playerId}
                      className="flex items-center justify-between text-sm"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-5 text-right text-muted/30 tabular-nums text-xs font-bold">
                          #{r.placement}
                        </span>
                        {!isBot && <CosmeticBadge badge={r.activeBadge} />}
                        <span className="truncate">
                          {isBot ? (
                            <span className="text-muted/40">{r.name}</span>
                          ) : (
                            <CosmeticName nameColor={r.activeNameColor} nameEffect={r.activeNameEffect}>
                              {r.name}
                            </CosmeticName>
                          )}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted/50 tabular-nums shrink-0">
                        <span>{r.accuracy.toFixed(1)}%</span>
                        <span className="text-text font-bold w-[5ch] text-right">
                          {r.wpm.toFixed(1)}
                        </span>
                        {r.eloChange != null && (
                          <span className={`w-[4ch] text-right ${
                            r.eloChange > 0 ? "text-correct/70" : r.eloChange < 0 ? "text-error/70" : "text-muted/30"
                          }`}>
                            {r.eloChange > 0 ? "+" : ""}{r.eloChange}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      ) : (
        /* Racing: Player tabs + word display */
        <>
          {/* Player selector tabs */}
          <div
            className="flex items-center gap-1.5 overflow-x-auto pb-1 opacity-0 animate-fade-in"
            style={{ animationDelay: "150ms", animationFillMode: "both" }}
          >
            <span className="text-[10px] text-muted/25 uppercase tracking-wider font-bold shrink-0 mr-1">
              Watching
            </span>
            {raceState.players.map((player) => (
              <PlayerTab
                key={player.id}
                player={player}
                isActive={player.id === watchedPlayerId}
                progress={progress[player.id]}
                onClick={() => onSetWatchedPlayer(player.id)}
              />
            ))}
          </div>

          {/* Word display for selected player */}
          {watchedPlayerId && watchedProgress && (
            <div
              className="rounded-xl bg-surface/30 ring-1 ring-white/[0.04] p-6 opacity-0 animate-fade-in"
              style={{ animationDelay: "200ms", animationFillMode: "both" }}
            >
              <SpectatorWordDisplay
                words={words}
                wordIndex={watchedProgress.wordIndex}
                charIndex={watchedProgress.charIndex}
                finished={watchedProgress.finished}
              />

              {/* Live WPM for watched player */}
              <div className="flex items-baseline justify-center text-muted text-sm tabular-nums mt-4">
                <span className="text-accent font-black text-5xl inline-block w-[3ch] text-right">
                  {Math.floor(watchedProgress.wpm)}
                </span>{" "}
                wpm
              </div>
            </div>
          )}
        </>
      )}

      {/* Back button when finished */}
      {finished && (
        <div className="flex justify-center">
          <button
            onClick={onStop}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-accent/70 bg-accent/[0.06] ring-1 ring-accent/15 hover:bg-accent/[0.12] hover:ring-accent/30 hover:text-accent transition-all"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            Back to Races
          </button>
        </div>
      )}
    </div>
  );
}
