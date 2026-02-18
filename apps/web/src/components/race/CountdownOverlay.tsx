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
  placementRace,
}: CountdownOverlayProps) {

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        key={showGo ? "go" : countdown}
        className="text-5xl font-black text-accent tabular-nums text-glow-accent animate-count-pulse"
      >
        {showGo ? "GO!" : countdown}
      </div>
      {!showGo && placementRace != null && (
        <p className="text-muted text-xs">
          Placement Race &mdash; type to determine your starting rank
        </p>
      )}
    </div>
  );
}
