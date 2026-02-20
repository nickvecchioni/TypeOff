"use client";

import React, { useState } from "react";
import { useResultCard } from "@/hooks/useResultCard";
import { getRankInfo } from "@typeoff/shared";

interface ShareResultCardProps {
  wpm: number;
  accuracy: number;
  elo?: number;
  username: string;
  mode: string;
}

export function ShareResultCard({ wpm, accuracy, elo, username, mode }: ShareResultCardProps) {
  const [copied, setCopied] = useState(false);

  const rankLabel = elo != null ? getRankInfo(elo).label : mode;
  const date = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  const { download, copyToClipboard } = useResultCard({ wpm, accuracy, rankLabel, username, mode, date });

  const handleCopy = async () => {
    try {
      await copyToClipboard();
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      download();
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={download}
        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-surface/60 ring-1 ring-white/[0.06] text-muted hover:text-text hover:ring-accent/20 transition-all"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        Save
      </button>
      <button
        onClick={handleCopy}
        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-surface/60 ring-1 ring-white/[0.06] text-muted hover:text-text hover:ring-accent/20 transition-all"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
        {copied ? "Copied!" : "Copy"}
      </button>
    </div>
  );
}
