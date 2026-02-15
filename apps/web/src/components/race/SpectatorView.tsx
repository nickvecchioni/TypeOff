"use client";

import React from "react";
import type { RaceState, RacePlayerProgress } from "@typeoff/shared";
import { RaceTrack } from "./RaceTrack";

interface SpectatorViewProps {
  raceState: RaceState;
  progress: Record<string, RacePlayerProgress>;
  onStop: () => void;
}

export function SpectatorView({ raceState, progress, onStop }: SpectatorViewProps) {
  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-3xl mx-auto animate-fade-in">
      <div className="flex items-center gap-3">
        <span className="w-2 h-2 rounded-full bg-error animate-pulse" />
        <span className="text-sm text-muted uppercase tracking-wider font-bold">
          Live
        </span>
      </div>

      <RaceTrack
        players={raceState.players}
        progress={progress}
        myPlayerId={null}
      />

      <button
        onClick={onStop}
        className="text-sm text-muted hover:text-error transition-colors"
      >
        Stop Watching
      </button>
    </div>
  );
}
