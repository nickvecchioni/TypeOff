"use client";

import React from "react";
import type { TypePassReward } from "@typeoff/shared";
import { CURSOR_STYLES, PROFILE_BORDERS, TYPING_THEMES } from "@typeoff/shared";

interface RewardCardProps {
  reward: TypePassReward;
  isOwned: boolean;
  isReached: boolean;
  isLocked: boolean;
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

export function RewardCard({ reward, isOwned, isReached, isLocked }: RewardCardProps) {
  return (
    <div
      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 ring-1 ${
        isOwned
          ? "ring-correct/20 bg-correct/[0.04]"
          : isReached && !isLocked
          ? "ring-amber-400/20 bg-amber-400/[0.04]"
          : "ring-white/[0.04] bg-surface/30"
      }`}
    >
      {/* Icon / preview */}
      <span
        className={`text-lg shrink-0 ${
          isLocked && !isReached ? "opacity-30 grayscale" : ""
        }`}
      >
        {reward.type === "badge"
          ? reward.value
          : REWARD_TYPE_ICON[reward.type]}
      </span>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className={`text-xs font-medium truncate ${
              isOwned || isReached ? "text-text" : "text-muted/60"
            }`}
          >
            {reward.name}
          </span>
          {isOwned && (
            <span className="text-correct text-xs shrink-0">&#10003;</span>
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

      {/* Visual preview */}
      <RewardPreview reward={reward} isLocked={isLocked && !isReached} />
    </div>
  );
}

function RewardPreview({ reward, isLocked }: { reward: TypePassReward; isLocked: boolean }) {
  const dimClass = isLocked ? "opacity-30" : "";

  switch (reward.type) {
    case "nameColor":
      return (
        <span
          className={`w-4 h-4 rounded-full shrink-0 ring-1 ring-white/10 ${dimClass}`}
          style={{ backgroundColor: reward.value }}
        />
      );

    case "cursorStyle": {
      const def = CURSOR_STYLES[reward.id];
      if (!def) return null;
      return (
        <span
          className={`shrink-0 rounded-sm ${dimClass}`}
          style={{
            width: def.shape === "line" ? 2 : "0.7ch",
            height: def.shape === "underline" ? 2 : 14,
            backgroundColor: def.color,
            boxShadow: def.glowColor ? `0 0 4px ${def.glowColor}` : undefined,
          }}
        />
      );
    }

    case "profileBorder": {
      const def = PROFILE_BORDERS[reward.id];
      if (!def) return null;
      return (
        <span
          className={`w-5 h-5 rounded shrink-0 ring-1 ring-white/10 ${def.className} ${dimClass}`}
        />
      );
    }

    case "typingTheme": {
      const def = TYPING_THEMES[reward.id];
      if (!def) return null;
      return (
        <span className={`flex gap-0.5 shrink-0 ${dimClass}`}>
          {def.palette.map((c, i) => (
            <span
              key={i}
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: c }}
            />
          ))}
        </span>
      );
    }

    default:
      return null;
  }
}
