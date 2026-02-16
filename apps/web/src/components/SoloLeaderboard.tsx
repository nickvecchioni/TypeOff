"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";

interface LeaderboardRow {
  rank: number;
  userId: string;
  username: string;
  wpm: number;
  createdAt: string;
}

const MODES = [
  { value: "timed", label: "Time" },
  { value: "wordcount", label: "Words" },
] as const;

const DURATIONS: Record<string, number[]> = {
  timed: [15, 30, 60, 120],
  wordcount: [10, 25, 50, 100],
};

const PODIUM_COLORS = ["text-rank-gold", "text-rank-silver", "text-rank-bronze"];

export function SoloLeaderboard() {
  const { data: session } = useSession();
  const [mode, setMode] = useState("timed");
  const [duration, setDuration] = useState(30);
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/solo/leaderboard?mode=${mode}&duration=${duration}`)
      .then((r) => r.json())
      .then((data) => {
        setRows(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [mode, duration]);

  // Reset duration when mode changes
  useEffect(() => {
    setDuration(DURATIONS[mode][1]); // default to 2nd option (30s or 25 words)
  }, [mode]);

  return (
    <div>
      {/* Mode/Duration selectors */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex gap-1 rounded-lg bg-surface p-1">
          {MODES.map((m) => (
            <button
              key={m.value}
              onClick={() => setMode(m.value)}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                mode === m.value
                  ? "bg-accent text-bg font-bold"
                  : "text-muted hover:text-text"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
        <div className="flex gap-1 rounded-lg bg-surface p-1">
          {DURATIONS[mode].map((d) => (
            <button
              key={d}
              onClick={() => setDuration(d)}
              className={`px-3 py-1 text-sm rounded-md transition-colors tabular-nums ${
                duration === d
                  ? "bg-accent text-bg font-bold"
                  : "text-muted hover:text-text"
              }`}
            >
              {mode === "timed" ? `${d}s` : d}
            </button>
          ))}
        </div>
      </div>

      {/* Leaderboard rows */}
      <div className="space-y-1">
        <div className="grid grid-cols-[2.5rem_1fr_4rem_6rem] items-center gap-4 px-5 py-2 text-xs text-muted uppercase tracking-wider">
          <span>#</span>
          <span>Player</span>
          <span className="text-right">Wpm</span>
          <span className="text-right">Date</span>
        </div>
        {loading ? (
          <div className="py-12 text-center text-muted">Loading...</div>
        ) : rows.length === 0 ? (
          <div className="py-12 text-center text-muted">
            No results yet. Be the first!
          </div>
        ) : (
          rows.map((row) => {
            const isMe = session?.user?.id === row.userId;
            const podiumColor =
              row.rank <= 3 ? PODIUM_COLORS[row.rank - 1] : "text-muted";

            return (
              <Link
                key={row.userId}
                href={`/profile/${row.username}`}
                className={`grid grid-cols-[2.5rem_1fr_4rem_6rem] items-center gap-4 rounded-lg px-5 py-3.5 transition-colors ${
                  isMe
                    ? "bg-accent/10 ring-1 ring-accent/20"
                    : "bg-surface hover:bg-surface/80"
                }`}
              >
                <span
                  className={`text-sm font-bold ${podiumColor} tabular-nums`}
                >
                  {row.rank}
                </span>
                <span
                  className={`truncate text-sm font-medium ${
                    isMe ? "text-accent" : "text-text"
                  }`}
                >
                  {row.username}
                </span>
                <span className="text-sm font-bold text-text tabular-nums text-right">
                  {Math.round(row.wpm)}
                </span>
                <span className="text-sm text-muted/60 text-right">
                  {new Date(row.createdAt).toLocaleDateString()}
                </span>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
