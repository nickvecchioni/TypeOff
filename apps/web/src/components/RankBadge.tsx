"use client";

import type { RankTier } from "@typeoff/shared";
import { getRankInfo } from "@typeoff/shared";

const TIER_CLASSES: Record<RankTier, string> = {
  bronze: "text-rank-bronze bg-rank-bronze/20 ring-1 ring-rank-bronze/25",
  silver: "text-rank-silver bg-rank-silver/20 ring-1 ring-rank-silver/25",
  gold: "text-rank-gold bg-rank-gold/20 ring-1 ring-rank-gold/25",
  platinum: "text-rank-platinum bg-rank-platinum/20 ring-1 ring-rank-platinum/25",
  diamond: "text-rank-diamond bg-rank-diamond/20 ring-1 ring-rank-diamond/25",
  master: "text-rank-master bg-rank-master/20 ring-1 ring-rank-master/25",
  grandmaster: "text-rank-grandmaster bg-rank-grandmaster/20 ring-1 ring-rank-grandmaster/25",
};

interface RankBadgeProps {
  tier: RankTier;
  elo?: number;
  size?: "sm" | "md";
}

export function RankBadge({ tier, elo, size = "sm" }: RankBadgeProps) {
  const sizeClasses = size === "md" ? "text-sm px-3 py-1" : "text-sm px-2.5 py-0.5";
  const info = elo != null ? getRankInfo(elo) : null;
  // Use ELO-derived tier for colors when available (DB tier may be stale)
  const colorTier = info ? info.tier : tier;
  const displayLabel = info ? info.label : tier.charAt(0).toUpperCase() + tier.slice(1);

  return (
    <span
      className={`rounded-full font-bold inline-flex items-center gap-1 ${sizeClasses} ${TIER_CLASSES[colorTier]}`}
    >
      {displayLabel}
      {elo != null && <span className="tabular-nums">{elo}</span>}
    </span>
  );
}
