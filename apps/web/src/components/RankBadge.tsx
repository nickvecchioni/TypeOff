"use client";

import type { RankTier } from "@typeoff/shared";
import { getRankInfo } from "@typeoff/shared";

const TIER_CLASSES: Record<RankTier, string> = {
  bronze: "text-rank-bronze bg-rank-bronze/15",
  silver: "text-rank-silver bg-rank-silver/15",
  gold: "text-rank-gold bg-rank-gold/15",
  platinum: "text-rank-platinum bg-rank-platinum/15",
  diamond: "text-rank-diamond bg-rank-diamond/15",
  master: "text-rank-master bg-rank-master/15",
  grandmaster: "text-rank-grandmaster bg-rank-grandmaster/15",
};

interface RankBadgeProps {
  tier: RankTier;
  elo?: number;
  size?: "sm" | "md";
}

export function RankBadge({ tier, elo, size = "sm" }: RankBadgeProps) {
  const sizeClasses = size === "md" ? "text-sm px-3 py-1" : "text-xs px-2 py-0.5";
  const info = elo != null ? getRankInfo(elo) : null;
  const displayLabel = info ? info.label : tier.charAt(0).toUpperCase() + tier.slice(1);

  return (
    <span
      className={`rounded-full font-bold inline-flex items-center gap-1 ${sizeClasses} ${TIER_CLASSES[tier]}`}
    >
      {displayLabel}
      {elo != null && <span className="tabular-nums">{elo}</span>}
    </span>
  );
}
