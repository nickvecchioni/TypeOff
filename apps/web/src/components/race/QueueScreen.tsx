"use client";

import React from "react";
import { useSession, signIn } from "next-auth/react";
import { PartyPanel } from "@/components/social/PartyPanel";
import { ChallengesWidget } from "@/components/race/ChallengesWidget";
import { TypePassWidget } from "@/components/race/TypePassWidget";
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
            Queuing with {party.members.length} party {party.members.length === 1 ? "member" : "members"}
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

  /* ── Idle state (main homepage) ─────────────────────────── */
  return (
    <div className="flex flex-col items-center gap-6 animate-fade-in w-full">
      {/* Hero — compact for returning users */}
      <div className="flex flex-col items-center gap-1.5 text-center">
        <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-text">
          Competitive typing,{" "}
          <span className="text-accent text-glow-accent">ranked.</span>
          <span className="inline-block w-[3px] h-[1.1em] bg-accent ml-1 animate-blink translate-y-[0.15em]" />
        </h1>
        <p className="text-muted text-sm sm:text-base">
          Race head-to-head in real-time. Climb from{" "}
          <span className="text-rank-bronze font-semibold">Bronze</span> to{" "}
          <span className="text-rank-grandmaster font-semibold">Grandmaster</span>.
        </p>
      </div>

      {/* CTA */}
      {session?.user ? (
        <div className="flex flex-col items-center gap-5 w-full max-w-2xl">
          {inPartyNotLeader ? (
            <div className="text-sm text-muted">
              Waiting for party leader to start...
            </div>
          ) : (
            <div className="flex items-center gap-3 w-full">
              <button
                onClick={onJoin}
                disabled={!connected}
                className="flex-1 rounded-lg bg-accent text-bg py-3 text-sm font-bold tracking-wide uppercase hover:bg-accent/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed glow-accent-strong"
              >
                {session.user.placementsCompleted ? "Find Race" : "Start Placement Race"}
              </button>
              {session.user.placementsCompleted && !party && (
                <button
                  onClick={onCreateParty}
                  className="shrink-0 rounded-lg bg-white/[0.04] ring-1 ring-white/[0.06] text-muted py-3 px-5 text-sm font-medium hover:text-text hover:ring-white/[0.12] transition-all"
                >
                  Create Party
                </button>
              )}
            </div>
          )}
          {!session.user.placementsCompleted && (
            <p className="text-xs text-muted text-center -mt-2">
              Complete a placement race to get your rank
            </p>
          )}

          {/* Party row — show inline when active */}
          {session.user.placementsCompleted && party && (
            <PartyPanel
              party={party}
              error={partyError}
              onCreateParty={onCreateParty}
              onInvite={onInviteToParty}
              onKick={onKickFromParty}
              onLeave={onLeaveParty}
            />
          )}

          {/* Two-column grid for widgets on desktop */}
          {session.user.placementsCompleted && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
              <ChallengesWidget />
              <TypePassWidget />
            </div>
          )}
        </div>
      ) : (
        <button
          onClick={() => signIn("google", { callbackUrl: "/" })}
          className="group flex items-center gap-3 rounded-lg bg-white/[0.05] ring-1 ring-white/[0.08] px-5 sm:px-7 py-3.5 text-sm text-text hover:bg-white/[0.09] hover:ring-white/[0.15] transition-all w-full sm:w-auto justify-center"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          <span className="font-medium">Continue with Google</span>
        </button>
      )}
    </div>
  );
}
