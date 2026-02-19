"use client";

import React from "react";

interface CountdownOverlayProps {
  countdown: number;
  placementRace?: number;
}

export function CountdownOverlay({
  countdown,
  placementRace,
}: CountdownOverlayProps) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        key={countdown}
        className="text-5xl font-black text-accent tabular-nums text-glow-accent animate-count-pulse"
      >
        {countdown}
      </div>
      {placementRace != null && (
        <p className="text-muted text-xs">
          Placement Race &mdash; type to determine your starting rank
        </p>
      )}
    </div>
  );
}
