"use client";

import React, { useState } from "react";
import { useResultCard, type ResultCardData } from "@/hooks/useResultCard";

interface ShareResultCardProps {
  data: ResultCardData;
}

export function ShareResultCard({ data }: ShareResultCardProps) {
  const [copied, setCopied] = useState(false);
  const { copyToClipboard, download } = useResultCard(data);

  const handleShare = async () => {
    try {
      await copyToClipboard();
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      download();
    }
  };

  return (
    <button
      onClick={handleShare}
      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-surface/60 ring-1 ring-white/[0.06] text-muted hover:text-text hover:ring-accent/20 transition-all"
    >
      {copied ? (
        <>
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Copied!
        </>
      ) : (
        <>
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
            <polyline points="16 6 12 2 8 6" />
            <line x1="12" y1="2" x2="12" y2="15" />
          </svg>
          Share
        </>
      )}
    </button>
  );
}
