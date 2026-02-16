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
      className="fixed inset-0 z-50 flex items-center justify-center bg-bg/80"
      onClick={dismiss}
    >
      <div
        className={`flex flex-col items-center gap-4 rounded-xl bg-surface px-10 py-8 shadow-2xl transition-all duration-500 ${
          visible ? "opacity-100 scale-100" : "opacity-0 scale-75"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <span className="text-xs text-muted uppercase tracking-widest">
          {isUp ? "Rank Up" : "Rank Down"}
        </span>
        <h2 className={`text-2xl font-black uppercase tracking-wide text-rank-${data.tier}`}>
          {info.label}
        </h2>
        <div className={isUp ? "animate-rank-up-glow" : ""}>
          <RankBadge tier={data.tier} elo={data.elo} size="md" />
        </div>
      </div>
    </div>
  );
}
