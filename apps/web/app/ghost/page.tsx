"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { GhostRacePicker } from "@/components/ghost/GhostRacePicker";
import { GhostRaceArena } from "@/components/ghost/GhostRaceArena";
import type { ReplaySnapshot } from "@typeoff/shared";

interface GhostData {
  replayData: ReplaySnapshot[];
  seed: number;
  mode: string;
  wpm: number;
  accuracy: number;
  username: string;
}

export default function GhostPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [ghostData, setGhostData] = useState<GhostData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (status === "unauthenticated") {
    router.push("/");
    return null;
  }

  const loadGhost = async (raceId: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/ghost?raceId=${raceId}`);
      if (!res.ok) throw new Error("No replay data found");
      const data = await res.json();
      setGhostData(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const loadPB = async () => {
    if (!session?.user?.id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/ghost?userId=${session.user.id}`);
      if (!res.ok) throw new Error("No PB replay found. Play some races first!");
      const data = await res.json();
      setGhostData(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-8">
      <div className="max-w-3xl mx-auto animate-fade-in">
        <div className="mb-6">
          <h1 className="text-lg font-black text-text uppercase tracking-wider">
            Ghost Race
          </h1>
          <p className="text-xs text-muted/50 mt-0.5">
            Race against a replay of a past performance
          </p>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
          </div>
        )}

        {error && (
          <div className="text-center py-8">
            <p className="text-sm text-error mb-4">{error}</p>
            <button
              onClick={() => { setError(null); setGhostData(null); }}
              className="text-xs text-accent hover:text-accent/80 transition-colors"
            >
              Try again
            </button>
          </div>
        )}

        {!loading && !error && !ghostData && (
          <GhostRacePicker onSelect={loadGhost} onRacePB={loadPB} />
        )}

        {!loading && !error && ghostData && (
          <GhostRaceArena
            replayData={ghostData.replayData}
            seed={ghostData.seed}
            mode={ghostData.mode}
            ghostName={ghostData.username}
            ghostWpm={ghostData.wpm}
            onBack={() => setGhostData(null)}
          />
        )}
      </div>
    </main>
  );
}
