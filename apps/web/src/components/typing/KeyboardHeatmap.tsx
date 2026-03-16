"use client";

import React, { useState } from "react";
import type { KeyStatsMap } from "@typeoff/shared";

interface KeyboardHeatmapProps {
  keyStats: KeyStatsMap;
}

const ROWS: [string, string | null][][] = [
  [["q","q"],["w","w"],["e","e"],["r","r"],["t","t"],["y","y"],["u","u"],["i","i"],["o","o"],["p","p"]],
  [["a","a"],["s","s"],["d","d"],["f","f"],["g","g"],["h","h"],["j","j"],["k","k"],["l","l"]],
  [["z","z"],["x","x"],["c","c"],["v","v"],["b","b"],["n","n"],["m","m"]],
];

const ROW_OFFSETS = [0, 0.5, 1.0];
const KEY_SIZE = 36;
const KEY_GAP = 4;
const KEY_UNIT = KEY_SIZE + KEY_GAP;
const ROW_HEIGHT = KEY_SIZE + KEY_GAP;
const CORNER_R = 5;

function accuracyToColor(accuracy: number): string {
  const r = Math.round(248 + (63 - 248) * accuracy);
  const g = Math.round(81 + (185 - 81) * accuracy);
  const b = Math.round(73 + (80 - 73) * accuracy);
  return `rgb(${r},${g},${b})`;
}

export function KeyboardHeatmap({ keyStats }: KeyboardHeatmapProps) {
  const [tooltip, setTooltip] = useState<{ label: string; accuracy: number; total: number; x: number; y: number } | null>(null);
  const maxRowLen = ROWS[0].length;
  const totalWidth = maxRowLen * KEY_UNIT - KEY_GAP + KEY_UNIT;
  const totalHeight = ROWS.length * ROW_HEIGHT - KEY_GAP;

  return (
    <div className="w-full flex flex-col items-center gap-3">
      <div className="relative w-full">
        <svg
          viewBox={`0 0 ${totalWidth} ${totalHeight}`}
          className="w-full"
          aria-label="Keyboard accuracy heatmap"
          role="img"
          onMouseLeave={() => setTooltip(null)}
        >
          {ROWS.map((row, rowIdx) => {
            const yBase = rowIdx * ROW_HEIGHT;
            const xOffset = ROW_OFFSETS[rowIdx] * KEY_UNIT;
            return row.map(([label, keyChar], colIdx) => {
              const x = xOffset + colIdx * KEY_UNIT;
              const y = yBase;
              const stat = keyChar ? keyStats[keyChar] : undefined;
              const hasData = stat != null && stat.total > 0;
              const accuracy = hasData ? stat!.correct / stat!.total : null;
              const fillColor = accuracy !== null ? accuracyToColor(accuracy) : "var(--color-surface-bright)";
              const fillOpacity = accuracy !== null ? 0.85 : 0.35;
              const textColor = accuracy !== null ? "#0c0c12" : "var(--color-muted)";

              return (
                <g key={`${rowIdx}-${colIdx}`}
                  onMouseEnter={() => hasData && setTooltip({
                    label,
                    accuracy: accuracy!,
                    total: stat!.total,
                    x: x + KEY_SIZE / 2,
                    y,
                  })}
                  onMouseLeave={() => setTooltip(null)}
                  style={{ cursor: hasData ? "pointer" : "default" }}
                >
                  <rect x={x} y={y} width={KEY_SIZE} height={KEY_SIZE} rx={CORNER_R}
                    fill={fillColor} fillOpacity={fillOpacity} />
                  <text x={x + KEY_SIZE / 2} y={y + KEY_SIZE / 2 + 5}
                    textAnchor="middle" fontSize={13} fontFamily="var(--font-mono)"
                    fontWeight="600" fill={textColor} style={{ pointerEvents: "none" }}>
                    {label}
                  </text>
                </g>
              );
            });
          })}
        </svg>
        {tooltip && (
          <div
            className="absolute pointer-events-none px-2.5 py-1.5 rounded-lg bg-surface ring-1 ring-white/[0.08] text-xs text-white font-mono whitespace-nowrap shadow-lg"
            style={{
              left: `${(tooltip.x / totalWidth) * 100}%`,
              top: `${(tooltip.y / totalHeight) * 100}%`,
              transform: "translate(-50%, -100%) translateY(-8px)",
            }}
          >
            <span className="font-bold">{tooltip.label.toUpperCase()}</span>
            {" "}
            <span style={{ color: accuracyToColor(tooltip.accuracy) }}>
              {Math.round(tooltip.accuracy * 100)}%
            </span>
            <span className="text-muted/50 ml-1">({tooltip.total})</span>
          </div>
        )}
      </div>
      <div className="flex items-center gap-4 text-xs text-text/50">
        {[
          { acc: 1, label: "100%" },
          { acc: 0.85, label: "85%" },
          { acc: 0.5, label: "50%" },
        ].map(({ acc, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ background: accuracyToColor(acc) }} />
            <span>{label}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm opacity-35" style={{ background: "var(--color-surface-bright)" }} />
          <span>n/a</span>
        </div>
      </div>
    </div>
  );
}
