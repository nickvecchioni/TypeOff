"use client";

import { useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSpectate } from "@/hooks/useSpectate";
import { SpectatorView } from "./SpectatorView";

export function SpectatePageClient() {
  const params = useSearchParams();
  const router = useRouter();
  const raceId = params.get("raceId");
  const spectate = useSpectate();
  const autoWatchedRef = useRef(false);

  // Redirect to home if no raceId — this page is now deep-link only
  useEffect(() => {
    if (!raceId) {
      router.replace("/");
    }
  }, [raceId, router]);

  // Auto-watch the requested race
  useEffect(() => {
    if (raceId && spectate.phase === "browsing" && !autoWatchedRef.current) {
      autoWatchedRef.current = true;
      spectate.watchRace(raceId);
    }
  }, [raceId, spectate.phase, spectate.watchRace]);

  if (!raceId) return null;

  return (
    <div className="w-full">
      {spectate.error && (
        <div className="text-error text-sm mb-4 text-center">{spectate.error}</div>
      )}

      {spectate.phase === "connecting" && (
        <div className="text-center py-16">
          <p className="text-muted text-sm">Connecting...</p>
        </div>
      )}

      {(spectate.phase === "watching" || spectate.phase === "finished") && spectate.raceState && (
        <SpectatorView
          raceState={spectate.raceState}
          progress={spectate.progress}
          spectators={spectate.spectators}
          spectatorCount={spectate.spectatorCount}
          watchedPlayerId={spectate.watchedPlayerId}
          followedUserId={spectate.followedUserId}
          onSetWatchedPlayer={spectate.setWatchedPlayer}
          onStop={spectate.stopWatching}
          finished={spectate.phase === "finished"}
          results={spectate.results}
        />
      )}
    </div>
  );
}
