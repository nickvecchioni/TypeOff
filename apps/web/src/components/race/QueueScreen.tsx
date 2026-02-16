"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { RankBadge } from "@/components/RankBadge";
import type { RankTier } from "@typeoff/shared";

interface QueueScreenProps {
  isQueuing: boolean;
  queueCount: number;
  connected: boolean;
  onJoin: (guestName?: string) => void;
  onLeave: () => void;
  isAuthenticated: boolean;
}

export function QueueScreen({
  isQueuing,
  queueCount,
  connected,
  onJoin,
  onLeave,
  isAuthenticated,
}: QueueScreenProps) {
  const [guestName, setGuestName] = useState("");
  const { data: session } = useSession();

  const handleJoin = () => {
    onJoin(isAuthenticated ? undefined : guestName || undefined);
  };

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
          Race in real-time. Climb from Bronze to Grandmaster.
        </p>
      </div>

      {/* Feature pills */}
      <div className="flex items-center gap-4 text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
          Real-time FFA
        </span>
        <span className="w-px h-3 bg-surface" />
        <span className="flex items-center gap-1.5">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent">
            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
            <polyline points="17 6 23 6 23 12" />
          </svg>
          ELO ranked
        </span>
        <span className="w-px h-3 bg-surface" />
        <span className="flex items-center gap-1.5">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent">
            <circle cx="12" cy="8" r="5" />
            <path d="M20 21a8 8 0 0 0-16 0" />
          </svg>
          7 rank tiers
        </span>
      </div>

      {/* CTA */}
      <div className="flex flex-col items-center gap-4">
        {!isAuthenticated && (
          <div className="flex flex-col items-center gap-2">
            <label className="text-sm text-muted">Your name</label>
            <input
              type="text"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              placeholder="Guest"
              maxLength={20}
              className="bg-surface rounded-lg px-4 py-2 text-text text-center outline-none focus:ring-2 focus:ring-accent/50 w-48"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleJoin();
              }}
            />
          </div>
        )}

        <button
          onClick={handleJoin}
          disabled={!connected}
          className="rounded-lg bg-accent/20 text-accent px-10 py-3.5 text-lg font-bold hover:bg-accent/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Find Race
        </button>

        {!isAuthenticated && (
          <p className="text-xs text-muted">
            <Link href="/login" className="text-accent hover:text-accent/80 transition-colors">Sign in</Link> to track your rank and climb the leaderboard
          </p>
        )}
      </div>
    </div>
  );
}
