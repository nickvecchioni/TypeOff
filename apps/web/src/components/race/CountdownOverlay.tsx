"use client";

import React from "react";
import type { RaceMode } from "@typeoff/shared";
import { useCapsLock } from "@/hooks/useCapsLock";

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
  sprint: "One line. Go fast",
  marathon: "Four lines. Stay steady",
  special: "Punctuation & numbers",
  quotes: "A famous quote with natural punctuation",
  code: "Real code syntax: symbols, brackets, the works",
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
  mode?: RaceMode;
  codeLanguage?: string;
  codeSnippetName?: string;
  quoteAuthor?: string;
}

export function CountdownOverlay({
  countdown,
  mode,
  codeLanguage,
  codeSnippetName,
  quoteAuthor,
}: CountdownOverlayProps) {
  const capsLock = useCapsLock();
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
      {modeDesc && (
        <p className="text-muted/50 text-xs text-center mt-1">{modeDesc}</p>
      )}
      {/* Code snippet name below language */}
      {mode === "code" && codeSnippetName && (
        <p className="text-muted/60 text-xs text-center -mt-0.5">{codeSnippetName}</p>
      )}
      {/* Quote author */}
      {mode === "quotes" && quoteAuthor && (
        <p className="text-muted/60 text-xs text-center -mt-0.5"><span className="italic">{quoteAuthor}</span></p>
      )}
      {capsLock && (
        <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/20 mt-1">
          Caps Lock
        </span>
      )}
    </div>
  );
}
