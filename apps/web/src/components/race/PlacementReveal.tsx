"use client";

import React, { useState, useEffect } from "react";
import { getRankTier, getRankInfo } from "@typeoff/shared";
import type { RankTier } from "@typeoff/shared";

interface PlacementRevealProps {
  elo: number;
  wpm?: number;
  accuracy?: number;
  onContinue: () => void;
  subtitle?: string;
  ctaLabel?: string;
  ctaContent?: React.ReactNode;
}

const TIER_COLOR: Record<RankTier, string> = {
  bronze:      "#d97706",
  silver:      "#9ca3af",
  gold:        "#eab308",
  platinum:    "#67e8f9",
  diamond:     "#3b82f6",
  master:      "#a855f7",
  grandmaster: "#ef4444",
};

const TIER_MESSAGE: Record<RankTier, string> = {
  bronze:      "A solid start. The only way is up.",
  silver:      "Above average. Keep pushing.",
  gold:        "Impressive. You're ahead of most.",
  platinum:    "Elite speed. You're among the best.",
  diamond:     "Exceptional. Only a handful reach this.",
  master:      "World-class. You're nearly untouchable.",
  grandmaster: "Legendary. You're among the fastest in the world.",
};

export function PlacementReveal({ elo, wpm, accuracy, onContinue, subtitle, ctaLabel, ctaContent }: PlacementRevealProps) {
  const [phase, setPhase] = useState<"intro" | "reveal">("intro");
  const tier = getRankTier(elo) as RankTier;
  const info = getRankInfo(elo);
  const color = TIER_COLOR[tier];

  useEffect(() => {
    const timer = setTimeout(() => setPhase("reveal"), 600);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="relative flex flex-col items-center gap-8 w-full max-w-sm mx-auto px-4 py-8 animate-fade-in">

      {/* Ambient background glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 80% 50% at 50% 35%, ${color}18 0%, transparent 70%)`,
          transition: "opacity 1s ease",
          opacity: phase === "reveal" ? 1 : 0,
        }}
      />

      {/* Label */}
      <span className="relative text-xs font-bold uppercase tracking-[0.25em] text-muted/60">
        Placement Complete
      </span>

      {/* Rank reveal */}
      <div
        className="relative flex flex-col items-center gap-2 transition-all duration-700 ease-out"
        style={{
          opacity: phase === "reveal" ? 1 : 0,
          transform: phase === "reveal" ? "translateY(0) scale(1)" : "translateY(16px) scale(0.92)",
        }}
      >
        {/* Tier name — large */}
        <div
          className="text-6xl sm:text-7xl font-black tracking-tight leading-none"
          style={{
            color,
            textShadow: `0 0 40px ${color}66, 0 0 80px ${color}33`,
          }}
        >
          {tier.charAt(0).toUpperCase() + tier.slice(1)}
        </div>

        {/* Subdivision + ELO */}
        <div
          className="flex items-center gap-2 text-sm font-semibold"
          style={{ color: `${color}99` }}
        >
          <span>{info.label}</span>
          <span className="opacity-40">·</span>
          <span className="tabular-nums">{elo} ELO</span>
        </div>
      </div>

      {/* Stats */}
      {wpm != null && accuracy != null && (
        <div
          className="relative flex gap-10 transition-all duration-700 delay-150 ease-out"
          style={{
            opacity: phase === "reveal" ? 1 : 0,
            transform: phase === "reveal" ? "translateY(0)" : "translateY(12px)",
          }}
        >
          <div className="flex flex-col items-center gap-1">
            <div className="text-4xl font-black tabular-nums" style={{ color, textShadow: `0 0 20px ${color}55` }}>
              {Math.round(wpm)}
            </div>
            <div className="text-xs uppercase tracking-widest text-muted/60 font-bold">WPM</div>
          </div>
          <div className="w-px bg-white/[0.06] self-stretch" />
          <div className="flex flex-col items-center gap-1">
            <div className="text-4xl font-black tabular-nums text-text/80">
              {accuracy.toFixed(1)}<span className="text-2xl text-text/60">%</span>
            </div>
            <div className="text-xs uppercase tracking-widest text-muted/60 font-bold">Accuracy</div>
          </div>
        </div>
      )}

      {/* Flavor message */}
      <p
        className="relative text-xs text-muted/60 text-center leading-relaxed transition-all duration-700 delay-300 ease-out"
        style={{
          opacity: phase === "reveal" ? 1 : 0,
          transform: phase === "reveal" ? "translateY(0)" : "translateY(8px)",
        }}
      >
        {subtitle ?? TIER_MESSAGE[tier]}
      </p>

      {/* CTA */}
      <div
        className="relative flex flex-col items-center gap-2 transition-all duration-500 delay-500 ease-out"
        style={{
          opacity: phase === "reveal" ? 1 : 0,
          transform: phase === "reveal" ? "translateY(0)" : "translateY(8px)",
        }}
      >
        <p className="text-xs text-muted/65 text-center">
          Sign in to save your rank and start climbing.
        </p>
        {ctaContent ?? (
          <button
            onClick={onContinue}
            className="rounded-xl px-10 py-3.5 text-sm font-bold tracking-wide text-bg transition-all hover:brightness-110 active:scale-[0.98]"
            style={{
              background: color,
              boxShadow: `0 0 24px ${color}44`,
            }}
          >
            {ctaLabel ?? "Start Ranked"}
          </button>
        )}
      </div>
    </div>
  );
}
