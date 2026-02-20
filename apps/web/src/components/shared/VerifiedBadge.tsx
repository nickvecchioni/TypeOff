"use client";

import React from "react";

interface VerifiedBadgeProps {
  flagged: boolean;
  hasReplay: boolean;
}

/**
 * Small checkmark shown when a result is verified (not flagged + has replay data).
 */
export function VerifiedBadge({ flagged, hasReplay }: VerifiedBadgeProps) {
  if (flagged || !hasReplay) return null;

  return (
    <span
      className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-correct/10 text-correct shrink-0"
      title="Verified result — replay data available"
    >
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    </span>
  );
}
