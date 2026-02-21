"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { DailyArena } from "@/components/daily/DailyArena";

interface DailyData {
  challenge: {
    id: string;
    date: string;
    seed: number;
    mode: string;
    wordCount: number;
  };
  leaderboard: Array<{
    userId: string;
    username: string | null;
    wpm: number;
    rawWpm: number;
    accuracy: number;
    attempts: number;
  }>;
  myResult: { wpm: number; rawWpm: number; accuracy: number; attempts: number } | null;
  nextDailyAt: number;
}

export default function DailyPage() {
  const { status } = useSession();
  const [data, setData] = useState<DailyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "loading") return;

    fetch("/api/daily")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load daily challenge");
        return r.json();
      })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [status]);

  if (status === "loading" || loading) {
    return (
      <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-8">
        <div className="max-w-3xl mx-auto space-y-4">
          <div className="h-8 w-48 rounded bg-surface/40 animate-pulse" />
          <div className="h-32 rounded-xl bg-surface/30 animate-pulse" />
          <div className="h-48 rounded-xl bg-surface/30 animate-pulse" />
        </div>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <p className="text-sm text-error">{error ?? "Failed to load daily challenge"}</p>
      </main>
    );
  }

  return (
    <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-8">
      <div className="max-w-3xl mx-auto animate-fade-in">
        <DailyArena
          challenge={data.challenge}
          leaderboard={data.leaderboard}
          myResult={data.myResult}
          nextDailyAt={data.nextDailyAt}
        />
      </div>
    </main>
  );
}
