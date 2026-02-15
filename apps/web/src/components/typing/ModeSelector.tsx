"use client";

import React from "react";
import type { TestConfig, TestMode, WordPool } from "@typeoff/shared";

interface ModeSelectorProps {
  config: TestConfig;
  onConfigChange: (config: TestConfig) => void;
  disabled: boolean;
}

const TIME_OPTIONS = [15, 30, 60, 120];
const WORD_OPTIONS = [10, 25, 50, 100];
const POOL_OPTIONS: { label: string; value: WordPool | undefined }[] = [
  { label: "easy", value: "common" },
  { label: "medium", value: "medium" },
  { label: "hard", value: "hard" },
  { label: "quotes", value: "quotes" },
  { label: "code", value: "code" },
];

export function ModeSelector({
  config,
  onConfigChange,
  disabled,
}: ModeSelectorProps) {
  const isTime = config.mode === "timed";
  const options = isTime ? TIME_OPTIONS : WORD_OPTIONS;

  const handleModeChange = (mode: TestMode) => {
    if (disabled) return;
    onConfigChange({
      mode,
      duration: mode === "timed" ? 30 : 25,
      wordPool: config.wordPool,
    });
  };

  const handleDurationChange = (duration: number) => {
    if (disabled) return;
    onConfigChange({ ...config, duration });
  };

  const handlePoolChange = (pool: WordPool | undefined) => {
    if (disabled) return;
    onConfigChange({ ...config, wordPool: pool });
  };

  return (
    <div className="flex items-center gap-4 text-sm">
      <div className="flex items-center gap-1 rounded-lg bg-surface px-1 py-1">
        <button
          onClick={() => handleModeChange("timed")}
          disabled={disabled}
          className={`rounded-md px-3 py-1 transition-colors ${
            isTime
              ? "bg-accent/20 text-accent"
              : "text-muted hover:text-text"
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          time
        </button>
        <button
          onClick={() => handleModeChange("wordcount")}
          disabled={disabled}
          className={`rounded-md px-3 py-1 transition-colors ${
            !isTime
              ? "bg-accent/20 text-accent"
              : "text-muted hover:text-text"
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          words
        </button>
      </div>

      <div className="flex items-center gap-1">
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => handleDurationChange(opt)}
            disabled={disabled}
            className={`rounded-md px-3 py-1 transition-colors ${
              config.duration === opt
                ? "text-accent"
                : "text-muted hover:text-text"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {opt}
          </button>
        ))}
      </div>

      <span className="w-px h-4 bg-surface" />

      <div className="flex items-center gap-1">
        {POOL_OPTIONS.map((opt) => (
          <button
            key={opt.label}
            onClick={() => handlePoolChange(opt.value)}
            disabled={disabled}
            className={`rounded-md px-3 py-1 transition-colors ${
              config.wordPool === opt.value
                ? "text-accent"
                : "text-muted hover:text-text"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
