"use client";

import React from "react";
import type { GhostCursor as GhostCursorType } from "@typeoff/shared";

interface GhostCursorProps {
  ghost: GhostCursorType;
}

/**
 * Semi-transparent ghost cursor rendered as an overlay.
 * Shows ghost name and WPM label above the cursor position.
 */
export function GhostCursorDisplay({ ghost }: GhostCursorProps) {
  return (
    <div className="flex items-center gap-1.5 text-purple-400/60">
      <div className="w-[2px] h-5 bg-purple-400/50 animate-pulse rounded-full" />
      <span className="text-[10px] font-bold whitespace-nowrap">
        {ghost.name} ({Math.floor(ghost.wpm)} wpm)
      </span>
    </div>
  );
}
