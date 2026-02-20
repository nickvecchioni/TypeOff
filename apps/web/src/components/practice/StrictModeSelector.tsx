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
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
            value === mode.value
              ? mode.value === "master"
                ? "bg-error/15 text-error ring-1 ring-error/20"
                : mode.value === "expert"
                ? "bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/20"
                : "bg-accent/15 text-accent ring-1 ring-accent/20"
              : "text-muted/60 hover:text-text hover:bg-white/[0.04]"
          }`}
        >
          {mode.label}
        </button>
      ))}
    </div>
  );
}
