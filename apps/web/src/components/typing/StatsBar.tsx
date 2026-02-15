"use client";

import React from "react";
import type { TestConfig } from "@typeoff/shared";

interface StatsBarProps {
  wpm: number;
  accuracy: number;
  timeLeft: number;
  config: TestConfig;
  visible: boolean;
}

export function StatsBar({ wpm, accuracy, timeLeft, config, visible }: StatsBarProps) {
  if (!visible) return null;

  return (
    <div className="flex items-center gap-6 text-2xl tabular-nums animate-fade-in">
      {config.mode === "timed" && (
        <span className="text-accent font-bold">{timeLeft}</span>
      )}
      <span className="text-text">
        {wpm} <span className="text-muted text-sm">wpm</span>
      </span>
      <span className="text-text">
        {accuracy}
        <span className="text-muted text-sm">%</span>
      </span>
    </div>
  );
}
