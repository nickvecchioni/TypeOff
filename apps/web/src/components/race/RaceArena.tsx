"use client";

import React from "react";
import { useSession } from "next-auth/react";
import { useRace } from "@/hooks/useRace";
import { useParty } from "@/hooks/useParty";
import { QueueScreen } from "./QueueScreen";
import { CountdownOverlay } from "./CountdownOverlay";
import { RaceTrack } from "./RaceTrack";
import { RaceTypingArea } from "./RaceTypingArea";
import { RaceResults } from "./RaceResults";
import { PlacementReveal } from "./PlacementReveal";
import { PartyInviteToast } from "@/components/social/PartyInviteToast";
import { getRankInfo } from "@typeoff/shared";
import type { RankTier } from "@typeoff/shared";

const TIER_ORDER: RankTier[] = [
  "bronze", "silver", "gold", "platinum", "diamond", "master", "grandmaster",
];

function rankValue(tier: RankTier, division: number | null): number {
  return TIER_ORDER.indexOf(tier) * 3 + (3 - (division ?? 0));
}

export function RaceArena() {
  const { data: session, update: updateSession } = useSession();
  const race = useRace();
  const partyHook = useParty();

  const myPlayerId = session?.user?.id ?? null;

  // Delay showing the queue screen so fast matches (placements) skip it
  const [showQueuing, setShowQueuing] = React.useState(false);
  React.useEffect(() => {
    if (race.phase === "queuing") {
      const timer = setTimeout(() => setShowQueuing(true), 600);
      return () => clearTimeout(timer);
    }
    setShowQueuing(false);
  }, [race.phase]);

  // Track transition from countdown → racing with a brief "GO!" hold
  const [showGo, setShowGo] = React.useState(false);
  const prevPhaseRef = React.useRef(race.phase);

  React.useEffect(() => {
    const prev = prevPhaseRef.current;
    prevPhaseRef.current = race.phase;

    if (prev === "countdown" && race.phase === "racing") {
      setShowGo(true);
      const timer = setTimeout(() => setShowGo(false), 600);
      return () => clearTimeout(timer);
    } else if (race.phase !== "racing") {
      setShowGo(false);
    }
  }, [race.phase]);

  // Refresh session when race finishes
  const sessionRefreshed = React.useRef(false);
  const [rankChange, setRankChange] = React.useState<{
    direction: "up" | "down";
    newLabel: string;
    newTier: RankTier;
  } | null>(null);

  React.useEffect(() => {
    const isFinished = race.phase === "finished" || race.phase === "placed";
    if (isFinished && !sessionRefreshed.current) {
      sessionRefreshed.current = true;
      if (session?.user?.id && race.results.length > 0) {
        const myResult = race.results.find((r) => r.playerId === session.user.id);
        if (myResult?.eloChange != null) {
          window.dispatchEvent(
            new CustomEvent("elo-change", {
              detail: { change: myResult.eloChange },
            })
          );
        }
        // Compute rank change for inline display
        if (myResult?.elo != null && myResult.eloChange != null && session.user.rankTier) {
          const oldElo = myResult.elo - myResult.eloChange;
          const oldInfo = getRankInfo(oldElo);
          const newInfo = getRankInfo(myResult.elo);
          const oldVal = rankValue(oldInfo.tier, oldInfo.division);
          const newVal = rankValue(newInfo.tier, newInfo.division);
          if (newVal !== oldVal) {
            setRankChange({
              direction: newVal > oldVal ? "up" : "down",
              newLabel: newInfo.label,
              newTier: newInfo.tier,
            });
          } else {
            setRankChange(null);
          }
        }
        updateSession({});
      }
    } else if (!isFinished) {
      sessionRefreshed.current = false;
      setRankChange(null);
    }
  }, [race.phase, race.results, session?.user?.id, updateSession]);

  const isInPlacement = race.raceState?.placementRace != null
    || race.phase === "placed"
    || (race.phase === "finished" && race.placementRace != null);

  return (
    <div className="flex flex-col items-center gap-8 w-full max-w-4xl mx-auto">
      {race.error && (
        <div className="text-error text-sm">{race.error}</div>
      )}

      {(race.phase === "idle" || (race.phase === "queuing" && showQueuing)) && (
        <QueueScreen
          isQueuing={race.phase === "queuing"}
          queueCount={race.queueCount}
          queueElapsed={race.queueElapsed}
          maxWaitSeconds={race.maxWaitSeconds}
          connected={race.connected}
          onJoin={race.joinQueue}
          onLeave={race.leaveQueue}
          party={partyHook.party}
          partyError={partyHook.error}
          onCreateParty={partyHook.createParty}
          onInviteToParty={partyHook.inviteToParty}
          onKickFromParty={partyHook.kickMember}
          onLeaveParty={partyHook.leaveParty}
        />
      )}

      {(race.phase === "countdown" || race.phase === "racing") && race.raceState && (
        <div
          className="flex flex-col items-center gap-8 w-full"
          style={{ animation: "fade-in-up 0.4s ease-out both" }}
        >
          <RaceTrack
            players={race.raceState.players}
            progress={race.progress}
            myPlayerId={myPlayerId}
            isPlacement={isInPlacement}
          />
          <div className="relative w-full">
            {/* Countdown overlay — absolutely positioned, no layout shift */}
            <div
              className={`absolute inset-0 z-10 flex items-center justify-center pointer-events-none transition-opacity duration-300 ${
                race.phase === "countdown" || showGo
                  ? "opacity-100"
                  : "opacity-0"
              }`}
            >
              <CountdownOverlay
                countdown={race.countdown}
                showGo={showGo}
                playerCount={race.raceState.players.length}
                placementRace={race.raceState.placementRace}
                players={race.raceState.players}
              />
            </div>
            {/* Words — blurred during countdown, comes into focus on GO */}
            <div
              className="transition-[filter] duration-700 ease-out"
              style={{
                filter:
                  race.phase === "countdown" ? "blur(5px)" : "none",
              }}
            >
              <RaceTypingArea
                seed={race.raceState.seed}
                wordCount={race.raceState.wordCount}
                finishTimeoutEnd={race.finishTimeoutEnd}
                onProgress={race.sendProgress}
                onFinish={race.sendFinish}
                disabled={race.phase === "countdown"}
              />
            </div>
          </div>
        </div>
      )}

      {race.phase === "finished" && (
        <div style={{ animation: "fade-in-up 0.4s ease-out both" }}>
          <RaceResults
            results={race.results}
            myPlayerId={myPlayerId}
            onRaceAgain={race.raceAgain}
            placementRace={race.placementRace}
            placementTotal={race.placementTotal}
            rankChange={rankChange}
          />
        </div>
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

      {/* Party invite toast */}
      {partyHook.pendingInvite && (
        <PartyInviteToast
          invite={partyHook.pendingInvite}
          onRespond={partyHook.respondToInvite}
        />
      )}
    </div>
  );
}
