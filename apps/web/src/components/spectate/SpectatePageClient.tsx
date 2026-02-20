"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useSpectate } from "@/hooks/useSpectate";
import { ActiveRacesList } from "./ActiveRacesList";
import { SpectatorView } from "./SpectatorView";

export function SpectatePageClient() {
  const params = useSearchParams();
  const autoRaceId = params.get("raceId");
  const spectate = useSpectate();
  const autoWatchedRef = useRef(false);

  // Auto-watch from friends drawer deep link
  useEffect(() => {
    if (autoRaceId && spectate.phase === "browsing" && !autoWatchedRef.current) {
      autoWatchedRef.current = true;
      spectate.watchRace(autoRaceId);
    }
  }, [autoRaceId, spectate.phase, spectate.watchRace]);

  return (
    <div className="w-full">
      {spectate.error && (
        <div className="text-error text-sm mb-4 text-center">{spectate.error}</div>
      )}

      {(spectate.phase === "browsing" || spectate.phase === "connecting") && (
        <>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-bold text-text">Live Races</h1>
              <span className="text-xs text-muted/30 tabular-nums">
                {spectate.activeRaces.length} active
              </span>
            </div>
            <button
              onClick={spectate.refreshRaces}
              className="text-xs text-muted/40 hover:text-muted transition-colors flex items-center gap-1.5"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 4 23 10 17 10" />
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
              </svg>
              Refresh
            </button>
          </div>
          <ActiveRacesList
            races={spectate.activeRaces}
            onWatch={spectate.watchRace}
            onRefresh={spectate.refreshRaces}
            loading={spectate.phase === "connecting"}
          />
        </>
      )}

      {(spectate.phase === "watching" || spectate.phase === "finished") && spectate.raceState && (
        <SpectatorView
          raceState={spectate.raceState}
          progress={spectate.progress}
          spectators={spectate.spectators}
          spectatorCount={spectate.spectatorCount}
          watchedPlayerId={spectate.watchedPlayerId}
          onSetWatchedPlayer={spectate.setWatchedPlayer}
          onStop={spectate.stopWatching}
          finished={spectate.phase === "finished"}
          results={spectate.results}
        />
      )}
    </div>
  );
}
