"use client";

import React from "react";

interface CountdownOverlayProps {
  countdown: number;
  playerCount: number;
}

export function CountdownOverlay({
  countdown,
  playerCount,
}: CountdownOverlayProps) {
  return (
    <div className="flex flex-col items-center gap-6 animate-fade-in">
      <p className="text-muted text-sm">
        {playerCount} {playerCount === 1 ? "player" : "players"} matched
      </p>
      <div className="text-8xl font-bold text-accent tabular-nums">
        {countdown > 0 ? countdown : "GO!"}
      </div>
      <p className="text-muted text-sm">Get ready to type...</p>
    </div>
  );
}
