"use client";

import React, { useEffect } from "react";
import type { TestStats, TestConfig } from "@typeoff/shared";
import { WpmChart } from "@/components/typing/WpmChart";

interface PracticeResultsProps {
  stats: TestStats;
  config: TestConfig;
  isPb: boolean | null;
  onRestart: () => void;
}

export function PracticeResults({ stats, config, isPb, onRestart }: PracticeResultsProps) {
  // Enter key shortcut to restart
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Enter" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || tag === "BUTTON" || tag === "A") return;
        e.preventDefault();
        onRestart();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onRestart]);

  const modeLabel = config.mode === "timed"
    ? `${config.duration}s`
    : `${config.duration} words`;

  return (
    <div className="flex flex-col items-center gap-6 w-full animate-slide-up">
      {/* Stats grid */}
      <div className="rounded-xl overflow-hidden ring-1 ring-white/[0.04] w-full">
        <div className="h-0.5 bg-accent opacity-50" />
        <div className="grid gap-px grid-cols-2 sm:grid-cols-4">
          {/* WPM */}
          <div className="bg-surface/40 p-4 sm:p-5">
            <div className="flex items-baseline gap-2">
              <div className="text-3xl font-black text-accent tabular-nums">
                {Math.floor(stats.wpm)}
                <span className="text-lg opacity-50">
                  .{(stats.wpm % 1).toFixed(2).slice(2)}
                </span>
              </div>
              {isPb && (
                <span className="text-[10px] font-bold text-correct bg-correct/10 rounded-full px-2 py-0.5">
                  PB
                </span>
              )}
            </div>
            <div className="text-[11px] text-muted/60 mt-1">wpm</div>
          </div>

          {/* Raw WPM */}
          <div className="bg-surface/40 p-4 sm:p-5">
            <div className="text-3xl font-black text-text tabular-nums">
              {Math.floor(stats.rawWpm)}
              <span className="text-lg opacity-50">
                .{(stats.rawWpm % 1).toFixed(2).slice(2)}
              </span>
            </div>
            <div className="text-[11px] text-muted/60 mt-1">raw wpm</div>
          </div>

          {/* Accuracy */}
          <div className="bg-surface/40 p-4 sm:p-5">
            <div className="text-3xl font-black text-text tabular-nums">
              {Math.floor(stats.accuracy)}
              <span className="text-lg opacity-50">
                .{((stats.accuracy % 1) * 10).toFixed(0)}%
              </span>
            </div>
            <div className="text-[11px] text-muted/60 mt-1">accuracy</div>
          </div>

          {/* Time / Mode */}
          <div className="bg-surface/40 p-4 sm:p-5">
            <div className="text-3xl font-black text-text tabular-nums">
              {stats.time}<span className="text-lg opacity-50">s</span>
            </div>
            <div className="text-[11px] text-muted/60 mt-1">{modeLabel}</div>
          </div>
        </div>
      </div>

      {/* WPM Chart */}
      <WpmChart samples={stats.wpmHistory} />

      {/* Character breakdown */}
      <div className="flex items-center justify-center gap-6 text-xs text-muted/60">
        <span>
          <span className="text-correct font-medium">{stats.correctChars}</span> correct
        </span>
        <span>
          <span className="text-error font-medium">{stats.incorrectChars}</span> incorrect
        </span>
        <span>
          <span className="text-muted font-medium">{stats.extraChars}</span> extra
        </span>
      </div>

      {/* Restart button */}
      <div className="flex flex-col items-center gap-2 w-full max-w-xs mx-auto pt-1">
        <button
          onClick={onRestart}
          className="w-full rounded-lg bg-accent/[0.06] ring-1 ring-accent/20 text-accent py-3 text-sm font-medium hover:bg-accent hover:text-bg hover:ring-accent transition-all"
        >
          Practice Again
          <span className="inline-block w-[2px] h-[1em] bg-current animate-blink ml-0.5 translate-y-px" />
        </button>
        <p className="text-muted/30 text-xs">
          press <kbd className="px-1.5 py-0.5 rounded bg-white/[0.05] text-muted/50 text-[10px]">Enter</kbd> to restart
        </p>
      </div>
    </div>
  );
}
