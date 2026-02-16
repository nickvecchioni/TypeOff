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

  const statItems = [
    { value: stats.correctChars, label: "correct" },
    { value: stats.misstypedChars, label: "errors" },
    { value: `${stats.time}s`, label: "time" },
  ];

  return (
    <div className="flex flex-col items-center gap-8 w-full max-w-2xl mx-auto">
      {/* NEW PB badge */}
      {saveState.isPb && (
        <div
          className="text-lg font-bold text-rank-gold bg-rank-gold/10 border border-rank-gold/30 rounded-full px-5 py-1.5 text-glow-gold animate-slide-up"
        >
          NEW PB!
        </div>
      )}

      {/* Big WPM number */}
      <div className="text-center animate-slide-up" style={{ animationDelay: "50ms" }}>
        <div className="text-8xl font-black text-accent tabular-nums text-glow-accent">
          {stats.wpm}
        </div>
        <div className="text-base text-muted mt-2">wpm</div>
      </div>

      {/* PB context */}
      {saveState.isPb && saveState.previousBest !== null && (
        <div className="text-sm text-muted animate-slide-up" style={{ animationDelay: "100ms" }}>
          Previous best: <span className="text-text tabular-nums">{Math.round(saveState.previousBest)} wpm</span>
        </div>
      )}

      {/* Detail grid — staggered */}
      <div className="grid grid-cols-3 gap-8 text-center">
        {statItems.map((item, i) => (
          <div
            key={item.label}
            className="animate-slide-up"
            style={{ animationDelay: `${150 + i * 60}ms` }}
          >
            <div className="text-2xl font-bold text-text tabular-nums">{item.value}</div>
            <div className="text-sm text-muted">{item.label}</div>
          </div>
        ))}
      </div>

      {/* WPM chart */}
      <div className="animate-slide-up w-full flex justify-center" style={{ animationDelay: "400ms" }}>
        <WpmChart samples={stats.wpmHistory} />
      </div>

      {/* Restart hint */}
      <button
        onClick={onRestart}
        className="text-muted hover:text-accent transition-colors text-sm animate-slide-up"
        style={{ animationDelay: "500ms" }}
      >
        press{" "}
        <kbd className="px-1.5 py-0.5 rounded border border-surface-bright bg-surface text-text text-xs">tab</kbd>
        {" + "}
        <kbd className="px-1.5 py-0.5 rounded border border-surface-bright bg-surface text-text text-xs">enter</kbd>
        {" "}or click to restart
      </button>
    </div>
  );
}
