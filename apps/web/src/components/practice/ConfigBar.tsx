"use client";

import React from "react";
import type { TestConfig } from "@typeoff/shared";
import type { EngineStatus } from "@typeoff/shared";

interface ConfigBarProps {
  config: TestConfig;
  status: EngineStatus;
  onConfigChange: (config: TestConfig) => void;
}

const TIME_OPTIONS = [15, 30, 60, 120];
const WORD_OPTIONS = [10, 25, 50, 100];

export function ConfigBar({ config, status, onConfigChange }: ConfigBarProps) {
  const isTyping = status === "typing";
  const mode = config.mode === "wordcount" ? "words" : "time";
  const durations = mode === "time" ? TIME_OPTIONS : WORD_OPTIONS;

  return (
    <div
      className={`focus-fade flex items-center justify-center gap-6 transition-opacity ${
        isTyping ? "pointer-events-none opacity-40" : ""
      }`}
    >
      {/* Mode selector */}
      <div className="flex items-center gap-1">
        <Chip
          active={mode === "time"}
          onClick={() => onConfigChange({ mode: "timed", duration: TIME_OPTIONS[0] })}
        >
          time
        </Chip>
        <Chip
          active={mode === "words"}
          onClick={() => onConfigChange({ mode: "wordcount", duration: WORD_OPTIONS[0] })}
        >
          words
        </Chip>
      </div>

      <div className="w-px h-4 bg-white/[0.08]" />

      {/* Duration selector */}
      <div className="flex items-center gap-1">
        {durations.map((d) => (
          <Chip
            key={d}
            active={config.duration === d}
            onClick={() => onConfigChange({ ...config, duration: d })}
          >
            {d}
          </Chip>
        ))}
      </div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
        active
          ? "bg-accent/15 text-accent ring-1 ring-accent/20"
          : "text-muted/60 hover:text-text hover:bg-white/[0.04]"
      }`}
    >
      {children}
    </button>
  );
}
