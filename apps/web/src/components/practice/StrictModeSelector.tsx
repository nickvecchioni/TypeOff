"use client";

import React from "react";
import type { StrictMode } from "@typeoff/shared";

interface StrictModeSelectorProps {
  value: StrictMode;
  onChange: (mode: StrictMode) => void;
}

const MODES: { value: StrictMode; label: string; tooltip: string }[] = [
  { value: "normal", label: "normal", tooltip: "Standard typing — errors are shown but don't stop you" },
  { value: "expert", label: "expert", tooltip: "Must fix all errors before advancing to next word" },
  { value: "master", label: "master", tooltip: "Test ends immediately on any wrong character" },
];

export function StrictModeSelector({ value, onChange }: StrictModeSelectorProps) {
  return (
    <div className="flex items-center gap-1">
      {MODES.map((mode) => (
        <button
          key={mode.value}
          onClick={() => onChange(mode.value)}
          title={mode.tooltip}
          className={`px-2 py-1 rounded text-[11px] font-medium transition-all ${
            value === mode.value
              ? mode.value === "master"
                ? "text-error/80 bg-error/10"
                : mode.value === "expert"
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
