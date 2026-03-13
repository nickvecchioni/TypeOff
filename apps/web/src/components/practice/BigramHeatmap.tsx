"use client";

import React, { useState, useRef } from "react";

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
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<{
    bigram: string;
    accuracy: number;
    total: number;
    x: number;
    y: number;
  } | null>(null);

  const lookup = new Map<string, { accuracy: number; total: number }>();
  for (const b of bigrams) {
    lookup.set(b.bigram.toLowerCase(), { accuracy: b.accuracy, total: b.total });
  }

  const getColor = (accuracy: number, total: number): string => {
    if (total < 3) return "bg-white/[0.02]";
    if (accuracy >= 95) return "bg-correct/20";
    if (accuracy >= 85) return "bg-correct/10";
    if (accuracy >= 75) return "bg-amber-500/15";
    if (accuracy >= 60) return "bg-amber-500/25";
    return "bg-error/25";
  };

  // CSS grid: label column + 26 letter columns, all 1fr
  const gridTemplateColumns = `20px repeat(${LETTERS.length}, 1fr)`;

  return (
    <div className="relative" ref={containerRef}>
      {/* Column headers */}
      <div className="grid mb-[2px]" style={{ gridTemplateColumns }}>
        <div /> {/* empty corner */}
        {LETTERS.map((col) => (
          <div key={col} className="text-[10px] text-muted/60 font-bold text-center leading-none py-0.5">
            {col}
          </div>
        ))}
      </div>

      {/* Rows */}
      {LETTERS.map((row) => (
        <div key={row} className="grid gap-[2px] mb-[2px]" style={{ gridTemplateColumns }}>
          <div className="text-[10px] text-muted/60 font-bold flex items-center justify-center leading-none">
            {row}
          </div>
          {LETTERS.map((col) => {
            const bg = row + col;
            const data = lookup.get(bg);
            const accuracy = data?.accuracy ?? 100;
            const total = data?.total ?? 0;
            return (
              <div
                key={col}
                className={`aspect-square rounded-[2px] ${getColor(accuracy, total)} transition-colors cursor-default`}
                onMouseEnter={(e) => {
                  if (total === 0) return;
                  const container = containerRef.current;
                  if (!container) return;
                  const containerRect = container.getBoundingClientRect();
                  const cellRect = e.currentTarget.getBoundingClientRect();
                  setTooltip({
                    bigram: bg,
                    accuracy,
                    total,
                    x: cellRect.left - containerRect.left + cellRect.width / 2,
                    y: cellRect.top - containerRect.top,
                  });
                }}
                onMouseLeave={() => setTooltip(null)}
              />
            );
          })}
        </div>
      ))}

      {tooltip && (
        <div
          className="absolute z-50 pointer-events-none bg-surface ring-1 ring-white/[0.08] rounded-lg px-2.5 py-1.5 text-xs text-text shadow-lg -translate-x-1/2"
          style={{ left: tooltip.x, top: tooltip.y - 36 }}
        >
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-accent">{tooltip.bigram}</span>
            <span className="font-bold tabular-nums">{tooltip.accuracy.toFixed(1)}%</span>
            <span className="text-muted/50">({tooltip.total})</span>
          </div>
        </div>
      )}
    </div>
  );
}
