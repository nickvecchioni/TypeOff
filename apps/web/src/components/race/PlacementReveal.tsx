"use client";

import React, { useState, useEffect } from "react";
import { RankBadge } from "@/components/RankBadge";
import { getRankTier, getRankInfo } from "@typeoff/shared";
import type { RankTier } from "@typeoff/shared";

interface PlacementRevealProps {
  elo: number;
  onContinue: () => void;
}

export function PlacementReveal({ elo, onContinue }: PlacementRevealProps) {
  const [revealed, setRevealed] = useState(false);
  const tier = getRankTier(elo) as RankTier;
  const rankInfo = getRankInfo(elo);

  useEffect(() => {
    const timer = setTimeout(() => setRevealed(true), 600);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex flex-col items-center gap-8 animate-fade-in">
      <div className="flex flex-col items-center gap-2">
        <span className="text-accent text-sm uppercase tracking-[0.2em] font-bold">
          Placement Complete
        </span>
        <h2 className="text-3xl font-black text-text">
          You have been ranked
        </h2>
      </div>

      <div
        className={`flex flex-col items-center gap-4 transition-all duration-700 ${
          revealed
            ? "opacity-100 scale-100"
            : "opacity-0 scale-75"
        }`}
      >
        <div className={`text-4xl font-black text-rank-${tier}`}>
          {rankInfo.label}
        </div>
        <RankBadge tier={tier} elo={elo} size="md" />
      </div>

      <p className="text-muted text-sm text-center max-w-sm">
        Your initial rank is based on your placement race performance.
        Win ranked matches to climb.
      </p>

      <button
        onClick={onContinue}
        className="rounded-lg border border-accent/30 bg-accent/15 text-accent px-10 py-3.5 font-bold hover:bg-accent/25 hover:border-accent/50 transition-colors"
      >
        Start Ranked
      </button>
    </div>
  );
}
