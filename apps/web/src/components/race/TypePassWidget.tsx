"use client";

import React from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  getXpLevel,
  COSMETIC_REWARDS,
} from "@typeoff/shared";

export function XpProgressWidget() {
  const { data: session } = useSession();

  if (!session?.user) {
    return (
      <div className="flex flex-col w-full h-full rounded-xl bg-surface/50 ring-1 ring-white/[0.04] overflow-hidden">
        <div className="h-px bg-gradient-to-r from-transparent via-accent/20 to-transparent" />
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

  const totalXp = session.user.totalXp ?? 0;
  const { level, currentXp, nextLevelXp } = getXpLevel(totalXp);
  const xpPct = (currentXp / nextLevelXp) * 100;

  // Next reward
  const nextReward = COSMETIC_REWARDS.find((r) => r.level === level + 1);
  const xpToNext = nextLevelXp - currentXp;

  return (
    <Link
      href="/cosmetics"
      className="flex flex-col w-full h-full rounded-xl bg-surface/50 ring-1 ring-white/[0.04] overflow-hidden hover:ring-accent/20 transition-all group"
    >
      <div className="h-px bg-gradient-to-r from-transparent via-accent/20 to-transparent" />
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-accent">
            Cosmetics
          </span>
          <span className="text-[11px] text-muted tabular-nums">
            Lvl {level}
          </span>
        </div>

        {/* Level + progress */}
        <div className="flex items-center gap-3">
          <span className="text-lg font-black text-text tabular-nums">
            {level}
          </span>

          <div className="flex-1">
            <div className="h-1.5 rounded-full bg-surface overflow-hidden">
              <div
                className="h-full rounded-full bg-accent transition-all"
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
          {xpToNext} XP to next level
        </p>
      </div>
    </Link>
  );
}
