"use client";

import React, { useEffect, useRef } from "react";
import type { TestStats, TestConfig } from "@typeoff/shared";

interface FailScreenProps {
  stats: TestStats;
  config: TestConfig;
  onRestart: () => void;
}

export function FailScreen({ stats, config, onRestart }: FailScreenProps) {
  const tabPressedRef = useRef(false);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Tab") {
        e.preventDefault();
        tabPressedRef.current = true;
        return;
      }
      if (e.key === "Enter" && tabPressedRef.current) {
        e.preventDefault();
        tabPressedRef.current = false;
        onRestart();
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        onRestart();
        return;
      }
      tabPressedRef.current = false;
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onRestart]);

  const modeLabel = config.strictMode === "master" ? "Master" : "Expert";
  const failWord = stats.failedAt ? `word ${stats.failedAt.wordIndex + 1}` : "unknown";
  const failChar = stats.failedAt ? `char ${stats.failedAt.charIndex + 1}` : "";

  return (
    <div className="flex flex-col items-center gap-6 w-full animate-slide-up">
      {/* Fail header */}
      <div className="flex flex-col items-center gap-2">
        <div className={`text-4xl font-black ${config.strictMode === "master" ? "text-error" : "text-amber-400"}`}>
          Failed
        </div>
        <p className="text-sm text-muted/60">
          {modeLabel} mode — failed at {failWord}, {failChar}
        </p>
      </div>

      {/* Stats before failure */}
      <div className="rounded-xl overflow-hidden ring-1 ring-white/[0.04] w-full max-w-md">
        <div className={`h-0.5 ${config.strictMode === "master" ? "bg-error" : "bg-amber-500"} opacity-50`} />
        <div className="grid gap-px grid-cols-3">
          <div className="bg-surface/40 p-4 flex flex-col items-center text-center">
            <div className="text-2xl font-black text-text tabular-nums">
              {Math.floor(stats.wpm)}
            </div>
            <div className="text-[11px] text-muted/60 mt-1">wpm</div>
          </div>
          <div className="bg-surface/40 p-4 flex flex-col items-center text-center">
            <div className="text-2xl font-black text-text tabular-nums">
              {Math.floor(stats.accuracy)}%
            </div>
            <div className="text-[11px] text-muted/60 mt-1">accuracy</div>
          </div>
          <div className="bg-surface/40 p-4 flex flex-col items-center text-center">
            <div className="text-2xl font-black text-text tabular-nums">
              {stats.time}s
            </div>
            <div className="text-[11px] text-muted/60 mt-1">time</div>
          </div>
        </div>
      </div>

      {/* Restart button */}
      <div className="flex flex-col items-center gap-2 w-full max-w-xs mx-auto pt-1">
        <button
          onClick={onRestart}
          className={`w-full rounded-lg py-3 text-sm font-medium transition-all ${
            config.strictMode === "master"
              ? "bg-error/[0.06] ring-1 ring-error/20 text-error hover:bg-error hover:text-bg hover:ring-error"
              : "bg-amber-500/[0.06] ring-1 ring-amber-500/20 text-amber-400 hover:bg-amber-500 hover:text-bg hover:ring-amber-500"
          }`}
        >
          Try Again
          <span className="inline-block w-[2px] h-[1em] bg-current animate-blink ml-0.5 translate-y-px" />
        </button>
        <p className="text-muted/65 text-xs">
          press{" "}
          <kbd className="px-1.5 py-0.5 rounded bg-white/[0.05] text-muted/65 text-[10px]">Tab</kbd>
          {" "}+{" "}
          <kbd className="px-1.5 py-0.5 rounded bg-white/[0.05] text-muted/65 text-[10px]">Enter</kbd>
          {" "}to restart
        </p>
      </div>
    </div>
  );
}
