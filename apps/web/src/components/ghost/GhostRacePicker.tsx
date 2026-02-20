"use client";

import React, { useEffect, useState } from "react";

interface PastRace {
  raceId: string;
  wpm: number;
  accuracy: number;
  mode: string;
  date: string;
  seed: number;
}

interface GhostRacePickerProps {
  onSelect: (raceId: string) => void;
  onRacePB?: () => void;
}

export function GhostRacePicker({ onSelect, onRacePB }: GhostRacePickerProps) {
  const [races, setRaces] = useState<PastRace[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/history?limit=20")
      .then((r) => r.json())
      .then((d) => setRaces(d.races ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-bold text-text">Select a Race to Ghost</h2>
        {onRacePB && (
          <button
            onClick={onRacePB}
            className="text-xs font-bold text-accent hover:text-accent/80 transition-colors"
          >
            Race your PB
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 rounded-lg bg-surface/30 animate-pulse" />
          ))}
        </div>
      ) : races.length === 0 ? (
        <p className="text-sm text-muted/40 text-center py-8">
          No past races with replay data found.
        </p>
      ) : (
        <div className="space-y-1">
          {races.map((race) => (
            <button
              key={race.raceId}
              onClick={() => onSelect(race.raceId)}
              className="w-full flex items-center justify-between px-4 py-2.5 rounded-lg bg-surface/40 ring-1 ring-white/[0.04] hover:bg-white/[0.04] transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-accent tabular-nums">
                  {Math.floor(race.wpm)} wpm
                </span>
                <span className="text-xs text-muted/40">
                  {Math.floor(race.accuracy)}%
                </span>
                <span className="text-xs text-muted/30 capitalize">
                  {race.mode}
                </span>
              </div>
              <span className="text-[10px] text-muted/30">
                {new Date(race.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
