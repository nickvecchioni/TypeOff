"use client";

import React, { useEffect, useState } from "react";

interface TextLeaderboardEntry {
  userId: string;
  username: string | null;
  bestWpm: number;
  bestAccuracy: number;
  pp: number;
}

interface TextLeaderboardProps {
  seed: number;
  mode: string;
  limit?: number;
}

export function TextLeaderboard({ seed, mode, limit = 10 }: TextLeaderboardProps) {
  const [entries, setEntries] = useState<TextLeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/text-leaderboard?seed=${seed}&mode=${mode}&limit=${limit}`)
      .then((r) => r.json())
      .then((d) => setEntries(d.entries ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [seed, mode, limit]);

  if (loading) {
    return <div className="h-20 rounded-lg bg-surface/30 animate-pulse" />;
  }

  if (entries.length === 0) {
    return null;
  }

  return (
    <div className="rounded-lg bg-surface/40 ring-1 ring-white/[0.04] overflow-hidden">
      <div className="px-3 py-2 border-b border-white/[0.04]">
        <span className="text-xs uppercase tracking-wider text-muted/65 font-bold">
          Text Leaderboard
        </span>
      </div>
      <div>
        {entries.map((entry, i) => {
          const rankColor =
            i === 0 ? "text-rank-gold" :
            i === 1 ? "text-rank-silver" :
            i === 2 ? "text-rank-bronze" :
            "text-muted/60";

          return (
            <div key={entry.userId} className="flex items-center gap-3 px-3 py-1.5">
              <span className={`text-xs font-bold tabular-nums w-4 text-right ${rankColor}`}>
                {i + 1}
              </span>
              <span className="text-xs text-text truncate flex-1">
                {entry.username ?? "Unknown"}
              </span>
              <span className="text-xs font-bold text-text tabular-nums">
                {Math.floor(entry.bestWpm)}
              </span>
              <span className="text-xs text-muted/60 tabular-nums w-10 text-right">
                {Math.floor(entry.bestAccuracy)}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
