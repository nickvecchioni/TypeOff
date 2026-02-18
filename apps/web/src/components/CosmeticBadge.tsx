"use client";

import React from "react";

interface CosmeticBadgeProps {
  badge: string | null | undefined;
}

/** Renders an active badge emoji next to a username */
export function CosmeticBadge({ badge }: CosmeticBadgeProps) {
  if (!badge) return null;

  // Look up the emoji from the badge cosmetic ID
  // Badge values are stored as emoji strings directly in the reward definition
  // The cosmeticId maps to a reward whose value is the emoji
  return (
    <span className="shrink-0 text-sm" title="Badge">
      {getBadgeEmoji(badge)}
    </span>
  );
}

/** Map known badge IDs to their emoji values */
const BADGE_EMOJI: Record<string, string> = {
  s1_badge_spark: "\u2728",
  s1_badge_flame: "\uD83D\uDD25",
  s1_badge_bolt: "\u26A1",
  s1_badge_star: "\u2B50",
  s1_badge_gem: "\uD83D\uDC8E",
  s1_badge_trophy: "\uD83C\uDFC6",
  s1_badge_crown: "\uD83D\uDC51",
  s1_badge_rocket: "\uD83D\uDE80",
  s1_badge_fire: "\uD83C\uDF1F",
  s1_badge_dragon: "\uD83D\uDC09",
};

function getBadgeEmoji(badgeId: string): string {
  return BADGE_EMOJI[badgeId] ?? "";
}
