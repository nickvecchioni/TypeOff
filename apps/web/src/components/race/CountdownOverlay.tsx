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
    <div
      className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-lg bg-[#0c0c12]/80 backdrop-blur-sm"
      style={showGo ? { animation: "fade-out-up 0.5s ease-in 0.1s forwards" } : undefined}
    >
      {!showGo && (
        <>
          {placementRace != null ? (
            <div className="flex flex-col items-center gap-3 mb-6">
              <span className="text-accent font-bold text-sm uppercase tracking-widest">
                Placement Race
              </span>
              <p className="text-muted text-xs text-center max-w-xs">
                Type to determine your starting rank
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1 mb-6">
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
        </>
      )}
      <div
        key={showGo ? "go" : countdown}
        className="text-8xl font-black text-accent tabular-nums text-glow-accent animate-count-pulse"
      >
        {showGo ? "GO!" : countdown}
      </div>
      {!showGo && (
        <p className="text-muted text-sm mt-6">Get ready to type...</p>
      )}
    </div>
  );
}
