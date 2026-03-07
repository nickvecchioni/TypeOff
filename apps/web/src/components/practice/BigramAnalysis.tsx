"use client";

import React from "react";

interface BigramData {
  bigram: string;
  correct: number;
  total: number;
  accuracy: number;
}

interface BigramAnalysisProps {
  bigrams: BigramData[];
  onPractice?: (weakBigrams: string[]) => void;
}

export function BigramAnalysis({ bigrams, onPractice }: BigramAnalysisProps) {
  const worstBigrams = bigrams
    .filter((b) => b.total >= 5)
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, 20);

  if (worstBigrams.length === 0) {
    return (
      <div className="text-sm text-muted/60 text-center py-8">
        Not enough data yet. Complete more typing tests to see your bigram accuracy.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-text">Weakest Bigrams</h3>
        {onPractice && (
          <button
            onClick={() => onPractice(worstBigrams.slice(0, 10).map((b) => b.bigram))}
            className="text-xs text-accent hover:text-accent/80 transition-colors"
          >
            Practice these
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {worstBigrams.map((b) => {
          const color =
            b.accuracy >= 90 ? "text-correct" :
            b.accuracy >= 70 ? "text-amber-400" :
            "text-error";
          return (
            <div
              key={b.bigram}
              className="flex items-center justify-between rounded-lg bg-surface/40 ring-1 ring-white/[0.04] px-3 py-2"
            >
              <span className="font-mono text-sm text-text font-bold">{b.bigram}</span>
              <div className="flex flex-col items-end">
                <span className={`text-sm font-bold tabular-nums ${color}`}>
                  {b.accuracy.toFixed(1)}%
                </span>
                <span className="text-xs text-muted/60 tabular-nums">
                  {b.total} typed
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
