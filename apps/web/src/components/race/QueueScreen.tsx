"use client";

import React from "react";
import { useSession, signIn } from "next-auth/react";
import { PartyPanel } from "@/components/social/PartyPanel";
import type { PartyState } from "@typeoff/shared";

interface QueueScreenProps {
  isQueuing: boolean;
  queueCount: number;
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
          <span className="text-muted text-sm">Searching for opponents...</span>
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
    <div className="flex flex-col items-center gap-10 animate-fade-in w-full">
      {/* Hero */}
      <div className="flex flex-col items-center gap-3 text-center">
        <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-text">
          Competitive typing,{" "}
          <span className="text-accent text-glow-accent">ranked.</span>
          <span className="inline-block w-[3px] h-[1.1em] bg-accent ml-1 animate-blink translate-y-[0.15em]" />
        </h1>
        <p className="text-muted text-sm max-w-xl">
          Race head-to-head in real-time. Climb from{" "}
          <span className="text-rank-bronze font-semibold">Bronze</span> to{" "}
          <span className="text-rank-grandmaster font-semibold">Grandmaster</span>.
        </p>
      </div>

      {/* CTA */}
      {session?.user ? (
        <div className="flex flex-col items-center gap-6 w-full max-w-lg">
          {inPartyNotLeader ? (
            <div className="text-sm text-muted">
              Waiting for party leader to start...
            </div>
          ) : (
            <button
              onClick={onJoin}
              disabled={!connected}
              className="w-full rounded-lg bg-accent text-bg py-3.5 text-sm font-bold tracking-wide uppercase hover:bg-accent/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed glow-accent-strong"
            >
              Find Race
            </button>
          )}

          {/* Party */}
          <PartyPanel
            party={party}
            error={partyError}
            onCreateParty={onCreateParty}
            onInvite={onInviteToParty}
            onKick={onKickFromParty}
            onLeave={onLeaveParty}
          />
        </div>
      ) : (
        <button
          onClick={() => signIn("google", { callbackUrl: "/" })}
          className="rounded-lg bg-accent text-bg px-12 py-3.5 text-sm font-bold tracking-wide uppercase hover:bg-accent/90 transition-colors glow-accent-strong"
        >
          Sign Up to Race
        </button>
      )}
    </div>
  );
}
