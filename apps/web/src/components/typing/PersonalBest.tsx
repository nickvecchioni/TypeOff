"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import type { TestConfig } from "@typeoff/shared";

interface PbRow {
  mode: string;
  duration: number;
  wpm: number;
}

export function PersonalBest({ config }: { config: TestConfig }) {
  const { data: session } = useSession();
  const [pb, setPb] = useState<number | null>(null);

  const fetchPb = useCallback(() => {
    if (!session?.user) return;

    fetch("/api/solo/pbs")
      .then((r) => r.json())
      .then((rows: PbRow[]) => {
        const match = rows.find(
          (r) => r.mode === config.mode && r.duration === config.duration
        );
        setPb(match ? Math.round(match.wpm) : null);
      })
      .catch(() => {});
  }, [session?.user, config.mode, config.duration]);

  useEffect(() => {
    fetchPb();
  }, [fetchPb]);

  // Refetch when a new result is saved
  useEffect(() => {
    const handler = () => fetchPb();
    window.addEventListener("solo-result-saved", handler);
    return () => window.removeEventListener("solo-result-saved", handler);
  }, [fetchPb]);

  if (!session?.user) return null;

  return (
    <div className="text-sm text-muted tabular-nums">
      pb: <span className="text-text">{pb !== null ? `${pb} wpm` : "n/a"}</span>
    </div>
  );
}
