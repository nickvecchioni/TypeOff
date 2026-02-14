"use client";

import React from "react";

interface CountdownOverlayProps {
  countdown: number;
  playerCount: number;
  placementRace?: number;
}

export function CountdownOverlay({
  countdown,
  playerCount,
  placementRace,
}: CountdownOverlayProps) {
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
                className={`w-2.5 h-2.5 rounded-full ${
                  i < placementRace ? "bg-accent" : "bg-surface"
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
        <p className="text-muted text-sm">
          {playerCount} {playerCount === 1 ? "player" : "players"} matched
        </p>
      )}
      <div className="text-8xl font-bold text-accent tabular-nums">
        {countdown > 0 ? countdown : "GO!"}
      </div>
      <p className="text-muted text-sm">Get ready to type...</p>
    </div>
  );
}
