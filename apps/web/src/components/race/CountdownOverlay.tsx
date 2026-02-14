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
        <div className="flex flex-col items-center gap-1">
          <span className="text-accent font-bold text-sm">Placement Race</span>
          <span className="text-muted text-xs">{placementRace} of 3</span>
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
