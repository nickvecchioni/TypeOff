"use client";

import React from "react";
import type { RaceMode } from "@typeoff/shared";

const MODE_LABELS: Record<RaceMode, string | null> = {
  standard: null,
  quotes: "Quote",
  marathon: "Marathon",
  sprint: "Sprint",
  punctuation: "Punctuation",
  numbers: "Numbers",
  difficult: "Difficult",
  code: "Code",
  special: "Mixed",
};

const MODE_DESCRIPTIONS: Record<RaceMode, string> = {
  standard: "Common English words",
  sprint: "One line — go fast",
  marathon: "Four lines — stay steady",
  special: "Capitalized words with punctuation & numbers",
  quotes: "A famous quote with natural punctuation",
  code: "Real code syntax — symbols, brackets, the works",
  punctuation: "Common words with commas, periods, and sentence breaks",
  numbers: "Common words interspersed with digit sequences",
  difficult: "Uncommon and challenging vocabulary",
};

const LANGUAGE_LABELS: Record<string, string> = {
  javascript: "JavaScript",
  python: "Python",
  go: "Go",
  rust: "Rust",
  java: "Java",
};

interface CountdownOverlayProps {
  countdown: number;
  placementRace?: number;
  mode?: RaceMode;
  codeLanguage?: string;
}

export function CountdownOverlay({
  countdown,
  placementRace,
  mode,
  codeLanguage,
}: CountdownOverlayProps) {
  const modeLabel = mode ? MODE_LABELS[mode] : null;
  const modeDesc = mode === "code" && codeLanguage
    ? (LANGUAGE_LABELS[codeLanguage] ?? codeLanguage)
    : mode ? MODE_DESCRIPTIONS[mode] : null;

  return (
    <div className="flex flex-col items-center gap-2">
      {modeLabel && (
        <p className="text-accent/70 text-xs font-semibold uppercase tracking-widest">
          {modeLabel}
        </p>
      )}
      <div
        key={countdown}
        className="text-5xl font-black text-accent tabular-nums text-glow-accent animate-count-pulse"
      >
        {countdown}
      </div>
      {modeDesc && !placementRace && (
        <p className="text-muted/50 text-xs text-center mt-1">{modeDesc}</p>
      )}
      {placementRace != null && (
        <p className="text-muted text-xs">
          Placement Test &mdash; type to determine your starting rank
        </p>
      )}
    </div>
  );
}
