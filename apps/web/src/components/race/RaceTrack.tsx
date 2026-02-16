"use client";

import React from "react";
import type { RacePlayer, RacePlayerProgress } from "@typeoff/shared";
import { getRankTier } from "@typeoff/shared";
import { RankBadge } from "@/components/RankBadge";

interface RaceTrackProps {
  players: RacePlayer[];
  progress: Record<string, RacePlayerProgress>;
  myPlayerId: string | null;
  isPlacement?: boolean;
}

export function RaceTrack({ players, progress, myPlayerId, isPlacement }: RaceTrackProps) {
  // Sort by progress descending
  const sorted = [...players].sort((a, b) => {
    const pa = progress[a.id]?.progress ?? 0;
    const pb = progress[b.id]?.progress ?? 0;
    return pb - pa;
  });

  return (
    <div className="flex flex-col gap-2 w-full">
      {sorted.map((player) => {
        const p = progress[player.id];
        const pct = (p?.progress ?? 0) * 100;
        const isMe = player.id === myPlayerId;
        const isBot = player.id.startsWith("bot_");
        const wpm = p?.wpm ?? 0;
        const finished = p?.finished ?? false;

        return (
          <div key={player.id} className="flex flex-col gap-1">
            <div className="flex justify-between text-sm">
              <span className={`flex items-center gap-2 ${isMe ? "text-accent font-bold" : "text-text"}`}>
                {!isPlacement && !isBot && <RankBadge tier={getRankTier(player.elo)} />}
                {player.name}
                {isBot && <span className="text-xs text-muted bg-surface rounded px-1.5 py-0.5 font-normal">BOT</span>}
                {isMe && " (you)"}
                {finished && p?.placement && ` #${p.placement}`}
              </span>
              <span className="text-muted tabular-nums">{wpm} wpm</span>
            </div>
            <div className="h-3 rounded-full bg-surface-bright/50 overflow-hidden">
              <div
                className={`h-full rounded-full transition-[width] duration-100 ease-linear ${
                  isMe ? "bg-accent" : "bg-muted/60"
                } ${finished ? "opacity-70" : ""}`}
                style={{
                  width: `${Math.min(100, pct)}%`,
                  ...(isMe && !finished ? { boxShadow: "0 0 12px rgba(125, 211, 252, 0.3)" } : {}),
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
