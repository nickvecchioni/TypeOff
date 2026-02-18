"use client";

import React, { useEffect, useState, useRef } from "react";
import type { KeyPassReward, SeasonDefinition } from "@typeoff/shared";

interface KeyPassData {
  season: SeasonDefinition | null;
  userState: {
    seasonalXp: number;
    currentTier: number;
    isPremium: boolean;
  } | null;
  cosmetics: string[];
}

const REWARD_TYPE_ICON: Record<string, string> = {
  badge: "\uD83C\uDFC5",
  title: "\uD83C\uDFF7\uFE0F",
  nameColor: "\uD83C\uDFA8",
  nameEffect: "\u2728",
};

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

export default function KeyPassPage() {
  const [data, setData] = useState<KeyPassData | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/key-pass")
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        // Scroll to current tier after data loads
        setTimeout(() => {
          const el = document.getElementById("current-tier");
          if (el && trackRef.current) {
            trackRef.current.scrollTo({
              left: el.offsetLeft - trackRef.current.clientWidth / 2 + el.clientWidth / 2,
              behavior: "smooth",
            });
          }
        }, 100);
      })
      .catch(() => {});
  }, []);

  const season = data?.season;
  const timeLeft = useSeasonCountdown(season?.endDate ?? "2026-12-31");

  if (!data) {
    return (
      <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="h-[400px] rounded-xl bg-surface/40 animate-pulse" />
        </div>
      </main>
    );
  }

  if (!season) {
    return (
      <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-8">
        <div className="max-w-4xl mx-auto text-center py-16">
          <p className="text-muted text-sm">No active season. Check back soon.</p>
        </div>
      </main>
    );
  }

  const tier = data.userState?.currentTier ?? 0;
  const xp = data.userState?.seasonalXp ?? 0;
  const isPremium = data.userState?.isPremium ?? false;
  const xpInTier = xp % season.xpPerTier;
  const xpPct = tier >= season.maxTier ? 100 : (xpInTier / season.xpPerTier) * 100;
  const ownedSet = new Set(data.cosmetics);

  async function handlePurchase() {
    setPurchasing(true);
    try {
      const res = await fetch("/api/key-pass/checkout", { method: "POST" });
      const body = await res.json();
      if (body.url) {
        window.location.href = body.url;
      }
    } catch {
      setPurchasing(false);
    }
  }

  return (
    <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-8">
      <div className="max-w-4xl mx-auto animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-lg font-black text-text uppercase tracking-wider">
              {season.name}
            </h1>
            <p className="text-sm text-muted mt-0.5">
              {timeLeft} remaining
            </p>
          </div>
          {!isPremium && (
            <button
              onClick={handlePurchase}
              disabled={purchasing}
              className="rounded-lg bg-amber-400 text-bg px-6 py-2.5 text-sm font-bold tracking-wide uppercase hover:bg-amber-300 transition-colors disabled:opacity-50 shrink-0"
            >
              {purchasing ? "Loading..." : `Upgrade — $${season.priceUsd}`}
            </button>
          )}
          {isPremium && (
            <span className="text-sm font-bold text-amber-400 bg-amber-400/10 rounded-lg px-4 py-2 uppercase tracking-wider">
              Premium Active
            </span>
          )}
        </div>

        {/* Overall progress */}
        <div className="rounded-xl bg-surface/50 ring-1 ring-white/[0.04] p-5 mb-6">
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

        {/* Tier track */}
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

        {/* Reward list */}
        <div className="mt-6">
          <h2 className="text-sm font-bold text-muted/60 uppercase tracking-wider mb-3">
            All Rewards
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {season.rewards.map((reward) => {
              const isReached = reward.tier <= tier;
              const isOwned = ownedSet.has(reward.id);
              const isLocked = reward.premium && !isPremium;

              return (
                <div
                  key={reward.id}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 ring-1 ${
                    isOwned
                      ? "ring-correct/20 bg-correct/[0.04]"
                      : isReached && !isLocked
                      ? "ring-amber-400/20 bg-amber-400/[0.04]"
                      : "ring-white/[0.04] bg-surface/30"
                  }`}
                >
                  <span
                    className={`text-lg shrink-0 ${
                      isLocked && !isReached ? "opacity-30 grayscale" : ""
                    }`}
                  >
                    {reward.type === "badge"
                      ? reward.value
                      : REWARD_TYPE_ICON[reward.type]}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-medium truncate ${
                          isOwned ? "text-text" : isReached ? "text-text" : "text-muted/60"
                        }`}
                      >
                        {reward.name}
                      </span>
                      {isOwned && (
                        <span className="text-correct text-xs shrink-0">
                          &#10003;
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-muted/50 tabular-nums">
                        Tier {reward.tier}
                      </span>
                      <span
                        className={`text-[9px] font-bold uppercase tracking-wider ${
                          reward.premium ? "text-amber-400" : "text-muted/40"
                        }`}
                      >
                        {reward.premium ? "Premium" : "Free"}
                      </span>
                    </div>
                  </div>
                  {reward.type === "nameColor" && (
                    <span
                      className="w-4 h-4 rounded-full shrink-0 ring-1 ring-white/10"
                      style={{ backgroundColor: reward.value }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </main>
  );
}
