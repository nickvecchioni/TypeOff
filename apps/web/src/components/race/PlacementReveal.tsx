"use client";

import React, { useState, useEffect } from "react";
import { RankBadge } from "@/components/RankBadge";
import { getRankTier } from "@typeoff/shared";
import type { RankTier } from "@typeoff/shared";

interface PlacementRevealProps {
  elo: number;
  onContinue: () => void;
}

export function PlacementReveal({ elo, onContinue }: PlacementRevealProps) {
  const [revealed, setRevealed] = useState(false);
  const tier = getRankTier(elo) as RankTier;

  useEffect(() => {
    const timer = setTimeout(() => setRevealed(true), 600);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex flex-col items-center gap-8 animate-fade-in">
      <div className="flex flex-col items-center gap-2">
        <span className="text-muted text-sm uppercase tracking-widest">
          Placements Complete
        </span>
        <h2 className="text-2xl font-bold text-text">
          You have been ranked
        </h2>
      </div>

      <div
        className={`transition-all duration-700 ${
          revealed
            ? "opacity-100 scale-100"
            : "opacity-0 scale-75"
        }`}
      >
        <RankBadge tier={tier} elo={elo} size="md" />
      </div>

      <p className="text-muted text-sm text-center max-w-sm">
        Your initial rank is based on your performance across 3 placement races.
        Win ranked matches to climb.
      </p>

      <button
        onClick={onContinue}
        className="rounded-lg bg-accent/20 text-accent px-8 py-3 font-bold hover:bg-accent/30 transition-colors"
      >
        Start Ranked
      </button>
    </div>
  );
}
