"use client";

import React from "react";
import type { RaceMode } from "@typeoff/shared";

const MODE_LABELS: Record<RaceMode, string | null> = {
  standard: null,
  quotes: "Quote",
  marathon: "Marathon",
  sprint: "Sprint",
};

interface CountdownOverlayProps {
  countdown: number;
  placementRace?: number;
  mode?: RaceMode;
}

export function CountdownOverlay({
  countdown,
  placementRace,
  mode,
}: CountdownOverlayProps) {
  const modeLabel = mode ? MODE_LABELS[mode] : null;

  return (
    <div className="flex flex-col items-center gap-2">
      {modeLabel && (
        <p className="text-accent/70 text-xs font-semibold uppercase tracking-widest">
          {modeLabel}
        </p>
      )}
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
