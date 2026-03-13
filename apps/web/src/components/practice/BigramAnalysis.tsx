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
    <div className="space-y-0 divide-y divide-white/[0.04]">
      {worstBigrams.map((b) => {
        const color =
          b.accuracy >= 90 ? "text-correct" :
          b.accuracy >= 70 ? "text-amber-400" :
          "text-error";
        return (
          <div
            key={b.bigram}
            className="flex items-center gap-3 py-2 first:pt-0 last:pb-0"
          >
            <span className="font-mono text-sm text-accent font-bold w-7 text-center">{b.bigram}</span>
            <span className={`text-sm font-bold tabular-nums ${color}`}>
              {b.accuracy.toFixed(1)}%
            </span>
            <span className="text-xs text-muted/40 tabular-nums">
              {b.total}
            </span>
          </div>
        );
      })}
      {onPractice && (
        <div className="pt-3">
          <button
            onClick={() => onPractice(worstBigrams.slice(0, 10).map((b) => b.bigram))}
            className="text-xs text-accent hover:text-accent/80 transition-colors font-medium"
          >
            Practice worst 10
          </button>
        </div>
      )}
    </div>
  );
}
