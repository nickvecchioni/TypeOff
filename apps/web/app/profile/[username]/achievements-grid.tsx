"use client";

import { useState } from "react";
import type {
  AchievementDefinition,
  AchievementCategory,
  AchievementRarity,
} from "@typeoff/shared";

interface AchievementsGridProps {
  achievements: AchievementDefinition[];
  unlocked: Array<{ id: string; unlockedAt: string }>;
}

const CATEGORIES: Array<{ value: AchievementCategory | "all"; label: string }> = [
  { value: "all", label: "All" },
  { value: "speed", label: "Speed" },
  { value: "accuracy", label: "Accuracy" },
  { value: "volume", label: "Volume" },
  { value: "wins", label: "Wins" },
  { value: "rank", label: "Rank" },
  { value: "social", label: "Social" },
];

const RARITY_STYLES: Record<AchievementRarity, { ring: string; glow: string }> = {
  common: { ring: "ring-white/[0.08]", glow: "" },
  rare: { ring: "ring-sky-400/30", glow: "" },
  epic: { ring: "ring-purple-400/40", glow: "shadow-[0_0_12px_rgba(168,85,247,0.15)]" },
  legendary: { ring: "ring-yellow-400/50", glow: "shadow-[0_0_16px_rgba(250,204,21,0.2)]" },
};

export function AchievementsGrid({ achievements, unlocked }: AchievementsGridProps) {
  const [filter, setFilter] = useState<AchievementCategory | "all">("all");

  const unlockedMap = new Map(unlocked.map((u) => [u.id, u.unlockedAt]));
  const filtered =
    filter === "all"
      ? achievements
      : achievements.filter((a) => a.category === filter);

  return (
    <div className="space-y-3">
      {/* Filter tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setFilter(cat.value)}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
              filter === cat.value
                ? "bg-accent/15 text-accent"
                : "text-muted/60 hover:text-muted hover:bg-white/[0.04]"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {filtered.map((achievement) => {
          const isUnlocked = unlockedMap.has(achievement.id);
          const unlockedAt = unlockedMap.get(achievement.id);
          const style = RARITY_STYLES[achievement.rarity];

          return (
            <div
              key={achievement.id}
              className={`relative rounded-lg px-3 py-3 ring-1 transition-all ${
                isUnlocked
                  ? `bg-surface/60 ${style.ring} ${style.glow}`
                  : "bg-surface/20 ring-white/[0.03] opacity-40 grayscale"
              }`}
            >
              <div className="flex items-start gap-2.5">
                <span className={`text-xl shrink-0 ${isUnlocked ? "" : "grayscale"}`}>
                  {achievement.icon}
                </span>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-text truncate">
                    {achievement.name}
                  </div>
                  <div className="text-[10px] text-muted/70 leading-snug mt-0.5">
                    {achievement.description}
                  </div>
                  {isUnlocked && unlockedAt && (
                    <div className="text-[10px] text-muted/40 mt-1 tabular-nums">
                      {new Date(unlockedAt).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
