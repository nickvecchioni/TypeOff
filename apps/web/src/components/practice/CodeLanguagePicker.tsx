"use client";

import React from "react";
import { CODE_LANGUAGES } from "@typeoff/shared";

interface CodeLanguagePickerProps {
  value: string | undefined;
  onChange: (language: string | undefined) => void;
}

const LANGUAGE_LABELS: Record<string, string> = {
  javascript: "JavaScript",
  python: "Python",
  go: "Go",
  rust: "Rust",
  java: "Java",
};

export function CodeLanguagePicker({ value, onChange }: CodeLanguagePickerProps) {
  return (
    <div className="flex items-center gap-1 flex-wrap">
      <button
        onClick={() => onChange(undefined)}
        className={`px-2 py-1 rounded text-xs font-medium transition-all ${
          value === undefined
            ? "text-accent/80 bg-accent/10"
            : "text-muted/55 hover:text-muted/70 hover:bg-white/[0.03]"
        }`}
      >
        any
      </button>
      {CODE_LANGUAGES.map((lang) => (
        <button
          key={lang}
          onClick={() => onChange(lang)}
          className={`px-2 py-1 rounded text-xs font-medium transition-all ${
            value === lang
              ? "text-accent/80 bg-accent/10"
              : "text-muted/55 hover:text-muted/70 hover:bg-white/[0.03]"
          }`}
        >
          {LANGUAGE_LABELS[lang] ?? lang}
        </button>
      ))}
    </div>
  );
}
