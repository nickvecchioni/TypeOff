"use client";

import React from "react";
import { useSession } from "next-auth/react";
import { useRace } from "@/hooks/useRace";
import { QueueScreen } from "./QueueScreen";
import { CountdownOverlay } from "./CountdownOverlay";
import { RaceTrack } from "./RaceTrack";
import { RaceTypingArea } from "./RaceTypingArea";
import { RaceResults } from "./RaceResults";
import { PlacementReveal } from "./PlacementReveal";

export function RaceArena() {
  const { data: session, update: updateSession } = useSession();
  const race = useRace();

  // Derive own player ID from race state
  const myPlayerId = React.useMemo(() => {
    if (!race.raceState) return null;
    if (session?.user?.id) return session.user.id;
    // For guests, find the player whose id starts with "guest_"
    const players = race.raceState.players;
    const guest = players.find((p) => p.isGuest);
    return guest?.id ?? null;
  }, [race.raceState, session]);

  // Refresh session and dispatch ELO change event when race finishes
  const sessionRefreshed = React.useRef(false);
  React.useEffect(() => {
    const isFinished = race.phase === "finished" || race.phase === "placed";
    if (isFinished && !sessionRefreshed.current) {
      sessionRefreshed.current = true;
      if (session?.user?.id && race.results.length > 0) {
        const myResult = race.results.find((r) => r.playerId === session.user.id);
        if (myResult?.eloChange != null) {
          window.dispatchEvent(
            new CustomEvent("elo-change", { detail: { change: myResult.eloChange } })
          );
        }
        updateSession({});
      }
    } else if (!isFinished) {
      sessionRefreshed.current = false;
    }
  }, [race.phase, race.results, session?.user?.id, updateSession]);

  return (
    <div className="flex flex-col items-center gap-8 w-full max-w-3xl mx-auto">
      {race.error && (
        <div className="text-error text-sm">{race.error}</div>
      )}

      {(race.phase === "idle" || race.phase === "queuing") && (
        <QueueScreen
          isQueuing={race.phase === "queuing"}
          queueCount={race.queueCount}
          connected={race.connected}
          onJoin={race.joinQueue}
          onLeave={race.leaveQueue}
          isAuthenticated={!!session?.user}
        />
      )}

      {race.phase === "countdown" && race.raceState && (
        <CountdownOverlay
          countdown={race.countdown}
          playerCount={race.raceState.players.length}
          placementRace={race.raceState.placementRace}
        />
      )}

      {race.phase === "racing" && race.raceState && (
        <>
          {race.raceState.placementRace != null && (
            <div className="text-xs text-muted">
              Placement Race {race.raceState.placementRace} of 3
            </div>
          )}
          <RaceTrack
            players={race.raceState.players}
            progress={race.progress}
            myPlayerId={myPlayerId}
          />
          <RaceTypingArea
            seed={race.raceState.seed}
            wordCount={race.raceState.wordCount}
            onProgress={race.sendProgress}
            onFinish={race.sendFinish}
            disabled={false}
          />
        </>
      )}

      {race.phase === "finished" && (
        <RaceResults
          results={race.results}
          myPlayerId={myPlayerId}
          onRaceAgain={race.raceAgain}
          placementRace={race.placementRace}
          placementTotal={race.placementTotal}
        />
      )}

      {race.phase === "placed" && (() => {
        const myResult = race.results.find((r) => r.playerId === myPlayerId);
        const elo = myResult?.elo ?? 1000;
        return (
          <PlacementReveal
            elo={elo}
            onContinue={race.raceAgain}
          />
        );
      })()}
    </div>
  );
}
