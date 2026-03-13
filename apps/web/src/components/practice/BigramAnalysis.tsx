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
;

  if (worstBigrams.length === 0) {
    return (
      <div className="text-sm text-muted/60 text-center py-8">
        Not enough data yet. Complete more typing tests to see your bigram accuracy.
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-3 gap-y-1.5">
        {worstBigrams.map((b) => {
          const color =
            b.accuracy >= 90 ? "text-correct/70" :
            b.accuracy >= 70 ? "text-amber-400/80" :
            "text-error/80";
          return (
            <div
              key={b.bigram}
              className="flex items-center gap-2 py-1.5 px-1"
            >
              <span className="font-mono text-sm text-accent font-bold w-6 shrink-0">{b.bigram}</span>
              <span className={`text-xs font-bold tabular-nums ${color}`}>
                {b.accuracy.toFixed(1)}%
              </span>
              <span className="text-[11px] text-muted/30 tabular-nums">
                {b.total}
              </span>
            </div>
          );
        })}
      </div>
      {onPractice && (
        <div className="mt-3 pt-3 border-t border-white/[0.04]">
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
