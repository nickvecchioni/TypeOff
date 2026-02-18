"use client";

import React from "react";
import type { RacePlayer } from "@typeoff/shared";

interface CountdownOverlayProps {
  countdown: number;
  showGo: boolean;
  playerCount: number;
  placementRace?: number;
  players?: RacePlayer[];
}

export function CountdownOverlay({
  countdown,
  showGo,
  playerCount,
  placementRace,
  players,
}: CountdownOverlayProps) {
  const botCount = players?.filter((p) => p.id.startsWith("bot_")).length ?? 0;

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        key={showGo ? "go" : countdown}
        className="text-5xl font-black text-accent tabular-nums text-glow-accent animate-count-pulse"
      >
        {showGo ? "GO!" : countdown}
      </div>
      {!showGo && (
        <>
          {placementRace != null ? (
            <p className="text-muted text-xs">
              Placement Race &mdash; type to determine your starting rank
            </p>
          ) : (
            <div className="flex items-center gap-2 text-xs text-muted">
              <span>{playerCount} {playerCount === 1 ? "player" : "players"} matched</span>
              {botCount > 0 && (
                <span className="text-muted/60">
                  &middot; {botCount === playerCount - 1
                    ? "Racing against bots"
                    : `includes ${botCount} ${botCount === 1 ? "bot" : "bots"}`}
                </span>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
