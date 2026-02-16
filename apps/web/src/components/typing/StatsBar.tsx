"use client";

import React from "react";
import type { TestConfig } from "@typeoff/shared";

interface StatsBarProps {
  wpm: number;
  timeLeft: number;
  config: TestConfig;
  visible: boolean;
}

export function StatsBar({ wpm, timeLeft, config, visible }: StatsBarProps) {
  return (
    <div className={`flex items-center gap-6 text-2xl tabular-nums transition-opacity duration-150 ${visible ? "opacity-100" : "opacity-0"}`}>
      {config.mode === "timed" && (
        <span className="text-accent font-bold">{timeLeft}</span>
      )}
      <span className="text-text">
        {wpm} <span className="text-muted text-sm">wpm</span>
      </span>
    </div>
  );
}
