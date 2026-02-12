"use client";

import React from "react";
import type { TestStats } from "@typeoff/shared";
import { WpmChart } from "./WpmChart";

interface ResultsProps {
  stats: TestStats;
  onRestart: () => void;
}

export function Results({ stats, onRestart }: ResultsProps) {
  return (
    <div className="flex flex-col items-center gap-8 animate-fade-in">
      {/* Big numbers */}
      <div className="flex items-baseline gap-12">
        <div className="text-center">
          <div className="text-6xl font-bold text-accent tabular-nums">
            {stats.wpm}
          </div>
          <div className="text-sm text-muted mt-1">wpm</div>
        </div>
        <div className="text-center">
          <div className="text-6xl font-bold text-text tabular-nums">
            {stats.accuracy}
            <span className="text-3xl text-muted">%</span>
          </div>
          <div className="text-sm text-muted mt-1">accuracy</div>
        </div>
      </div>

      {/* Detail grid */}
      <div className="grid grid-cols-4 gap-6 text-center">
        <div>
          <div className="text-lg text-text tabular-nums">{stats.rawWpm}</div>
          <div className="text-xs text-muted">raw wpm</div>
        </div>
        <div>
          <div className="text-lg text-text tabular-nums">{stats.correctChars}</div>
          <div className="text-xs text-muted">correct</div>
        </div>
        <div>
          <div className="text-lg text-text tabular-nums">
            {stats.incorrectChars + stats.extraChars}
          </div>
          <div className="text-xs text-muted">errors</div>
        </div>
        <div>
          <div className="text-lg text-text tabular-nums">{stats.time}s</div>
          <div className="text-xs text-muted">time</div>
        </div>
      </div>

      {/* WPM chart */}
      <WpmChart samples={stats.wpmHistory} />

      {/* Restart hint */}
      <button
        onClick={onRestart}
        className="text-muted hover:text-accent transition-colors text-sm"
      >
        press <kbd className="px-1.5 py-0.5 rounded bg-surface text-text text-xs">tab</kbd> or click to restart
      </button>
    </div>
  );
}
