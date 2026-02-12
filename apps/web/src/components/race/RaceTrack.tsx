"use client";

import React from "react";
import type { RacePlayer, RacePlayerProgress } from "@typeoff/shared";

interface RaceTrackProps {
  players: RacePlayer[];
  progress: Record<string, RacePlayerProgress>;
  myPlayerId: string | null;
}

export function RaceTrack({ players, progress, myPlayerId }: RaceTrackProps) {
  // Sort by progress descending
  const sorted = [...players].sort((a, b) => {
    const pa = progress[a.id]?.progress ?? 0;
    const pb = progress[b.id]?.progress ?? 0;
    return pb - pa;
  });

  return (
    <div className="flex flex-col gap-3 w-full">
      {sorted.map((player) => {
        const p = progress[player.id];
        const pct = (p?.progress ?? 0) * 100;
        const isMe = player.id === myPlayerId;
        const wpm = p?.wpm ?? 0;
        const finished = p?.finished ?? false;

        return (
          <div key={player.id} className="flex flex-col gap-1">
            <div className="flex justify-between text-sm">
              <span className={isMe ? "text-accent font-bold" : "text-text"}>
                {player.name}
                {isMe && " (you)"}
                {finished && p?.placement && ` #${p.placement}`}
              </span>
              <span className="text-muted tabular-nums">{wpm} wpm</span>
            </div>
            <div className="h-3 rounded-full bg-surface overflow-hidden">
              <div
                className={`h-full rounded-full transition-[width] duration-100 ease-linear ${
                  isMe ? "bg-accent" : "bg-muted"
                } ${finished ? "opacity-70" : ""}`}
                style={{ width: `${Math.min(100, pct)}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
