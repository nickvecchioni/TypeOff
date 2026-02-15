"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import type { TestStats, TestConfig } from "@typeoff/shared";
import { WpmChart } from "./WpmChart";

interface ResultsProps {
  stats: TestStats;
  onRestart: () => void;
  config?: TestConfig;
}

export function Results({ stats, onRestart, config }: ResultsProps) {
  const { data: session } = useSession();
  const [saveState, setSaveState] = useState<{
    saving: boolean;
    saved: boolean;
    isPb: boolean;
    previousBest: number | null;
  }>({ saving: false, saved: false, isPb: false, previousBest: null });

  useEffect(() => {
    if (!session?.user || !config) return;

    setSaveState((s) => ({ ...s, saving: true }));

    fetch("/api/solo/results", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: config.mode,
        duration: config.duration,
        wordPool: config.wordPool ?? null,
        wpm: stats.wpm,
        rawWpm: stats.rawWpm,
        accuracy: stats.accuracy,
        correctChars: stats.correctChars,
        incorrectChars: stats.incorrectChars,
        extraChars: stats.extraChars,
        totalChars: stats.totalChars,
        time: stats.time,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        setSaveState({
          saving: false,
          saved: true,
          isPb: data.isPb ?? false,
          previousBest: data.previousBest ?? null,
        });
        // Dispatch event so SoloStats can refetch
        window.dispatchEvent(new Event("solo-result-saved"));
      })
      .catch(() => {
        setSaveState((s) => ({ ...s, saving: false }));
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex flex-col items-center gap-10 animate-fade-in w-full max-w-2xl mx-auto">
      {/* NEW PB badge */}
      {saveState.isPb && (
        <div className="text-lg font-bold text-rank-gold bg-rank-gold/10 border border-rank-gold/30 rounded-full px-4 py-1">
          NEW PB!
        </div>
      )}

      {/* Big numbers */}
      <div className="flex items-baseline gap-16">
        <div className="text-center">
          <div className="text-8xl font-bold text-accent tabular-nums">
            {stats.wpm}
          </div>
          <div className="text-base text-muted mt-1">wpm</div>
        </div>
        <div className="text-center">
          <div className="text-8xl font-bold text-text tabular-nums">
            {stats.accuracy}
            <span className="text-5xl text-muted">%</span>
          </div>
          <div className="text-base text-muted mt-1">accuracy</div>
        </div>
      </div>

      {/* PB context */}
      {saveState.isPb && saveState.previousBest !== null && (
        <div className="text-sm text-muted">
          Previous best: <span className="text-text tabular-nums">{Math.round(saveState.previousBest)} wpm</span>
        </div>
      )}

      {/* Detail grid */}
      <div className="grid grid-cols-4 gap-8 text-center">
        <div>
          <div className="text-2xl text-text tabular-nums">{stats.rawWpm}</div>
          <div className="text-sm text-muted">raw wpm</div>
        </div>
        <div>
          <div className="text-2xl text-text tabular-nums">{stats.correctChars}</div>
          <div className="text-sm text-muted">correct</div>
        </div>
        <div>
          <div className="text-2xl text-text tabular-nums">
            {stats.incorrectChars + stats.extraChars}
          </div>
          <div className="text-sm text-muted">errors</div>
        </div>
        <div>
          <div className="text-2xl text-text tabular-nums">{stats.time}s</div>
          <div className="text-sm text-muted">time</div>
        </div>
      </div>

      {/* WPM chart */}
      <WpmChart samples={stats.wpmHistory} />

      {/* Sign-in prompt for guests */}
      {!session?.user && config && (
        <div className="text-sm text-muted/60">
          Sign in to save results
        </div>
      )}

      {/* Restart hint */}
      <button
        onClick={onRestart}
        className="text-muted hover:text-accent transition-colors text-sm"
      >
        press <kbd className="px-1.5 py-0.5 rounded bg-surface text-text text-xs">tab</kbd> + <kbd className="px-1.5 py-0.5 rounded bg-surface text-text text-xs">enter</kbd> or click to restart
      </button>
    </div>
  );
}
