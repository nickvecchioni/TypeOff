"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { getXpLevel, TITLE_TEXTS } from "@typeoff/shared";
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

  const gridCols = "grid-cols-[2rem_1fr_4.5rem] sm:grid-cols-[2.5rem_1fr_5rem_5.5rem_5.5rem_4rem]";

  return (
    <div>
      {/* Header */}
      <div
        className={`grid ${gridCols} items-center gap-3 px-4 py-2.5 text-xs text-muted/60 uppercase tracking-wider border-b border-white/[0.04]`}
      >
        <span></span>
        <span>Player</span>
        <span className="text-right">PP</span>
        <span className="text-right hidden sm:block">Avg WPM</span>
        <span className="text-right hidden sm:block">Best WPM</span>
        <span className="text-right hidden sm:block">Races</span>
      </div>

      {/* Rows */}
      <div>
        {entries.map((entry, i) => {
          const isMe = userId === entry.userId;
          const rank = i + 1;
          const rankColor =
            rank === 1 ? "text-rank-gold" :
            rank === 2 ? "text-rank-silver" :
            rank === 3 ? "text-rank-bronze" :
            "text-muted/60";

          const rowBg = isMe
            ? "bg-accent/[0.05] ring-1 ring-accent/10"
            : rank <= 3
            ? "bg-surface/30"
            : "hover:bg-white/[0.02]";

          return (
            <Link
              key={entry.userId}
              href={`/profile/${entry.username}`}
              className={`grid ${gridCols} items-center gap-3 px-4 py-3 rounded-lg transition-colors ${rowBg}`}
            >
              <span className={`text-base font-bold tabular-nums ${rankColor}`}>
                {rank}
              </span>
              <div className="flex items-center gap-2.5 min-w-0">
                <span className={`text-base truncate ${isMe ? "font-bold" : ""}`}>
                  {isMe ? (
                    <CosmeticName nameColor={null} nameEffect={entry.activeNameEffect}>
                      <span className="text-accent">{entry.username}</span>
                    </CosmeticName>
                  ) : (
                    <CosmeticName nameColor={entry.activeNameColor} nameEffect={entry.activeNameEffect}>
                      {entry.username}
                    </CosmeticName>
                  )}
                </span>
                <span className="text-xs font-bold text-accent/70 tabular-nums bg-accent/[0.08] px-1.5 py-0.5 rounded shrink-0">{getXpLevel(entry.totalXp ?? 0).level}</span>
                {entry.activeTitle && (
                  <span className="text-xs text-muted/50 shrink-0 hidden sm:inline">{TITLE_TEXTS[entry.activeTitle] ?? entry.activeTitle}</span>
                )}
                <CosmeticBadge badge={entry.activeBadge} />
              </div>
              <span className="text-base tabular-nums text-right font-semibold text-purple-400">
                {Math.floor(entry.totalPp)}
              </span>
              <span className="text-base text-muted/70 tabular-nums text-right hidden sm:block">
                {entry.avgWpm != null ? entry.avgWpm.toFixed(2) : "-"}
              </span>
              <span className="text-base text-muted tabular-nums text-right hidden sm:block">
                {entry.maxWpm != null ? entry.maxWpm.toFixed(2) : "-"}
              </span>
              <span className="text-base text-muted/65 tabular-nums text-right hidden sm:block">
                {entry.racesPlayed ?? 0}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
