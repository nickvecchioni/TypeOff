"use client";

import React, { useState, useEffect, useCallback } from "react";
import { RankBadge } from "@/components/RankBadge";
import { getRankInfo } from "@typeoff/shared";
import type { RankTier } from "@typeoff/shared";

interface RankChangeEvent {
  tier: RankTier;
  elo: number;
  direction: "up" | "down";
}

export function RankUpOverlay() {
  const [data, setData] = useState<RankChangeEvent | null>(null);
  const [visible, setVisible] = useState(false);

  const dismiss = useCallback(() => {
    setVisible(false);
    setTimeout(() => setData(null), 300);
  }, []);

  useEffect(() => {
    function handleRankChange(e: Event) {
      const detail = (e as CustomEvent<RankChangeEvent>).detail;
      setData(detail);
      requestAnimationFrame(() => setVisible(true));
    }
    window.addEventListener("rank-up", handleRankChange);
    return () => window.removeEventListener("rank-up", handleRankChange);
  }, []);

  useEffect(() => {
    if (!data) return;
    const timer = setTimeout(dismiss, 4000);
    return () => clearTimeout(timer);
  }, [data, dismiss]);

  if (!data) return null;

  const isUp = data.direction === "up";
  const info = getRankInfo(data.elo);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-bg/85 backdrop-blur-sm"
      onClick={dismiss}
    >
      <div
        className={`flex flex-col items-center gap-5 rounded-2xl border border-surface-bright bg-surface px-12 py-10 shadow-2xl transition-all duration-500 ${
          visible ? "opacity-100 scale-100" : "opacity-0 scale-75"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <span className="text-xs text-muted uppercase tracking-[0.2em] font-bold">
          {isUp ? "Rank Up" : "Rank Down"}
        </span>
        <h2 className={`text-3xl font-black uppercase tracking-wide text-rank-${data.tier}`}>
          {info.label}
        </h2>
        <div className={isUp ? "animate-rank-up-glow" : ""}>
          <RankBadge tier={data.tier} elo={data.elo} size="md" />
        </div>
      </div>
    </div>
  );
}
