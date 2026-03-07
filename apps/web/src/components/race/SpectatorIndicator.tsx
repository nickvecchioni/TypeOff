"use client";

import React from "react";

interface SpectatorIndicatorProps {
  count: number;
  spectators: Array<{ userId: string; name: string }>;
}

export function SpectatorIndicator({ count, spectators }: SpectatorIndicatorProps) {
  if (count === 0) return null;

  return (
    <div className="relative group cursor-default select-none">
      <div className="flex items-center gap-1.5 text-muted/65 text-xs px-2 py-1 rounded-md bg-white/[0.03] ring-1 ring-white/[0.06]">
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-accent/60"
        >
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
        <span className="tabular-nums font-medium">{count}</span>
      </div>
      {/* Hover tooltip with spectator names */}
      <div className="absolute right-0 top-full mt-1 z-20 hidden group-hover:block bg-surface border border-white/[0.08] rounded-md py-1.5 px-2.5 min-w-[120px] shadow-xl">
        <div className="text-xs text-muted/60 uppercase tracking-wider font-bold mb-1">
          Watching
        </div>
        {spectators.map((s) => (
          <div key={s.userId} className="text-xs text-muted/70 py-0.5 truncate">
            {s.name}
          </div>
        ))}
      </div>
    </div>
  );
}
