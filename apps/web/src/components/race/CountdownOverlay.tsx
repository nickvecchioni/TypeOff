"use client";

import React from "react";
import type { RacePlayer } from "@typeoff/shared";

interface CountdownOverlayProps {
  countdown: number;
  playerCount: number;
  placementRace?: number;
  players?: RacePlayer[];
}

export function CountdownOverlay({
  countdown,
  playerCount,
  placementRace,
  players,
}: CountdownOverlayProps) {
  const botCount = players?.filter((p) => p.id.startsWith("bot_")).length ?? 0;

  return (
    <div className="flex flex-col items-center gap-6 animate-fade-in">
      {placementRace != null ? (
        <div className="flex flex-col items-center gap-3">
          <span className="text-accent font-bold text-sm uppercase tracking-widest">
            Placement Race
          </span>
          {/* Progress dots */}
          <div className="flex items-center gap-2">
            {Array.from({ length: 3 }, (_, i) => (
              <div
                key={i}
                className={`w-2.5 h-2.5 rounded-full transition-colors ${
                  i < placementRace ? "bg-accent shadow-[0_0_6px_rgba(122,162,247,0.4)]" : "bg-surface-bright"
                }`}
              />
            ))}
          </div>
          {placementRace === 1 && (
            <p className="text-muted text-xs text-center max-w-xs">
              Race 3 adaptive bots to determine your initial rank
            </p>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-1">
          <p className="text-muted text-sm">
            {playerCount} {playerCount === 1 ? "player" : "players"} matched
          </p>
          {botCount > 0 && (
            <p className="text-muted/60 text-xs">
              {botCount === playerCount - 1
                ? "Racing against bots"
                : `includes ${botCount} ${botCount === 1 ? "bot" : "bots"}`}
            </p>
          )}
        </div>
      )}
      <div
        key={countdown}
        className="text-8xl font-black text-accent tabular-nums text-glow-accent animate-count-pulse"
      >
        {countdown > 0 ? countdown : "GO!"}
      </div>
      <p className="text-muted text-sm">Get ready to type...</p>
    </div>
  );
}
