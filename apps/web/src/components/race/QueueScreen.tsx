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
    <div className="flex flex-col items-center gap-12 animate-fade-in">
      {/* Hero */}
      <div className="flex flex-col items-center gap-4 text-center">
        <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-text">
          Competitive typing,{" "}
          <span className="text-accent text-glow-accent">ranked.</span>
        </h1>
        <p className="text-muted text-sm sm:text-base">
          Race in real-time. Climb from{" "}
          <span className="text-rank-bronze font-bold">Bronze</span> to{" "}
          <span className="text-rank-grandmaster font-bold">Grandmaster</span>.
        </p>
      </div>

      {/* Feature pills */}
      <div className="flex items-center gap-3 text-xs">
        <span className="rounded-full border border-surface-bright bg-surface/50 px-4 py-2 text-muted">
          Live multiplayer
        </span>
        <span className="rounded-full border border-surface-bright bg-surface/50 px-4 py-2 text-muted">
          ELO ranked
        </span>
        <span className="rounded-full border border-surface-bright bg-surface/50 px-4 py-2 text-muted">
          Solo practice
        </span>
      </div>

      {/* CTA */}
      <div className="flex flex-col items-center gap-4">
        {session?.user ? (
          <button
            onClick={onJoin}
            disabled={!connected}
            className="rounded-xl border border-accent/30 bg-accent/15 text-accent px-12 py-4 text-lg font-bold hover:bg-accent/25 hover:border-accent/50 hover:shadow-[0_0_24px_rgba(167,139,250,0.2)] transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {session.user.placementsCompleted ? "Find Race" : "Start Placements"}
          </button>
        ) : (
          <button
            onClick={() => signIn("google", { callbackUrl: "/" })}
            className="rounded-xl border border-accent/30 bg-accent/15 text-accent px-12 py-4 text-lg font-bold hover:bg-accent/25 hover:border-accent/50 transition-all duration-200"
          >
            Sign Up
          </button>
        )}
      </div>
    </div>
  );
}
