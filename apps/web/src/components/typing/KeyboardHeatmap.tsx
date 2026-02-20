"use client";

import React from "react";
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
  // Green: [63, 185, 80] → Red: [248, 81, 73]
  const r = Math.round(248 + (63 - 248) * accuracy);
  const g = Math.round(81 + (185 - 81) * accuracy);
  const b = Math.round(73 + (80 - 73) * accuracy);
  return `rgb(${r},${g},${b})`;
}

export function KeyboardHeatmap({ keyStats }: KeyboardHeatmapProps) {
  const maxRowLen = ROWS[0].length;
  const totalWidth = maxRowLen * KEY_UNIT - KEY_GAP + KEY_UNIT;
  const totalHeight = ROWS.length * ROW_HEIGHT - KEY_GAP;

  return (
    <div className="w-full flex flex-col items-center gap-2">
      <div className="text-[11px] text-muted/40 uppercase tracking-widest">key accuracy</div>
      <svg
        viewBox={`0 0 ${totalWidth} ${totalHeight}`}
        className="w-full max-w-sm"
        aria-label="Keyboard accuracy heatmap"
        role="img"
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
            const fillOpacity = accuracy !== null ? 0.8 : 0.4;
            const textColor = accuracy !== null ? "#0c0c12" : "var(--color-muted)";

            return (
              <g key={`${rowIdx}-${colIdx}`}>
                <rect x={x} y={y} width={KEY_SIZE} height={KEY_SIZE} rx={CORNER_R}
                  fill={fillColor} fillOpacity={fillOpacity} />
                <text x={x + KEY_SIZE / 2} y={y + KEY_SIZE / 2 + 5}
                  textAnchor="middle" fontSize={13} fontFamily="var(--font-mono)"
                  fontWeight="600" fill={textColor}>
                  {label}
                </text>
                {hasData && (
                  <title>{`${label}: ${Math.round(accuracy! * 100)}% (${stat!.total} presses)`}</title>
                )}
              </g>
            );
          });
        })}
      </svg>
      <div className="flex items-center gap-3 text-[10px] text-muted/40">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm" style={{ background: accuracyToColor(1) }} />
          <span>100%</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm" style={{ background: accuracyToColor(0.85) }} />
          <span>85%</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm" style={{ background: accuracyToColor(0.5) }} />
          <span>50%</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm opacity-40" style={{ background: "var(--color-surface-bright)" }} />
          <span>n/a</span>
        </div>
      </div>
    </div>
  );
}
