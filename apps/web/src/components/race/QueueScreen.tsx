"use client";

import React from "react";
import { useSession } from "next-auth/react";
import { PartyPanel } from "@/components/social/PartyPanel";
import { ChallengesWidget } from "@/components/race/ChallengesWidget";
import { TypePassWidget } from "@/components/race/TypePassWidget";
import { GuestPlacement } from "@/components/race/GuestPlacement";
import type { PartyState } from "@typeoff/shared";

interface QueueScreenProps {
  isQueuing: boolean;
  queueCount: number;
  queueElapsed: number;
  maxWaitSeconds: number;
  connected: boolean;
  onJoin: () => void;
  onLeave: () => void;
  party: PartyState | null;
  partyError: string | null;
  onCreateParty: () => void;
  onInviteToParty: (userId: string) => void;
  onKickFromParty: (userId: string) => void;
  onLeaveParty: () => void;
}

export function QueueScreen({
  isQueuing,
  queueCount,
  queueElapsed,
  maxWaitSeconds,
  connected,
  onJoin,
  onLeave,
  party,
  partyError,
  onCreateParty,
  onInviteToParty,
  onKickFromParty,
  onLeaveParty,
}: QueueScreenProps) {
  const { data: session } = useSession();

  const myUserId = session?.user?.id;
  const isPartyLeader = party?.leaderId === myUserId;
  const inPartyNotLeader = party != null && !isPartyLeader;

  // Enter key shortcut to join queue
  React.useEffect(() => {
    if (isQueuing || !session?.user || !connected || inPartyNotLeader) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Enter" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || tag === "BUTTON" || tag === "A") return;
        e.preventDefault();
        onJoin();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isQueuing, session?.user, connected, inPartyNotLeader, onJoin]);

  /* ── Queuing state ──────────────────────────────────────── */
  if (isQueuing) {
    return (
      <div className="flex flex-col items-center gap-8 animate-fade-in">
        <div className="flex flex-col items-center gap-1">
          <div className="text-5xl font-black text-accent tabular-nums text-glow-accent">
            {queueCount}
          </div>
          <p className="text-muted text-sm">
            {queueCount === 1 ? "player" : "players"} in queue
          </p>
        </div>

        {party && (
          <div className="text-xs text-muted">
            Queuing with {party.members.length} party{" "}
            {party.members.length === 1 ? "member" : "members"}
          </div>
        )}

        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
          <span className="text-muted text-sm">
            {queueElapsed < maxWaitSeconds
              ? `Match starts in ${maxWaitSeconds - queueElapsed}s...`
              : "Starting match..."}
          </span>
        </div>
        <button
          onClick={onLeave}
          className="text-sm text-muted hover:text-error transition-colors"
        >
          Leave queue
        </button>
      </div>
    );
  }

  /* ── Idle state ─────────────────────────────────────────── */
  return (
    <div className="flex flex-col items-center w-full max-w-xl">
      {session?.user ? (
        <>
          {/* Action area */}
          {inPartyNotLeader ? (
            <div
              className="text-sm text-muted py-3 opacity-0 animate-fade-in"
              style={{ animationDelay: "0ms", animationFillMode: "both" }}
            >
              Waiting for party leader to start...
            </div>
          ) : (
            <div
              className="flex flex-col items-center w-full opacity-0 animate-fade-in"
              style={{ animationDelay: "0ms", animationFillMode: "both" }}
            >
              <button
                onClick={onJoin}
                disabled={!connected}
                className="w-full rounded-lg bg-accent/[0.06] ring-1 ring-accent/20 text-accent py-3.5 text-sm font-medium hover:bg-accent hover:text-bg hover:ring-accent transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {session.user.placementsCompleted ? "Find Race" : "Start Placement"}
                <span className="inline-block w-[2px] h-[1em] bg-current animate-blink ml-0.5 translate-y-px" />
              </button>
              {!session.user.placementsCompleted && (
                <p className="text-[11px] text-muted/50 mt-2.5">
                  complete a placement race to unlock ranked
                </p>
              )}
            </div>
          )}

          {/* Secondary actions */}
          {session.user.placementsCompleted && !party && (
            <button
              onClick={onCreateParty}
              className="text-xs text-muted/40 hover:text-muted transition-colors mt-3 opacity-0 animate-fade-in"
              style={{ animationDelay: "60ms", animationFillMode: "both" }}
            >
              create party
            </button>
          )}

          {/* Party panel */}
          {session.user.placementsCompleted && party && (
            <div
              className="w-full mt-5 opacity-0 animate-fade-in"
              style={{ animationDelay: "80ms", animationFillMode: "both" }}
            >
              <PartyPanel
                party={party}
                error={partyError}
                onCreateParty={onCreateParty}
                onInvite={onInviteToParty}
                onKick={onKickFromParty}
                onLeave={onLeaveParty}
              />
            </div>
          )}

          {/* Dashboard */}
          {session.user.placementsCompleted && (
            <div
              className="w-full mt-6 pt-6 border-t border-white/[0.04] flex flex-col gap-3 opacity-0 animate-fade-in"
              style={{ animationDelay: "120ms", animationFillMode: "both" }}
            >
              <ChallengesWidget />
              <TypePassWidget />
            </div>
          )}
        </>
      ) : (
        /* ── Signed-out: Guest Placement ─────────────────── */
        <GuestPlacement />
      )}
    </div>
  );
}
