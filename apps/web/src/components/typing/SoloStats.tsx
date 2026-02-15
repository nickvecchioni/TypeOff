"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";

interface PbRow {
  mode: string;
  duration: number;
  wordPool: string | null;
  wpm: number;
  time: number;
  createdAt: string;
}

interface RecentResult {
  id: string;
  mode: string;
  duration: number;
  wordPool: string | null;
  wpm: number;
  time: number;
  isPb: boolean;
  createdAt: string;
}

const TIMED_DURATIONS = [15, 30, 60, 120];
const WORD_DURATIONS = [10, 25, 50, 100];

export function SoloStats() {
  const { data: session } = useSession();
  const [pbs, setPbs] = useState<PbRow[]>([]);
  const [recent, setRecent] = useState<RecentResult[]>([]);

  const fetchData = useCallback(() => {
    if (!session?.user) return;

    fetch("/api/solo/pbs")
      .then((r) => r.json())
      .then(setPbs)
      .catch(() => {});

    fetch("/api/solo/results?limit=10")
      .then((r) => r.json())
      .then(setRecent)
      .catch(() => {});
  }, [session?.user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Listen for new results
  useEffect(() => {
    const handler = () => fetchData();
    window.addEventListener("solo-result-saved", handler);
    return () => window.removeEventListener("solo-result-saved", handler);
  }, [fetchData]);

  if (!session?.user) {
    return (
      <div className="w-full max-w-3xl mx-auto text-center text-muted/60 text-sm py-8">
        Sign in to track personal bests
      </div>
    );
  }

  const pbMap = new Map<string, PbRow>();
  for (const pb of pbs) {
    pbMap.set(`${pb.mode}:${pb.duration}`, pb);
  }

  return (
    <div className="w-full max-w-3xl mx-auto space-y-8">
      {/* Personal Bests Grid */}
      <div>
        <h2 className="text-lg font-bold text-text mb-4">Personal Bests</h2>
        <div className="space-y-4">
          {/* Timed */}
          <div>
            <div className="text-xs text-muted uppercase tracking-wider mb-2">Time</div>
            <div className="grid grid-cols-4 gap-3">
              {TIMED_DURATIONS.map((d) => {
                const pb = pbMap.get(`timed:${d}`);
                return (
                  <div
                    key={d}
                    className="rounded-lg bg-surface px-3 py-2.5 text-center"
                  >
                    <div className="text-xs text-muted mb-1">{d}s</div>
                    {pb ? (
                      <div className="text-lg font-bold text-accent tabular-nums">
                        {Math.round(pb.wpm)}
                      </div>
                    ) : (
                      <div className="text-lg text-muted/30">-</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Words */}
          <div>
            <div className="text-xs text-muted uppercase tracking-wider mb-2">Words</div>
            <div className="grid grid-cols-4 gap-3">
              {WORD_DURATIONS.map((d) => {
                const pb = pbMap.get(`wordcount:${d}`);
                return (
                  <div
                    key={d}
                    className="rounded-lg bg-surface px-3 py-2.5 text-center"
                  >
                    <div className="text-xs text-muted mb-1">{d}</div>
                    {pb ? (
                      <div className="text-lg font-bold text-accent tabular-nums">
                        {Math.round(pb.wpm)}
                      </div>
                    ) : (
                      <div className="text-lg text-muted/30">-</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Results */}
      {recent.length > 0 && (
        <div>
          <h2 className="text-lg font-bold text-text mb-4">Recent Results</h2>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-muted border-b border-surface">
                <th className="pb-2">Mode</th>
                <th className="pb-2 text-right">WPM</th>
                <th className="pb-2 text-right">Date</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-surface/50 text-text"
                >
                  <td className="py-2 text-muted">
                    {r.mode === "timed" ? `${r.duration}s` : `${r.duration} words`}
                    {r.isPb && (
                      <span className="ml-1.5 text-xs text-rank-gold font-bold">PB</span>
                    )}
                  </td>
                  <td className="py-2 text-right tabular-nums font-medium">
                    {Math.round(r.wpm)}
                  </td>
                  <td className="py-2 text-right text-muted">
                    {new Date(r.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
