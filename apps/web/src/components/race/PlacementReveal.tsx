"use client";

import React, { useState, useEffect } from "react";
import { getRankTier } from "@typeoff/shared";
import type { RankTier } from "@typeoff/shared";
import { RankBadge } from "@/components/RankBadge";

interface PlacementRevealProps {
  elo: number;
  wpm?: number;
  accuracy?: number;
  onContinue: () => void;
  subtitle?: string;
  ctaLabel?: string;
  ctaContent?: React.ReactNode;
}

const TIER_GLOW: Record<RankTier, string> = {
  bronze: "drop-shadow(0 0 24px rgba(217, 119, 6, 0.4))",
  silver: "drop-shadow(0 0 24px rgba(156, 163, 175, 0.4))",
  gold: "drop-shadow(0 0 24px rgba(234, 179, 8, 0.4))",
  platinum: "drop-shadow(0 0 24px rgba(103, 232, 249, 0.4))",
  diamond: "drop-shadow(0 0 24px rgba(59, 130, 246, 0.4))",
  master: "drop-shadow(0 0 24px rgba(168, 85, 247, 0.4))",
  grandmaster: "drop-shadow(0 0 24px rgba(239, 68, 68, 0.4))",
};

export function PlacementReveal({ elo, wpm, accuracy, onContinue, subtitle, ctaLabel, ctaContent }: PlacementRevealProps) {
  const [phase, setPhase] = useState<"intro" | "reveal">("intro");
  const tier = getRankTier(elo) as RankTier;

  useEffect(() => {
    const timer = setTimeout(() => setPhase("reveal"), 800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex flex-col items-center gap-10 animate-fade-in">
      {/* Heading */}
      <div className="flex flex-col items-center gap-1">
        <span className="text-accent text-xs uppercase tracking-[0.25em] font-bold">
          Placement Complete
        </span>
      </div>

      {/* Rank reveal */}
      <div
        className={`flex flex-col items-center gap-3 transition-all duration-700 ease-out ${
          phase === "reveal"
            ? "opacity-100 scale-100 translate-y-0"
            : "opacity-0 scale-90 translate-y-4"
        }`}
        style={{
          filter: phase === "reveal" ? TIER_GLOW[tier] : "none",
          transitionProperty: "opacity, transform, filter",
        }}
      >
        <RankBadge tier={tier} elo={elo} size="md" />
      </div>

      {/* Stats */}
      {wpm != null && accuracy != null && (
        <div className="flex gap-8">
          <div className="text-center">
            <div className="text-3xl font-black text-accent tabular-nums text-glow-accent">
              {Math.round(wpm)}
            </div>
            <div className="text-xs text-muted mt-1">WPM</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-black text-text tabular-nums">
              {accuracy.toFixed(1)}%
            </div>
            <div className="text-xs text-muted mt-1">Accuracy</div>
          </div>
        </div>
      )}

      {/* Subtitle */}
      {subtitle && (
        <p className="text-muted text-sm text-center whitespace-nowrap">
          {subtitle}
        </p>
      )}

      {/* CTA */}
      <div className={`${phase === "reveal" ? "opacity-100" : "opacity-0"} transition-opacity duration-500`}>
        {ctaContent ?? (
          <button
            onClick={onContinue}
            className="rounded-lg bg-accent text-bg px-10 py-3.5 text-sm font-bold tracking-wide uppercase hover:bg-accent/90 transition-colors glow-accent-strong"
          >
            {ctaLabel ?? "Start Ranked"}
          </button>
        )}
      </div>
    </div>
  );
}
