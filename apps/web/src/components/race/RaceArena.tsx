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
import { SpectatorIndicator } from "./SpectatorIndicator";
import { useSocket } from "@/hooks/useSocket";
import { getRankInfo } from "@typeoff/shared";
import type { RankTier, WpmSample } from "@typeoff/shared";

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
  const { on } = useSocket();

  const myPlayerId = session?.user?.id ?? null;

  // Spectator awareness
  const [spectators, setSpectators] = React.useState<Array<{ userId: string; name: string }>>([]);
  const [spectatorCount, setSpectatorCount] = React.useState(0);

  React.useEffect(() => {
    const unsub = on("spectatorUpdate", (data) => {
      if (data.raceId === race.raceState?.raceId) {
        setSpectators(data.spectators);
        setSpectatorCount(data.count);
      }
    });
    return unsub;
  }, [on, race.raceState?.raceId]);

  // Reset spectator state when leaving a race
  React.useEffect(() => {
    if (race.phase === "idle") {
      setSpectators([]);
      setSpectatorCount(0);
    }
  }, [race.phase]);

  // Auto-claim guest placement on sign-in
  React.useEffect(() => {
    if (!session?.user?.id || session.user.placementsCompleted) return;
    let stored: string | null = null;
    try { stored = localStorage.getItem("guest-placement"); } catch {}
    if (!stored) return;
    let data: { wpm: number };
    try { data = JSON.parse(stored); } catch { return; }
    if (typeof data.wpm !== "number") return;

    fetch("/api/claim-placement", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wpm: data.wpm }),
    })
      .then((res) => {
        if (res.ok) {
          localStorage.removeItem("guest-placement");
          updateSession({});
        }
      })
      .catch(() => {});
  }, [session?.user?.id, session?.user?.placementsCompleted, updateSession]);

  // Delay showing the queue screen so fast matches (placements) skip it
  const [showQueuing, setShowQueuing] = React.useState(false);
  React.useEffect(() => {
    if (race.phase === "queuing") {
      const timer = setTimeout(() => setShowQueuing(true), 600);
      return () => clearTimeout(timer);
    }
    setShowQueuing(false);
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

  // Capture wpmHistory locally (not sent to server, only used for chart)
  const wpmHistoryRef = React.useRef<WpmSample[]>([]);
  const handleFinish = React.useCallback(
    (data: { wpm: number; rawWpm: number; accuracy: number; misstypedChars: number; wpmHistory?: WpmSample[] }) => {
      wpmHistoryRef.current = data.wpmHistory ?? [];
      race.sendFinish(data);
    },
    [race.sendFinish],
  );

  // Escape during countdown = leave race without penalty
  React.useEffect(() => {
    if (race.phase !== "countdown") return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        race.leaveRace();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [race.phase, race.leaveRace]);

  const isInPlacement = race.raceState?.placementRace != null
    || race.phase === "placed"
    || (race.phase === "finished" && race.placementRace != null);

  return (
    <div className={`flex flex-col items-center gap-8 w-full max-w-4xl mx-auto flex-1 ${
      race.phase === "idle" || race.phase === "queuing" || race.phase === "placed" ? "justify-center" : ""
    }`}>
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
          onMarkReady={partyHook.markReady}
          privateRace={partyHook.party?.privateRace}
          onSetPrivateRace={partyHook.setPrivateRace}
        />
      )}

      {(race.phase === "countdown" || race.phase === "racing") && race.raceState && (
        <div
          className="flex flex-col items-center gap-8 w-full pt-[12vh]"
          style={{ animation: "fade-in-up 0.4s ease-out both" }}
        >
          {/* Spectator indicator */}
          {spectatorCount > 0 && (
            <div className="w-full flex justify-end -mb-4">
              <SpectatorIndicator count={spectatorCount} spectators={spectators} />
            </div>
          )}
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
                race.phase === "countdown"
                  ? "opacity-100"
                  : "opacity-0"
              }`}
            >
              <CountdownOverlay
                countdown={race.countdown}
                placementRace={race.raceState.placementRace}
                mode={race.raceState.mode}
              />
              {race.phase === "countdown" && (
                <button
                  onClick={race.leaveRace}
                  className="absolute bottom-2 text-[10px] text-muted/20 hover:text-muted/50 transition-colors pointer-events-auto"
                >
                  press Esc to leave
                </button>
              )}
            </div>
            {/* Words — blurred during countdown, comes into focus on GO */}
            <div
              className="transition-[filter,opacity] duration-700 ease-out"
              style={{
                filter:
                  race.phase === "countdown" ? "blur(12px)" : "none",
                opacity: race.phase === "countdown" ? 0.3 : 1,
              }}
            >
              <RaceTypingArea
                seed={race.raceState.seed}
                wordCount={race.raceState.wordCount}
                mode={race.raceState.mode}
                finishTimeoutEnd={race.finishTimeoutEnd}
                onProgress={race.sendProgress}
                onFinish={handleFinish}
                disabled={race.phase === "countdown"}
              />
            </div>
          </div>
        </div>
      )}

      {race.phase === "finished" && (
        <div className="w-full flex-1 flex flex-col justify-center" style={{ animation: "fade-in-up 0.4s ease-out both" }}>
          <RaceResults
            results={race.results}
            myPlayerId={myPlayerId}
            onRaceAgain={() => race.raceAgain({ privateRace: partyHook.party?.privateRace })}
            onGoHome={race.reset}
            placementRace={race.placementRace}
            placementTotal={race.placementTotal}
            rankChange={rankChange}
            myWpmHistory={wpmHistoryRef.current}
            party={partyHook.party}
            onMarkReady={partyHook.markReady}
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
