"use client";

import React from "react";
import type { StrictMode } from "@typeoff/shared";
import { Tooltip } from "@/components/shared/Tooltip";

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
        <Tooltip key={mode.value} label={mode.tooltip}>
          <button
            onClick={() => onChange(mode.value)}
            className={`px-2.5 py-1.5 rounded-md text-sm font-medium transition-all ${
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
        </Tooltip>
      ))}
    </div>
  );
}
