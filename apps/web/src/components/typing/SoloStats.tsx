"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";

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

export function SoloStats() {
  const { data: session } = useSession();
  const [recent, setRecent] = useState<RecentResult[]>([]);

  const fetchData = useCallback(() => {
    if (!session?.user) return;

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
        Sign in to track results
      </div>
    );
  }

  if (recent.length === 0) return null;

  return (
    <div className="w-full max-w-3xl mx-auto">
      <h2 className="text-xs font-bold text-muted uppercase tracking-wider mb-3">Recent Results</h2>
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
  );
}
