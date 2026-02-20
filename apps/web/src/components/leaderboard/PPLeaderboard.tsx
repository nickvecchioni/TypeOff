"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { getXpLevel } from "@typeoff/shared";
import { CosmeticName } from "@/components/CosmeticName";
import { CosmeticBadge } from "@/components/CosmeticBadge";

interface PPEntry {
  userId: string;
  username: string | null;
  totalPp: number;
  avgWpm: number | null;
  maxWpm: number | null;
  racesPlayed: number | null;
  totalXp: number | null;
  activeBadge: string | null;
  activeNameColor: string | null;
  activeNameEffect: string | null;
  activeTitle: string | null;
}

interface PPLeaderboardProps {
  userId?: string;
}

export function PPLeaderboard({ userId }: PPLeaderboardProps) {
  const [entries, setEntries] = useState<PPEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/pp/leaderboard")
      .then((r) => r.json())
      .then((d) => setEntries(d.entries ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-12 rounded-lg bg-surface/30 animate-pulse" />
        ))}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="rounded-xl bg-surface/40 ring-1 ring-white/[0.04] py-16 text-center">
        <p className="text-muted text-sm">No PP scores recorded yet.</p>
      </div>
    );
  }

  const gridCols = "grid-cols-[2rem_1fr_4.5rem] sm:grid-cols-[2rem_1fr_4.5rem_5rem_5rem_3.5rem]";

  return (
    <div>
      {/* Header */}
      <div
        className={`grid ${gridCols} items-center gap-3 px-4 py-2 text-xs text-muted/60 uppercase tracking-wider border-b border-white/[0.04]`}
      >
        <span></span>
        <span>Player</span>
        <span className="text-right">PP</span>
        <span className="text-right hidden sm:block">Best WPM</span>
        <span className="text-right hidden sm:block">Avg WPM</span>
        <span className="text-right hidden sm:block">Races</span>
      </div>

      {/* Rows */}
      <div className="divide-y divide-white/[0.03]">
        {entries.map((entry, i) => {
          const isMe = userId === entry.userId;
          const rank = i + 1;
          const rankColor =
            rank === 1 ? "text-rank-gold" :
            rank === 2 ? "text-rank-silver" :
            rank === 3 ? "text-rank-bronze" :
            "text-muted/40";

          const rowBg = isMe
            ? "bg-accent/[0.05] ring-1 ring-accent/10"
            : rank <= 3
            ? "bg-surface/30"
            : "hover:bg-white/[0.02]";

          return (
            <Link
              key={entry.userId}
              href={`/profile/${entry.username}`}
              className={`grid ${gridCols} items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${rowBg}`}
            >
              <span className={`text-sm font-bold tabular-nums ${rankColor}`}>
                {rank}
              </span>
              <div className="flex items-center gap-2.5 min-w-0">
                <CosmeticBadge badge={entry.activeBadge} />
                <div className="flex flex-col min-w-0">
                  <span className={`truncate text-sm leading-tight ${isMe ? "font-bold" : ""}`}>
                    {isMe ? (
                      <CosmeticName nameColor={null} nameEffect={entry.activeNameEffect}>
                        <span className="text-accent">{entry.username}</span>
                      </CosmeticName>
                    ) : (
                      <CosmeticName nameColor={entry.activeNameColor} nameEffect={entry.activeNameEffect}>
                        {entry.username}
                      </CosmeticName>
                    )}
                    <span className="text-[10px] text-muted/40 ml-1.5 tabular-nums">Lv.{getXpLevel(entry.totalXp ?? 0).level}</span>
                  </span>
                  {entry.activeTitle && (
                    <span className="text-[10px] text-muted/40 leading-tight">{entry.activeTitle}</span>
                  )}
                </div>
              </div>
              <span className="text-sm tabular-nums text-right font-semibold text-purple-400">
                {Math.floor(entry.totalPp)}
              </span>
              <span className="text-sm text-muted tabular-nums text-right hidden sm:block">
                {entry.maxWpm != null ? entry.maxWpm.toFixed(2) : "-"}
              </span>
              <span className="text-sm text-muted/70 tabular-nums text-right hidden sm:block">
                {entry.avgWpm != null ? entry.avgWpm.toFixed(2) : "-"}
              </span>
              <span className="text-sm text-muted/50 tabular-nums text-right hidden sm:block">
                {entry.racesPlayed ?? 0}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
