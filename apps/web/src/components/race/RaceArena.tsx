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
import { SpectatorIndicator } from "./SpectatorIndicator";
import type { EmoteEvent } from "./FloatingEmote";
import { useSocket } from "@/hooks/useSocket";
import { getRankInfo, getCodeSnippet } from "@typeoff/shared";
import type { RankTier, WpmSample, ModeCategory } from "@typeoff/shared";

function FinishTimeoutDisplay({ finishTimeoutEnd }: { finishTimeoutEnd: number }) {
  const [remaining, setRemaining] = React.useState<number | null>(null);
  React.useEffect(() => {
    const tick = () => {
      const r = Math.max(0, Math.ceil((finishTimeoutEnd - Date.now()) / 1000));
      setRemaining(r);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [finishTimeoutEnd]);
  if (remaining == null || remaining <= 0) return null;
  return (
    <div className="text-center text-sm text-muted mt-3 tabular-nums h-5 flex items-center justify-center">
      Time remaining: <span className="text-accent font-bold ml-1">{remaining}s</span>
    </div>
  );
}

const TIER_ORDER: RankTier[] = [
  "bronze", "silver", "gold", "platinum", "diamond", "master", "grandmaster",
];

function rankValue(tier: RankTier, division: number | null): number {
  return TIER_ORDER.indexOf(tier) * 3 + (3 - (division ?? 0));
}

export function RaceArena() {
  const { data: session, update: updateSession } = useSession();
  const myPlayerId = session?.user?.id ?? null;
  const race = useRace(myPlayerId);
  const partyHook = useParty();
  const { on } = useSocket();

  const [modeCategories, setModeCategories] = React.useState<ModeCategory[]>(["words"]);

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

  // Emote events
  const [emotes, setEmotes] = React.useState<EmoteEvent[]>([]);
  const emoteTimersRef = React.useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  React.useEffect(() => {
    const unsub = on("raceEmote", (data) => {
      const event: EmoteEvent = {
        id: crypto.randomUUID(),
        playerId: data.playerId,
        playerName: data.playerName,
        emote: data.emote,
        receivedAt: Date.now(),
      };
      setEmotes((prev) => [...prev, event]);
      // Auto-cleanup after 3s
      const timer = setTimeout(() => {
        emoteTimersRef.current.delete(timer);
        setEmotes((prev) => prev.filter((e) => e.id !== event.id));
      }, 3000);
      emoteTimersRef.current.add(timer);
    });
    return () => {
      unsub();
      emoteTimersRef.current.forEach(clearTimeout);
      emoteTimersRef.current.clear();
    };
  }, [on]);

  // Reset emotes on race reset
  React.useEffect(() => {
    if (race.phase === "idle") setEmotes([]);
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

  // Delay showing race results by 1s so the final placements can settle visually
  const [showResults, setShowResults] = React.useState(false);
  React.useEffect(() => {
    if (race.phase === "finished") {
      const timer = setTimeout(() => setShowResults(true), 1000);
      return () => clearTimeout(timer);
    }
    setShowResults(false);
  }, [race.phase]);

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
  const finishSentAt = React.useRef<number | null>(null);
  const handleFinish = React.useCallback(
    (data: { wpm: number; rawWpm: number; accuracy: number; misstypedChars: number; wpmHistory?: WpmSample[] }) => {
      wpmHistoryRef.current = data.wpmHistory ?? [];
      finishSentAt.current = Date.now();
      lastFinishData.current = { wpm: data.wpm, rawWpm: data.rawWpm, accuracy: data.accuracy };
      race.sendFinish(data);
    },
    [race.sendFinish],
  );

  // Stuck race detection: if we sent a finish but never got results, keep retrying
  const lastFinishData = React.useRef<{ wpm: number; rawWpm: number; accuracy: number } | null>(null);
  React.useEffect(() => {
    if (race.phase !== "racing" && race.phase !== "countdown") {
      finishSentAt.current = null;
      lastFinishData.current = null;
      return;
    }
    const interval = setInterval(() => {
      if (finishSentAt.current && lastFinishData.current && Date.now() - finishSentAt.current > 2000) {
        console.warn("[RaceArena] Stuck race — resending finish event");
        finishSentAt.current = Date.now();
        race.sendFinish(lastFinishData.current);
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [race.phase, race.sendFinish]);

  // Reset race when the nav logo is clicked while already on "/"
  React.useEffect(() => {
    const handler = () => { if (race.phase !== "idle") race.reset(); };
    window.addEventListener("nav-go-home", handler);
    return () => window.removeEventListener("nav-go-home", handler);
  }, [race.phase, race.reset]);

  // Prevent rage-quitting during active races
  React.useEffect(() => {
    const isActive = race.phase === "racing" || race.phase === "countdown";
    if (!isActive) return;

    // Warn on page refresh / close
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
    }

    // Block client-side navigation (Next.js Link clicks)
    const origPushState = history.pushState.bind(history);
    const origReplaceState = history.replaceState.bind(history);

    history.pushState = function (...args: Parameters<typeof origPushState>) {
      // Allow same-page state updates (used by modals, search params)
      if (typeof args[2] === "string" && args[2] !== window.location.href && args[2] !== window.location.pathname) {
        return; // block navigation to different pages
      }
      return origPushState(...args);
    };
    history.replaceState = function (...args: Parameters<typeof origReplaceState>) {
      if (typeof args[2] === "string" && args[2] !== window.location.href && args[2] !== window.location.pathname) {
        return;
      }
      return origReplaceState(...args);
    };

    // Block browser back/forward
    function handlePopState() {
      history.pushState(null, "", window.location.href);
    }
    history.pushState = origPushState; // temporarily restore for the push
    history.pushState(null, "", window.location.href);
    history.pushState = function (...args: Parameters<typeof origPushState>) {
      if (typeof args[2] === "string" && args[2] !== window.location.href && args[2] !== window.location.pathname) {
        return;
      }
      return origPushState(...args);
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("popstate", handlePopState);
      history.pushState = origPushState;
      history.replaceState = origReplaceState;
    };
  }, [race.phase]);


  const isInPlacement = race.raceState?.placementRace != null
    || race.phase === "placed"
    || (race.phase === "finished" && race.placementRace != null);

  return (
    <div className={`flex flex-col items-center gap-8 w-full max-w-4xl mx-auto flex-1 min-h-0 ${
      race.phase === "queuing" || race.phase === "placed" ? "justify-center" :
      race.phase === "finished" ? "pt-4" :
      "py-[8vh]"
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
          modeCategories={modeCategories}
          onSetModeCategories={setModeCategories}
        />
      )}

      {(race.phase === "countdown" || race.phase === "racing" || (race.phase === "finished" && !showResults)) && race.raceState && (
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
          <div className="relative w-full">
            <RaceTrack
              players={race.raceState.players}
              progress={race.progress}
              myPlayerId={myPlayerId}
              isPlacement={isInPlacement}
            />
            {/* Finish timeout below the race track (under user's WPM row) */}
            {race.finishTimeoutEnd != null && race.phase !== "finished" && (
              <FinishTimeoutDisplay finishTimeoutEnd={race.finishTimeoutEnd} />
            )}
          </div>
          {race.phase !== "finished" && (
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
                codeLanguage={race.raceState.mode === "code" ? getCodeSnippet(race.raceState.seed).language : undefined}
              />
            </div>
            {/* Words — hidden during countdown, fades in on GO */}
            <div
              className={`transition-opacity duration-700 ease-out ${
                race.phase === "countdown" ? "opacity-0" : "opacity-100"
              }`}
            >
              <RaceTypingArea
                seed={race.raceState.seed}
                wordCount={race.raceState.wordCount}
                mode={race.raceState.mode}
                onProgress={race.sendProgress}
                onFinish={handleFinish}
                disabled={race.phase === "countdown"}
              />
            </div>
          </div>
          )}
        </div>
      )}

      {race.phase === "finished" && showResults && (
        <div className="w-full flex-1 min-h-0 flex flex-col" style={{ animation: "fade-in-up 0.4s ease-out both" }}>
          <RaceResults
            results={race.results}
            myPlayerId={myPlayerId}
            onRaceAgain={() => race.raceAgain({ privateRace: partyHook.party?.privateRace, modeCategories })}
            onGoHome={race.reset}
            placementRace={race.placementRace}
            placementTotal={race.placementTotal}
            rankChange={rankChange}
            myWpmHistory={wpmHistoryRef.current}
            party={partyHook.party}
            onMarkReady={partyHook.markReady}
            raceId={race.raceId}
            seed={race.raceState?.seed ?? null}
            mode={race.raceState?.mode ?? null}
            emotes={emotes}
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

    </div>
  );
}
