"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSession, signIn } from "next-auth/react";
import { RankBadge } from "@/components/RankBadge";
import { PartyPanel } from "@/components/social/PartyPanel";
import type { RankTier, RaceType, PartyState } from "@typeoff/shared";
import { RACE_TYPE_LABELS, RACE_TYPE_WORD_COUNTS } from "@typeoff/shared";

const RACE_TYPES: RaceType[] = ["common", "language", "punctuation"];

const MODE_DESCRIPTIONS: Record<RaceType, string> = {
  common: "Everyday words",
  language: "Full vocabulary",
  punctuation: "Real sentences",
};

interface TypeRating {
  raceType: string;
  eloRating: number;
  rankTier: string;
  placementsCompleted: boolean;
  racesPlayed: number;
}

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
  const [ratings, setRatings] = useState<Map<string, TypeRating>>(new Map());

  const fetchRatings = useCallback(() => {
    if (!session?.user) return;
    fetch("/api/ratings")
      .then((r) => r.json())
      .then((rows: TypeRating[]) => {
        setRatings(new Map(rows.map((r) => [r.raceType, r])));
      })
      .catch(() => {});
  }, [session?.user]);

  useEffect(() => {
    fetchRatings();
  }, [fetchRatings]);

  useEffect(() => {
    const handler = () => fetchRatings();
    window.addEventListener("elo-change", handler);
    return () => window.removeEventListener("elo-change", handler);
  }, [fetchRatings]);

  const myUserId = session?.user?.id;
  const isPartyLeader = party?.leaderId === myUserId;
  const inPartyNotLeader = party != null && !isPartyLeader;

  /* ── Queuing state ──────────────────────────────────────── */
  if (isQueuing) {
    const queueRating = ratings.get(activeRaceType);
    return (
      <div className="flex flex-col items-center gap-8 animate-fade-in">
        <div className="flex flex-col items-center gap-3">
          <div className="text-xs text-muted uppercase tracking-wider font-bold">
            {RACE_TYPE_LABELS[activeRaceType]}
          </div>
          {session?.user && queueRating && (
            <RankBadge
              tier={(queueRating.rankTier as RankTier) ?? "bronze"}
              elo={queueRating.eloRating}
              size="md"
              placementsCompleted={queueRating.placementsCompleted}
            />
          )}
        </div>

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
        </h1>
        <p className="text-muted text-sm max-w-md">
          Race head-to-head in real-time. Climb from{" "}
          <span className="text-rank-bronze font-semibold">Bronze</span> to{" "}
          <span className="text-rank-grandmaster font-semibold">Grandmaster</span>.
        </p>
      </div>

      {/* Mode selector + CTA */}
      {session?.user ? (
        <div className="flex flex-col items-center gap-6 w-full max-w-lg">
          {/* Mode cards */}
          <div className="grid grid-cols-3 gap-2 w-full">
            {RACE_TYPES.map((rt) => {
              const isSelected = rt === selectedType;
              const rating = ratings.get(rt);
              return (
                <button
                  key={rt}
                  onClick={() => setSelectedType(rt)}
                  className={`group relative rounded-lg border px-3 py-4 text-left transition-all duration-150 ${
                    isSelected
                      ? "border-accent/40 bg-accent/[0.08] glow-accent"
                      : "border-white/[0.06] bg-surface/50 hover:border-white/[0.12] hover:bg-surface/80"
                  }`}
                >
                  <div className={`text-sm font-bold ${isSelected ? "text-accent" : "text-text"}`}>
                    {RACE_TYPE_LABELS[rt]}
                  </div>
                  <div className="text-xs text-muted mt-0.5">
                    {MODE_DESCRIPTIONS[rt]}
                  </div>
                  <div className="text-xs text-muted/60 mt-0.5 tabular-nums">
                    {RACE_TYPE_WORD_COUNTS[rt]} words
                  </div>
                  {rating && (
                    <div className="mt-3">
                      <RankBadge
                        tier={(rating.rankTier as RankTier) ?? "bronze"}
                        elo={rating.eloRating}
                        placementsCompleted={rating.placementsCompleted}
                      />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Party */}
          <PartyPanel
            party={party}
            error={partyError}
            onCreateParty={onCreateParty}
            onInvite={onInviteToParty}
            onKick={onKickFromParty}
            onLeave={onLeaveParty}
          />

          {/* CTA */}
          {inPartyNotLeader ? (
            <div className="text-sm text-muted">
              Waiting for party leader to start...
            </div>
          ) : (
            <button
              onClick={() => onJoin(selectedType)}
              disabled={!connected}
              className="w-full rounded-lg bg-accent text-bg py-3.5 text-sm font-bold tracking-wide uppercase hover:bg-accent/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed glow-accent-strong"
            >
              Find {RACE_TYPE_LABELS[selectedType]} Race
            </button>
          )}
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
