"use client";

import React, { useEffect, useState } from "react";
import type { SeasonDefinition } from "@typeoff/shared";

interface ProgressHeaderProps {
  season: SeasonDefinition;
  tier: number;
  xp: number;
  isPremium: boolean;
  purchasing: boolean;
  purchaseError: string | null;
  onPurchase: () => void;
}

function useSeasonCountdown(endDate: string) {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    function calc() {
      const end = new Date(endDate + "T23:59:59Z");
      const diff = end.getTime() - Date.now();
      if (diff <= 0) return "Season ended";

      const days = Math.floor(diff / 86400000);
      const hours = Math.floor((diff % 86400000) / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);

      if (days > 0) return `${days}d ${hours}h`;
      if (hours > 0) return `${hours}h ${minutes}m`;
      return `${minutes}m`;
    }

    setTimeLeft(calc());
    const timer = setInterval(() => setTimeLeft(calc()), 60000);
    return () => clearInterval(timer);
  }, [endDate]);

  return timeLeft;
}

export function ProgressHeader({
  season,
  tier,
  xp,
  isPremium,
  purchasing,
  purchaseError,
  onPurchase,
}: ProgressHeaderProps) {
  const timeLeft = useSeasonCountdown(season.endDate);
  const xpInTier = xp % season.xpPerTier;
  const xpPct = tier >= season.maxTier ? 100 : (xpInTier / season.xpPerTier) * 100;

  return (
    <div className="space-y-6 mb-6">
      {/* Title row */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-black text-text uppercase tracking-wider">
            {season.name}
          </h1>
          <p className="text-sm text-muted mt-0.5">
            {timeLeft} remaining
          </p>
        </div>
        {!isPremium && (
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <button
              onClick={onPurchase}
              disabled={purchasing}
              className="rounded-lg bg-amber-400 text-bg px-6 py-2.5 text-sm font-bold tracking-wide uppercase hover:bg-amber-300 transition-colors disabled:opacity-50"
            >
              {purchasing ? "Loading..." : `Upgrade \u2014 $${season.priceUsd}`}
            </button>
            {purchaseError && (
              <p className="text-xs text-error">{purchaseError}</p>
            )}
          </div>
        )}
        {isPremium && (
          <span className="text-sm font-bold text-amber-400 bg-amber-400/10 rounded-lg px-4 py-2 uppercase tracking-wider">
            Premium Active
          </span>
        )}
      </div>

      {/* Progress bar */}
      <div className="rounded-xl bg-surface/50 ring-1 ring-white/[0.04] p-5">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-text tabular-nums">
              Tier {tier}
            </span>
            <span className="text-sm text-muted/60">/ {season.maxTier}</span>
          </div>
          <span className="text-sm text-muted tabular-nums">
            {xp.toLocaleString()} XP total
          </span>
        </div>
        <div className="h-2 rounded-full bg-surface overflow-hidden">
          <div
            className="h-full rounded-full bg-amber-400 transition-all"
            style={{ width: `${Math.round(xpPct)}%` }}
          />
        </div>
        <p className="text-xs text-muted mt-1.5 tabular-nums">
          {tier >= season.maxTier
            ? "Max tier reached!"
            : `${xpInTier} / ${season.xpPerTier} XP to Tier ${tier + 1}`}
        </p>
      </div>
    </div>
  );
}
