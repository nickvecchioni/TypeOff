"use client";

import React, { useRef, useEffect } from "react";
import type { SeasonDefinition } from "@typeoff/shared";
import { CURSOR_STYLES, PROFILE_BORDERS, TYPING_THEMES } from "@typeoff/shared";

interface TierTrackProps {
  season: SeasonDefinition;
  tier: number;
  isPremium: boolean;
  ownedSet: Set<string>;
}

const REWARD_TYPE_ICON: Record<string, string> = {
  badge: "\uD83C\uDFC5",
  title: "\uD83C\uDFF7\uFE0F",
  nameColor: "\uD83C\uDFA8",
  nameEffect: "\u2728",
  cursorStyle: "\uD83D\uDD32",
  profileBorder: "\uD83D\uDDBC\uFE0F",
  typingTheme: "\uD83C\uDFA8",
};

export function TierTrack({ season, tier, isPremium, ownedSet }: TierTrackProps) {
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = document.getElementById("current-tier");
    if (el && trackRef.current) {
      trackRef.current.scrollTo({
        left: el.offsetLeft - trackRef.current.clientWidth / 2 + el.clientWidth / 2,
        behavior: "smooth",
      });
    }
  }, [tier]);

  return (
    <div
      ref={trackRef}
      className="overflow-x-auto pb-4 -mx-4 px-4 sm:-mx-6 sm:px-6"
    >
      <div className="flex gap-2" style={{ minWidth: `${season.maxTier * 100}px` }}>
        {Array.from({ length: season.maxTier }, (_, i) => {
          const t = i + 1;
          const reward = season.rewards.find((r) => r.tier === t);
          const isReached = t <= tier;
          const isCurrent = t === tier + 1;
          const isOwned = reward ? ownedSet.has(reward.id) : false;
          const isLocked = reward?.premium && !isPremium;

          return (
            <div
              key={t}
              id={isCurrent ? "current-tier" : undefined}
              className={`flex flex-col items-center gap-1.5 rounded-lg p-3 min-w-[88px] ring-1 transition-all ${
                isCurrent
                  ? "ring-amber-400/40 bg-amber-400/[0.06]"
                  : isReached
                  ? "ring-white/[0.08] bg-surface/60"
                  : "ring-white/[0.04] bg-surface/30"
              }`}
            >
              <span
                className={`text-xs font-bold tabular-nums ${
                  isReached
                    ? "text-amber-400"
                    : isCurrent
                    ? "text-text"
                    : "text-muted/40"
                }`}
              >
                {t}
              </span>

              {reward ? (
                <div className="flex flex-col items-center gap-1">
                  <span
                    className={`text-xl ${
                      isLocked && !isReached
                        ? "opacity-30 grayscale"
                        : isReached || isOwned
                        ? ""
                        : "opacity-50"
                    }`}
                  >
                    {reward.type === "badge"
                      ? reward.value
                      : REWARD_TYPE_ICON[reward.type]}
                  </span>
                  <span
                    className={`text-[10px] font-medium text-center leading-tight ${
                      isReached ? "text-text" : "text-muted/60"
                    }`}
                  >
                    {reward.name}
                  </span>
                  <span
                    className={`text-[9px] font-bold uppercase tracking-wider rounded px-1.5 py-0.5 ${
                      reward.premium
                        ? "bg-amber-400/10 text-amber-400"
                        : "bg-white/[0.04] text-muted/60"
                    }`}
                  >
                    {reward.premium ? "Premium" : "Free"}
                  </span>
                </div>
              ) : (
                <div className="h-12" />
              )}

              {isReached && (
                <span className="text-correct text-xs">&#10003;</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
