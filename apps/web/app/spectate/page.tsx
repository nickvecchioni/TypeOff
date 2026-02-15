"use client";

import React, { useEffect } from "react";
import { useSpectator } from "@/hooks/useSpectator";
import { SpectatorView } from "@/components/race/SpectatorView";

export default function SpectatePage() {
  const spectator = useSpectator();

  // Auto-fetch races on mount and refresh every 3s
  useEffect(() => {
    if (spectator.connected) {
      spectator.listRaces();
    }
  }, [spectator.connected]);

  useEffect(() => {
    if (spectator.phase !== "browsing") return;
    const interval = setInterval(() => {
      spectator.listRaces();
    }, 3000);
    return () => clearInterval(interval);
  }, [spectator.phase]);

  return (
    <main className="flex-1 flex flex-col items-center justify-center px-4 pb-16">
      {spectator.phase === "watching" && spectator.raceState ? (
        <SpectatorView
          raceState={spectator.raceState}
          progress={spectator.progress}
          onStop={spectator.stopWatching}
        />
      ) : (
        <div className="flex flex-col items-center gap-6 w-full max-w-lg animate-fade-in">
          <div className="flex flex-col items-center gap-2">
            <h1 className="text-2xl font-bold text-text">Watch Races</h1>
            <p className="text-sm text-muted">
              Spectate live races in real-time
            </p>
          </div>

          {spectator.activeRaces.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-8">
              <span className="text-muted text-sm">
                No active races right now
              </span>
              <span className="text-xs text-muted">
                Races will appear here automatically
              </span>
            </div>
          ) : (
            <div className="w-full flex flex-col gap-3">
              {spectator.activeRaces.map((race) => (
                <div
                  key={race.raceId}
                  className="flex items-center justify-between bg-surface rounded-lg px-4 py-3"
                >
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-correct animate-pulse" />
                      <span className="text-sm text-text font-bold">
                        {race.players.length} players
                      </span>
                      <span className="text-xs text-muted capitalize">
                        {race.status}
                      </span>
                    </div>
                    <div className="text-xs text-muted">
                      {race.players.map((p) => p.name).join(", ")}
                    </div>
                  </div>
                  <button
                    onClick={() => spectator.watchRace(race.raceId)}
                    className="rounded-lg bg-accent/20 text-accent px-4 py-1.5 text-sm font-bold hover:bg-accent/30 transition-colors"
                  >
                    Watch
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </main>
  );
}
