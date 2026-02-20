"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import type { TypePassReward, SeasonDefinition } from "@typeoff/shared";

interface TypePassData {
  season: SeasonDefinition | null;
  userState: {
    seasonalXp: number;
    currentTier: number;
    isPremium: boolean;
  } | null;
  cosmetics: string[];
}

export function TypePassWidget() {
  const [data, setData] = useState<TypePassData | null>(null);

  useEffect(() => {
    fetch("/api/type-pass")
      .then((r) => r.json())
      .then(setData)
      .catch(() => {});
  }, []);

  if (!data) {
    return (
      <div className="flex flex-col w-full h-full rounded-xl bg-surface/50 ring-1 ring-white/[0.04] overflow-hidden">
        <div className="h-px bg-gradient-to-r from-transparent via-amber-400/20 to-transparent" />
        <div className="p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="w-16 h-3 rounded bg-surface-bright/20 animate-pulse" />
            <div className="w-12 h-3 rounded bg-surface-bright/15 animate-pulse" />
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-6 rounded bg-surface-bright/15 animate-pulse" />
            <div className="flex-1 h-1.5 rounded-full bg-surface-bright/10 animate-pulse" />
            <div className="w-5 h-5 rounded bg-surface-bright/10 animate-pulse" />
          </div>
          <div className="w-32 h-3 rounded bg-surface-bright/10 animate-pulse" />
        </div>
      </div>
    );
  }
  if (!data.season) return null;

  const season = data.season;
  const tier = data.userState?.currentTier ?? 0;
  const xp = data.userState?.seasonalXp ?? 0;
  const isPremium = data.userState?.isPremium ?? false;
  const xpInTier = xp % season.xpPerTier;
  const xpPct = tier >= season.maxTier ? 100 : (xpInTier / season.xpPerTier) * 100;

  // Next reward
  const nextReward = season.rewards.find(
    (r) => r.tier === tier + 1 && (!r.premium || isPremium),
  );

  // Season countdown
  const endDate = new Date(season.endDate + "T23:59:59Z");
  const daysLeft = Math.max(
    0,
    Math.ceil((endDate.getTime() - Date.now()) / 86400000),
  );

  return (
    <Link
      href="/type-pass"
      className="flex flex-col w-full h-full rounded-xl bg-surface/50 ring-1 ring-white/[0.04] overflow-hidden hover:ring-amber-400/20 transition-all group"
    >
      <div className="h-px bg-gradient-to-r from-transparent via-amber-400/20 to-transparent" />
      <div className="p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
            TypePass
          </span>
          {isPremium && (
            <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-400/10 text-amber-400 rounded px-1.5 py-0.5">
              Premium
            </span>
          )}
        </div>
        <span className="text-[11px] text-muted tabular-nums">
          {daysLeft}d left
        </span>
      </div>

      {/* Tier + progress */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className="text-lg font-black text-text tabular-nums">
            {tier}
          </span>
          <span className="text-xs text-muted/60">/ {season.maxTier}</span>
        </div>

        <div className="flex-1">
          <div className="h-1.5 rounded-full bg-surface overflow-hidden">
            <div
              className="h-full rounded-full bg-amber-400 transition-all"
              style={{ width: `${Math.round(xpPct)}%` }}
            />
          </div>
        </div>

        {nextReward && (
          <span className="text-base shrink-0" title={nextReward.name}>
            {nextReward.type === "badge"
              ? nextReward.value
              : nextReward.type === "nameColor"
              ? "\uD83C\uDFA8"
              : nextReward.type === "title"
              ? "\uD83C\uDFF7\uFE0F"
              : nextReward.type === "cursorStyle"
              ? "\uD83D\uDD32"
              : nextReward.type === "profileBorder"
              ? "\uD83D\uDDBC\uFE0F"
              : nextReward.type === "typingTheme"
              ? "\uD83C\uDFA8"
              : "\u2728"}
          </span>
        )}
      </div>

      <p className="text-[11px] text-muted/50 mt-1.5 group-hover:text-muted/70 transition-colors">
        {tier >= season.maxTier
          ? "Max tier reached!"
          : `${season.xpPerTier - xpInTier} XP to next tier`}
      </p>
      </div>
    </Link>
  );
}
