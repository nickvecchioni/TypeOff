"use client";

import React from "react";
import { BADGE_EMOJIS } from "@typeoff/shared";

interface CosmeticBadgeProps {
  badge: string | null | undefined;
}

/** Renders an active badge emoji next to a username */
export function CosmeticBadge({ badge }: CosmeticBadgeProps) {
  if (!badge) return null;

  const emoji = BADGE_EMOJIS[badge] ?? "";
  if (!emoji) return null;

  return (
    <span className="shrink-0 text-sm" title="Badge">
      {emoji}
    </span>
  );
}
