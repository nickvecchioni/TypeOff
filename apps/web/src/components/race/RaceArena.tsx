"use client";

import React from "react";
import { useSession } from "next-auth/react";
import { useRace } from "@/hooks/useRace";
import { QueueScreen } from "./QueueScreen";
import { CountdownOverlay } from "./CountdownOverlay";
import { RaceTrack } from "./RaceTrack";
import { RaceTypingArea } from "./RaceTypingArea";
import { RaceResults } from "./RaceResults";

export function RaceArena() {
  const { data: session } = useSession();
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
        />
      )}

      {race.phase === "racing" && race.raceState && (
        <>
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
          onRaceAgain={race.reset}
        />
      )}
    </div>
  );
}
