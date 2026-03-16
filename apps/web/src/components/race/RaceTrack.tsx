"use client";

import React from "react";
import type { RacePlayer, RacePlayerProgress } from "@typeoff/shared";
import { getRankTier } from "@typeoff/shared";
import { RankBadge } from "@/components/RankBadge";
import { CosmeticName } from "@/components/CosmeticName";
import { CosmeticBadge } from "@/components/CosmeticBadge";
interface RaceTrackProps {
  players: RacePlayer[];
  progress: Record<string, RacePlayerProgress>;
  myPlayerId: string | null;
}

export function RaceTrack({ players, progress, myPlayerId }: RaceTrackProps) {
  // Sort: other players first (preserving order), current user always last
  const sorted = [...players].sort((a, b) => {
    const aMe = a.id === myPlayerId ? 1 : 0;
    const bMe = b.id === myPlayerId ? 1 : 0;
    return aMe - bMe;
  });

  return (
    <div className="flex flex-col gap-2 w-full">
      {sorted.map((player) => {
        const p = progress[player.id];
        const pct = (p?.progress ?? 0) * 100;
        const isMe = player.id === myPlayerId;
        const isBot = player.id.startsWith("bot_");
        const finished = p?.finished ?? false;
        const wpm = finished && p?.finalStats ? p.finalStats.wpm : (p?.wpm ?? 0);

        return (
          <div key={player.id} className="relative flex flex-col gap-1">
            <div className="flex justify-between text-sm">
              <span className={`flex items-center gap-2 min-w-0 ${isMe ? "text-accent font-bold" : "text-text"}`}>
                {!isBot && <RankBadge tier={getRankTier(player.elo)} />}
                {!isBot && <CosmeticBadge badge={player.activeBadge} />}
                <span className="truncate">
                  {isBot ? (
                    player.name
                  ) : isMe ? (
                    <CosmeticName nameColor={null} nameEffect={player.activeNameEffect}>
                      {player.name}
                    </CosmeticName>
                  ) : (
                    <CosmeticName nameColor={player.activeNameColor} nameEffect={player.activeNameEffect}>
                      {player.name}
                    </CosmeticName>
                  )}
                </span>
                {isBot && <span className="text-xs text-muted bg-surface rounded px-1.5 py-0.5 font-normal">BOT</span>}
                {!isBot && player.isPro && <span className="text-xs font-bold text-accent/70 bg-accent/[0.08] rounded px-1.5 py-0.5">PRO</span>}
                {isMe && " (you)"}
                {finished && p?.placement && ` #${p.placement}`}
              </span>
              {finished && (
                <span className="text-muted tabular-nums">
                  {Math.floor(wpm)}
                  <span className="text-[0.75em] opacity-70">.{wpm.toFixed(2).split(".")[1]}</span>
                  {" "}wpm
                </span>
              )}
            </div>
            <div className="h-3 rounded-full bg-surface-bright/50 overflow-hidden">
              <div
                className={`h-full rounded-full transition-[width] duration-100 ease-linear ${
                  isMe ? "bg-accent" : "bg-muted/60"
                } ${finished ? "opacity-70" : ""}`}
                style={{
                  width: `${Math.min(100, pct)}%`,
                  ...(isMe && !finished ? { boxShadow: "0 0 12px rgba(96, 165, 250, 0.3)" } : {}),
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
