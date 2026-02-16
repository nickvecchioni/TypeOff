"use client";

import React from "react";
import { useSession, signIn } from "next-auth/react";
import { RankBadge } from "@/components/RankBadge";
import type { RankTier } from "@typeoff/shared";

interface QueueScreenProps {
  isQueuing: boolean;
  queueCount: number;
  connected: boolean;
  onJoin: () => void;
  onLeave: () => void;
}

export function QueueScreen({
  isQueuing,
  queueCount,
  connected,
  onJoin,
  onLeave,
}: QueueScreenProps) {
  const { data: session } = useSession();

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
        <div className="text-2xl text-accent tabular-nums">{queueCount}</div>
        <p className="text-muted text-sm">
          {queueCount === 1 ? "player" : "players"} in queue
        </p>
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
    <div className="flex flex-col items-center gap-10 animate-fade-in">
      {/* Hero */}
      <div className="flex flex-col items-center gap-3 text-center">
        <h1 className="text-3xl sm:text-4xl font-bold text-text">
          Competitive typing, <span className="text-accent">ranked.</span>
        </h1>
        <p className="text-muted text-sm sm:text-base whitespace-nowrap">
          Race in real-time. Climb from{" "}
          <span className="text-rank-bronze font-bold">Bronze</span> to{" "}
          <span className="text-rank-grandmaster font-bold">Grandmaster</span>.
        </p>
      </div>

      {/* Feature pills */}
      <div className="flex items-center gap-3 text-xs">
        <span className="rounded-full bg-surface px-3 py-1.5 text-muted">
          Live multiplayer
        </span>
        <span className="rounded-full bg-surface px-3 py-1.5 text-muted">
          ELO ranked
        </span>
        <span className="rounded-full bg-surface px-3 py-1.5 text-muted">
          Bronze → Grandmaster
        </span>
      </div>

      {/* CTA */}
      <div className="flex flex-col items-center gap-4">
        {session?.user ? (
          <button
            onClick={onJoin}
            disabled={!connected}
            className="rounded-lg bg-accent/20 text-accent px-10 py-3.5 text-lg font-bold hover:bg-accent/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Find Race
          </button>
        ) : (
          <button
            onClick={() => signIn("google", { callbackUrl: "/" })}
            className="rounded-lg bg-accent/20 text-accent px-10 py-3.5 text-lg font-bold hover:bg-accent/30 transition-colors"
          >
            Sign Up
          </button>
        )}
      </div>
    </div>
  );
}
