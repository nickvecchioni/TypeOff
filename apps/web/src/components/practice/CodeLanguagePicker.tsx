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
        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
          value === undefined
            ? "bg-accent/15 text-accent ring-1 ring-accent/20"
            : "text-muted/60 hover:text-text hover:bg-white/[0.04]"
        }`}
      >
        any
      </button>
      {CODE_LANGUAGES.map((lang) => (
        <button
          key={lang}
          onClick={() => onChange(lang)}
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
            value === lang
              ? "bg-accent/15 text-accent ring-1 ring-accent/20"
              : "text-muted/60 hover:text-text hover:bg-white/[0.04]"
          }`}
        >
          {LANGUAGE_LABELS[lang] ?? lang}
        </button>
      ))}
    </div>
  );
}
