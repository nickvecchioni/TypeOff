"use client";

import { useState } from "react";
import Link from "next/link";

interface FeaturedRaceProps {
  raceId: string;
  wpm: number;
  accuracy: number;
  placement: number;
  playerCount: number;
  finishedAt: string;
  modeCategory: string | null;
}

export function FeaturedRace({ race }: { race: FeaturedRaceProps }) {
  const modeLabels: Record<string, string> = {
    words: "Words",
    special: "Mixed",
    quotes: "Quotes",
    code: "Code",
  };

  return (
    <Link
      href={`/races/${race.raceId}`}
      className="flex items-center justify-between rounded-xl bg-surface/40 ring-1 ring-accent/10 px-4 py-3 hover:ring-accent/25 hover:bg-surface/60 transition-all group"
    >
      <div className="flex items-center gap-3">
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="text-accent/50 group-hover:text-accent transition-colors shrink-0"
        >
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-accent tabular-nums">
              {Math.floor(race.wpm)}
              <span className="text-[0.7em] opacity-50">
                .{(race.wpm % 1).toFixed(2).slice(2)}
              </span>
              <span className="text-xs font-normal text-muted/50 ml-1">WPM</span>
            </span>
            <span className="text-xs text-muted/40">
              {race.accuracy.toFixed(1)}% acc
            </span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-muted/50">
              {ordinal(race.placement)} of {race.playerCount}
            </span>
            {race.modeCategory && (
              <span className="text-xs text-muted/35">
                {modeLabels[race.modeCategory] ?? race.modeCategory}
              </span>
            )}
          </div>
        </div>
      </div>
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-muted/20 group-hover:text-accent/50 transition-colors shrink-0"
      >
        <path d="M9 18l6-6-6-6" />
      </svg>
    </Link>
  );
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export function FeaturedRaceSelector({
  currentRaceId,
  recentRaces,
}: {
  currentRaceId: string | null;
  recentRaces: Array<{
    raceId: string;
    wpm: number;
    accuracy: number;
    placement: number;
    playerCount: number;
    finishedAt: string;
  }>;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState(currentRaceId);

  async function setFeaturedRace(raceId: string | null) {
    setSaving(true);
    try {
      const res = await fetch("/api/profile/featured-race", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raceId }),
      });
      if (res.ok) {
        setSelected(raceId);
        setOpen(false);
        window.location.reload();
      }
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs text-muted/40 hover:text-accent transition-colors"
      >
        {selected ? "Change" : "Pin a race"}
      </button>
    );
  }

  return (
    <div className="rounded-xl bg-surface/50 ring-1 ring-white/[0.06] p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-muted/50 uppercase tracking-widest">
          Select Featured Race
        </span>
        <button
          onClick={() => setOpen(false)}
          className="text-muted/30 hover:text-muted/60 transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
      <div className="space-y-1 max-h-48 overflow-y-auto">
        {recentRaces.map((race) => (
          <button
            key={race.raceId}
            onClick={() => setFeaturedRace(race.raceId)}
            disabled={saving}
            className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-left transition-all ${
              race.raceId === selected
                ? "bg-accent/[0.08] ring-1 ring-accent/20"
                : "bg-surface/30 ring-1 ring-white/[0.04] hover:ring-accent/15"
            } disabled:opacity-50`}
          >
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-text tabular-nums">
                {Math.floor(race.wpm)} WPM
              </span>
              <span className="text-xs text-muted/50">
                {race.accuracy.toFixed(1)}%
              </span>
            </div>
            <span className="text-xs text-muted/40" suppressHydrationWarning>
              {new Date(race.finishedAt).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              })}
            </span>
          </button>
        ))}
      </div>
      {selected && (
        <button
          onClick={() => setFeaturedRace(null)}
          disabled={saving}
          className="text-xs text-error/60 hover:text-error transition-colors disabled:opacity-50"
        >
          Remove featured race
        </button>
      )}
    </div>
  );
}
