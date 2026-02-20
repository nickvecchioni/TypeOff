"use client";

import React from "react";
import Link from "next/link";

interface DailyEntry {
  userId: string;
  username: string | null;
  wpm: number;
  rawWpm: number;
  accuracy: number;
  attempts: number;
}

interface DailyLeaderboardProps {
  entries: DailyEntry[];
  myUserId?: string | null;
}

export function DailyLeaderboard({ entries, myUserId }: DailyLeaderboardProps) {
  if (entries.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-muted/40">
        No completions yet. Be the first!
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-surface/40 ring-1 ring-white/[0.04] overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-[2rem_1fr_4rem_3rem_3rem] items-center gap-2 px-3 py-2 text-[10px] text-muted/50 uppercase tracking-wider border-b border-white/[0.04]">
        <span></span>
        <span>Player</span>
        <span className="text-right">WPM</span>
        <span className="text-right">Acc</span>
        <span className="text-right">Tries</span>
      </div>

      {/* Rows */}
      <div className="divide-y divide-white/[0.03]">
        {entries.map((entry, i) => {
          const isMe = myUserId === entry.userId;
          const rankColor =
            i === 0 ? "text-rank-gold" :
            i === 1 ? "text-rank-silver" :
            i === 2 ? "text-rank-bronze" :
            "text-muted/40";

          return (
            <Link
              key={entry.userId}
              href={`/profile/${entry.username}`}
              className={`grid grid-cols-[2rem_1fr_4rem_3rem_3rem] items-center gap-2 px-3 py-2 transition-colors ${
                isMe ? "bg-accent/[0.05]" : "hover:bg-white/[0.02]"
              }`}
            >
              <span className={`text-xs font-bold tabular-nums ${rankColor}`}>
                {i + 1}
              </span>
              <span className={`text-sm truncate ${isMe ? "text-accent font-bold" : "text-text"}`}>
                {entry.username ?? "Unknown"}
              </span>
              <span className="text-sm font-bold text-text tabular-nums text-right">
                {Math.floor(entry.wpm)}
              </span>
              <span className="text-xs text-muted/50 tabular-nums text-right">
                {Math.floor(entry.accuracy)}%
              </span>
              <span className="text-xs text-muted/40 tabular-nums text-right">
                {entry.attempts}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
