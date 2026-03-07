"use client";

import React from "react";
import type { StrictMode } from "@typeoff/shared";

interface StrictModeSelectorProps {
  value: StrictMode;
  onChange: (mode: StrictMode) => void;
}

const MODES: { value: StrictMode; label: string; tooltip: string }[] = [
  { value: "easy", label: "easy", tooltip: "Common everyday words" },
  { value: "medium", label: "medium", tooltip: "Less common, moderately challenging words" },
  { value: "hard", label: "hard", tooltip: "Uncommon and complex vocabulary" },
];

export function StrictModeSelector({ value, onChange }: StrictModeSelectorProps) {
  return (
    <div className="flex items-center gap-1">
      {MODES.map((mode) => (
        <button
          key={mode.value}
          onClick={() => onChange(mode.value)}
          title={mode.tooltip}
          className={`px-2 py-1 rounded text-xs font-medium transition-all ${
            value === mode.value
              ? mode.value === "hard"
                ? "text-error/80 bg-error/10"
                : mode.value === "medium"
                ? "text-amber-400/80 bg-amber-500/10"
                : "text-accent/80 bg-accent/10"
              : "text-muted/55 hover:text-muted/70 hover:bg-white/[0.03]"
          }`}
        >
          {mode.label}
        </button>
      ))}
    </div>
  );
}
