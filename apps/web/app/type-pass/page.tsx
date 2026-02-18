"use client";

import React, { useEffect, useState } from "react";
import type { SeasonDefinition } from "@typeoff/shared";
import { ProgressHeader } from "./ProgressHeader";
import { TierTrack } from "./TierTrack";
import { RewardCard } from "./RewardCard";

interface TypePassData {
  season: SeasonDefinition | null;
  userState: {
    seasonalXp: number;
    currentTier: number;
    isPremium: boolean;
  } | null;
  cosmetics: string[];
}

export default function TypePassPage() {
  const [data, setData] = useState<TypePassData | null>(null);
  const [purchasing, setPurchasing] = useState(false);

  useEffect(() => {
    fetch("/api/type-pass")
      .then((r) => r.json())
      .then(setData)
      .catch(() => {});
  }, []);

  const season = data?.season;

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
  const ownedSet = new Set(data.cosmetics);

  async function handlePurchase() {
    setPurchasing(true);
    try {
      const res = await fetch("/api/type-pass/checkout", { method: "POST" });
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
        <ProgressHeader
          season={season}
          tier={tier}
          xp={xp}
          isPremium={isPremium}
          purchasing={purchasing}
          onPurchase={handlePurchase}
        />

        <TierTrack
          season={season}
          tier={tier}
          isPremium={isPremium}
          ownedSet={ownedSet}
        />

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
                <RewardCard
                  key={reward.id}
                  reward={reward}
                  isOwned={isOwned}
                  isReached={isReached}
                  isLocked={isLocked}
                />
              );
            })}
          </div>
        </div>
      </div>
    </main>
  );
}
