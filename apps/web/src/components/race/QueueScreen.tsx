"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useSession, signIn } from "next-auth/react";
import { RankBadge } from "@/components/RankBadge";
import { PartyPanel } from "@/components/social/PartyPanel";
import type { RankTier, RaceType, PartyState } from "@typeoff/shared";
import { RACE_TYPE_LABELS, RACE_TYPE_WORD_COUNTS } from "@typeoff/shared";

const RACE_TYPES: RaceType[] = ["common", "medium", "hard"];

interface QueueScreenProps {
  isQueuing: boolean;
  queueCount: number;
  connected: boolean;
  onJoin: (raceType: RaceType) => void;
  onLeave: () => void;
  activeRaceType: RaceType;
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
  activeRaceType,
  party,
  partyError,
  onCreateParty,
  onInviteToParty,
  onKickFromParty,
  onLeaveParty,
}: QueueScreenProps) {
  const { data: session } = useSession();
  const [selectedType, setSelectedType] = useState<RaceType>(activeRaceType);

  const myUserId = session?.user?.id;
  const isPartyLeader = party?.leaderId === myUserId;
  const inPartyNotLeader = party != null && !isPartyLeader;

  if (isQueuing) {
    return (
      <div className="flex flex-col items-center gap-6 animate-fade-in">
        {session?.user && (
          <RankBadge
            tier={(session.user.rankTier as RankTier) ?? "bronze"}
            elo={session.user.eloRating}
            size="md"
            placementsCompleted={session.user.placementsCompleted}
          />
        )}
        <div className="text-xs text-muted uppercase tracking-wider font-bold">
          {RACE_TYPE_LABELS[activeRaceType]} Queue
        </div>
        <div className="text-2xl text-accent tabular-nums">{queueCount}</div>
        <p className="text-muted text-sm">
          {queueCount === 1 ? "player" : "players"} in queue
        </p>

        {party && (
          <div className="text-xs text-muted">
            Queuing with {party.members.length} party {party.members.length === 1 ? "member" : "members"}
          </div>
        )}

        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
          <span className="text-muted text-sm">Waiting for opponents...</span>
        </div>
        <button
          onClick={onLeave}
          className="text-sm text-muted hover:text-error transition-colors mt-4"
        >
          Leave queue
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-12 animate-fade-in">
      {/* Hero */}
      <div className="flex flex-col items-center gap-4 text-center">
        <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-text">
          Competitive typing,{" "}
          <span className="text-accent">ranked.</span>
        </h1>
        <p className="text-muted text-sm sm:text-base">
          Race in real-time. Climb from{" "}
          <span className="text-rank-bronze font-bold">Bronze</span> to{" "}
          <span className="text-rank-grandmaster font-bold">Grandmaster</span>.
        </p>
      </div>

      {/* Race Type Selector */}
      {session?.user && (
        <div className="flex flex-col items-center gap-3">
          <div className="text-xs text-muted uppercase tracking-wider font-bold">
            Choose Difficulty
          </div>
          <div className="flex gap-2">
            {RACE_TYPES.map((rt) => {
              const isSelected = rt === selectedType;
              return (
                <button
                  key={rt}
                  onClick={() => setSelectedType(rt)}
                  className={`rounded-lg border px-5 py-3 text-sm font-bold transition-colors ${
                    isSelected
                      ? "border-accent/50 bg-accent/15 text-accent"
                      : "border-white/[0.06] bg-surface/60 text-muted hover:text-text hover:border-white/[0.12]"
                  }`}
                >
                  <div>{RACE_TYPE_LABELS[rt]}</div>
                  <div className="text-xs font-normal mt-0.5 opacity-60">
                    {RACE_TYPE_WORD_COUNTS[rt]} words
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Party Panel */}
      {session?.user && (
        <PartyPanel
          party={party}
          error={partyError}
          onCreateParty={onCreateParty}
          onInvite={onInviteToParty}
          onKick={onKickFromParty}
          onLeave={onLeaveParty}
        />
      )}

      {/* CTA */}
      <div className="flex flex-col items-center gap-3">
        {session?.user ? (
          inPartyNotLeader ? (
            <div className="text-sm text-muted">
              Waiting for party leader to start...
            </div>
          ) : (
            <button
              onClick={() => onJoin(selectedType)}
              disabled={!connected}
              className="rounded-lg border border-accent/30 bg-accent/15 text-accent px-12 py-4 text-lg font-bold hover:bg-accent/25 hover:border-accent/50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Find {RACE_TYPE_LABELS[selectedType]} Race
            </button>
          )
        ) : (
          <button
            onClick={() => signIn("google", { callbackUrl: "/" })}
            className="rounded-lg border border-accent/30 bg-accent/15 text-accent px-12 py-4 text-lg font-bold hover:bg-accent/25 hover:border-accent/50 transition-colors"
          >
            Sign Up
          </button>
        )}
        <Link
          href="/solo"
          className="text-sm text-muted hover:text-text transition-colors"
        >
          or <span className="underline underline-offset-2 decoration-muted/50">play solo</span>
        </Link>
      </div>
    </div>
  );
}
