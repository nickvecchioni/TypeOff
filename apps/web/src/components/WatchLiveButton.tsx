"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSocket } from "@/hooks/useSocket";

// Module-level cache shared across all instances on the page
let cachedMap = new Map<string, string>(); // userId -> raceId
let lastEmit = 0;
const EMIT_INTERVAL = 10_000;

/**
 * Hook that checks if a user is currently in an active race.
 * Uses module-level deduplication so 100 instances on a page
 * only trigger one `listActiveRaces` socket emission.
 */
function useActiveRacer(userId: string): string | null {
  const { connected, emit, on } = useSocket();
  const [raceId, setRaceId] = useState<string | null>(
    cachedMap.get(userId) ?? null,
  );

  useEffect(() => {
    if (!connected) return;

    const now = Date.now();
    if (now - lastEmit > EMIT_INTERVAL) {
      lastEmit = now;
      emit("listActiveRaces");
    } else {
      setRaceId(cachedMap.get(userId) ?? null);
    }

    const unsub = on("activeRaces", (data: { races: Array<{ raceId: string; players: Array<{ id: string }> }> }) => {
      cachedMap = new Map();
      for (const race of data.races) {
        for (const player of race.players) {
          cachedMap.set(player.id, race.raceId);
        }
      }
      setRaceId(cachedMap.get(userId) ?? null);
    });

    return unsub;
  }, [connected, emit, on, userId]);

  return raceId;
}

/**
 * Full "Watch Live" button for profile pages and standalone contexts.
 * Renders a link to /spectate?raceId=... or nothing if user isn't racing.
 */
export function WatchLiveButton({ userId }: { userId: string }) {
  const raceId = useActiveRacer(userId);
  if (!raceId) return null;

  return (
    <Link
      href={`/spectate?raceId=${raceId}`}
      className="flex items-center gap-1.5 text-xs font-bold text-accent/80 hover:text-accent px-2.5 py-1 rounded-md border border-accent/20 hover:border-accent/40 hover:bg-accent/10 transition-all"
    >
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-50" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-accent" />
      </span>
      Watch Live
    </Link>
  );
}

/**
 * Inline "LIVE" badge for use inside leaderboard rows or other
 * contexts where a parent <Link> already exists (avoids nested <a>).
 * Replaces the online status dot with a pulsing LIVE indicator.
 */
export function LiveBadge({ userId }: { userId: string }) {
  const raceId = useActiveRacer(userId);
  if (!raceId) return null;

  return (
    <span className="flex items-center gap-1 text-[11px] font-bold text-accent uppercase tracking-wider">
      <span className="relative flex h-1.5 w-1.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-50" />
        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-accent" />
      </span>
      Live
    </span>
  );
}
