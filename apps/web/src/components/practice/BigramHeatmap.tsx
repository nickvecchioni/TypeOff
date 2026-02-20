"use client";

import React from "react";

interface BigramData {
  bigram: string;
  correct: number;
  total: number;
  accuracy: number;
}

interface BigramHeatmapProps {
  bigrams: BigramData[];
}

const LETTERS = "abcdefghijklmnopqrstuvwxyz".split("");

export function BigramHeatmap({ bigrams }: BigramHeatmapProps) {
  // Build lookup: bigram string -> accuracy
  const lookup = new Map<string, { accuracy: number; total: number }>();
  for (const b of bigrams) {
    lookup.set(b.bigram.toLowerCase(), { accuracy: b.accuracy, total: b.total });
  }

  const getColor = (accuracy: number, total: number): string => {
    if (total < 3) return "bg-white/[0.02]"; // not enough data
    if (accuracy >= 95) return "bg-correct/20";
    if (accuracy >= 85) return "bg-correct/10";
    if (accuracy >= 75) return "bg-amber-500/15";
    if (accuracy >= 60) return "bg-amber-500/25";
    return "bg-error/25";
  };

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-medium text-text">Bigram Accuracy Heatmap</h3>
      <p className="text-xs text-muted/40">Rows = first character, Columns = second character</p>

      <div className="overflow-x-auto">
        <div className="inline-block">
          {/* Column headers */}
          <div className="flex">
            <div className="w-6 h-5" /> {/* empty corner */}
            {LETTERS.map((col) => (
              <div key={col} className="w-5 h-5 flex items-center justify-center text-[8px] text-muted/40 font-bold">
                {col}
              </div>
            ))}
          </div>

          {/* Rows */}
          {LETTERS.map((row) => (
            <div key={row} className="flex">
              <div className="w-6 h-5 flex items-center justify-center text-[8px] text-muted/40 font-bold">
                {row}
              </div>
              {LETTERS.map((col) => {
                const bigram = row + col;
                const data = lookup.get(bigram);
                const accuracy = data?.accuracy ?? 100;
                const total = data?.total ?? 0;
                return (
                  <div
                    key={col}
                    className={`w-5 h-5 rounded-[2px] ${getColor(accuracy, total)} transition-colors`}
                    title={total > 0 ? `${bigram}: ${accuracy.toFixed(1)}% (${total} typed)` : `${bigram}: no data`}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
