"use client";

import type { RankTier } from "@typeoff/shared";

const TIER_CLASSES: Record<RankTier, string> = {
  bronze: "text-rank-bronze bg-rank-bronze/15",
  silver: "text-rank-silver bg-rank-silver/15",
  gold: "text-rank-gold bg-rank-gold/15",
  platinum: "text-rank-platinum bg-rank-platinum/15",
  diamond: "text-rank-diamond bg-rank-diamond/15",
  master: "text-rank-master bg-rank-master/15",
};

interface RankBadgeProps {
  tier: RankTier;
  elo?: number;
  size?: "sm" | "md";
}

export function RankBadge({ tier, elo, size = "sm" }: RankBadgeProps) {
  const sizeClasses = size === "md" ? "text-sm px-3 py-1" : "text-xs px-2 py-0.5";

  return (
    <span
      className={`rounded-full font-bold capitalize inline-flex items-center gap-1 ${sizeClasses} ${TIER_CLASSES[tier]}`}
    >
      {tier}
      {elo != null && <span className="tabular-nums">{elo}</span>}
    </span>
  );
}
