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
import { getRankInfo, RACE_TYPE_LABELS } from "@typeoff/shared";
import type { RankTier, RaceType } from "@typeoff/shared";

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
            new CustomEvent("elo-change", {
              detail: { change: myResult.eloChange, raceType: race.finishedRaceType },
            })
          );
        }
        if (myResult?.elo != null && myResult.eloChange != null && session.user.rankTier) {
          const oldElo = myResult.elo - myResult.eloChange;
          const oldInfo = getRankInfo(oldElo);
          const newInfo = getRankInfo(myResult.elo);
          const oldVal = rankValue(oldInfo.tier, oldInfo.division);
          const newVal = rankValue(newInfo.tier, newInfo.division);
          if (newVal > oldVal) {
            window.dispatchEvent(
              new CustomEvent("rank-up", {
                detail: { tier: newInfo.tier, elo: myResult.elo, direction: "up" as const, raceType: race.finishedRaceType },
              })
            );
          } else if (newVal < oldVal) {
            window.dispatchEvent(
              new CustomEvent("rank-up", {
                detail: { tier: newInfo.tier, elo: myResult.elo, direction: "down" as const, raceType: race.finishedRaceType },
              })
            );
          }
        }
        updateSession({});
      }
    } else if (!isFinished) {
      sessionRefreshed.current = false;
    }
  }, [race.phase, race.results, session?.user?.id, updateSession, race.finishedRaceType]);

  const isInPlacement = race.raceState?.placementRace != null
    || race.phase === "placed"
    || (race.phase === "finished" && race.placementRace != null);

  const currentRaceType: RaceType | undefined = race.raceState?.raceType ?? race.activeRaceType;

  return (
    <div className="flex flex-col items-center gap-8 w-full max-w-4xl mx-auto">
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
          activeRaceType={race.activeRaceType}
          party={partyHook.party}
          partyError={partyHook.error}
          onCreateParty={partyHook.createParty}
          onInviteToParty={partyHook.inviteToParty}
          onKickFromParty={partyHook.kickMember}
          onLeaveParty={partyHook.leaveParty}
        />
      )}

      {race.phase === "countdown" && race.raceState && (
        <CountdownOverlay
          countdown={race.countdown}
          playerCount={race.raceState.players.length}
          placementRace={race.raceState.placementRace}
          players={race.raceState.players}
          raceType={currentRaceType}
        />
      )}

      {race.phase === "racing" && race.raceState && (
        <>
          <div className="flex items-center gap-3">
            {currentRaceType && (
              <span className="text-xs text-accent font-bold uppercase tracking-wider">
                {RACE_TYPE_LABELS[currentRaceType]}
              </span>
            )}
            {race.raceState.placementRace != null && (
              <span className="text-xs text-muted">
                Placement {race.raceState.placementRace} of 3
              </span>
            )}
          </div>
          <RaceTrack
            players={race.raceState.players}
            progress={race.progress}
            myPlayerId={myPlayerId}
            isPlacement={isInPlacement}
          />
          <RaceTypingArea
            seed={race.raceState.seed}
            wordCount={race.raceState.wordCount}
            wordPool={race.raceState.wordPool}
            finishTimeoutEnd={race.finishTimeoutEnd}
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
          raceType={race.finishedRaceType}
        />
      )}

      {race.phase === "placed" && (() => {
        const myResult = race.results.find((r) => r.playerId === myPlayerId);
        const elo = myResult?.elo ?? 1000;
        return (
          <PlacementReveal
            elo={elo}
            onContinue={race.raceAgain}
            raceType={race.finishedRaceType}
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
