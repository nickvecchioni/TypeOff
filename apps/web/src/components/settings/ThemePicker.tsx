"use client";

import React, { useState } from "react";
import { TYPING_THEMES, type TypingThemeDef } from "@typeoff/shared";

interface ThemePickerProps {
  activeThemeId: string | null;
  unlockedThemeIds: Set<string>;
  onSelect: (themeId: string | null) => void;
}

export function ThemePicker({ activeThemeId, unlockedThemeIds, onSelect }: ThemePickerProps) {
  const [filter, setFilter] = useState("");

  const entries = Object.entries(TYPING_THEMES).filter(([, def]) =>
    filter === "" || def.label.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Search */}
      <input
        type="text"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Search themes..."
        className="w-full max-w-xs rounded-lg bg-surface/60 ring-1 ring-white/[0.08] px-3 py-2 text-sm text-text placeholder:text-muted/65 focus:outline-none focus:ring-accent/30"
      />

      {/* Default (no theme) */}
      <button
        onClick={() => onSelect(null)}
        className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
          activeThemeId === null
            ? "bg-accent/15 text-accent ring-1 ring-accent/20"
            : "text-muted/60 hover:text-text hover:bg-white/[0.04] ring-1 ring-white/[0.06]"
        }`}
      >
        <span className="flex gap-1">
          <span className="w-3 h-3 rounded-full bg-correct" />
          <span className="w-3 h-3 rounded-full bg-error" />
          <span className="w-3 h-3 rounded-full bg-muted" />
        </span>
        Default
      </button>

      {/* Theme grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {entries.map(([id, def]) => {
          const locked = !unlockedThemeIds.has(id);
          const active = activeThemeId === id;
          return (
            <ThemeCard
              key={id}
              id={id}
              def={def}
              active={active}
              locked={locked}
              onSelect={() => !locked && onSelect(id)}
            />
          );
        })}
      </div>
    </div>
  );
}

function ThemeCard({
  id,
  def,
  active,
  locked,
  onSelect,
}: {
  id: string;
  def: TypingThemeDef;
  active: boolean;
  locked: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      disabled={locked}
      className={`relative flex flex-col items-center gap-2 rounded-xl p-3 transition-all ${
        active
          ? "bg-accent/10 ring-2 ring-accent/40"
          : locked
          ? "opacity-40 cursor-not-allowed ring-1 ring-white/[0.04]"
          : "ring-1 ring-white/[0.06] hover:ring-white/[0.12] hover:bg-white/[0.03]"
      }`}
    >
      {/* Color swatches */}
      <div className="flex items-center gap-1.5">
        {def.palette.map((color, i) => (
          <span
            key={i}
            className="w-4 h-4 rounded-full ring-1 ring-white/10"
            style={{ backgroundColor: color }}
          />
        ))}
      </div>

      {/* Label */}
      <span className={`text-xs font-medium truncate ${
        active ? "text-accent" : locked ? "text-muted/60" : "text-text"
      }`}>
        {def.label}
      </span>

      {/* Lock icon */}
      {locked && (
        <span className="absolute top-1.5 right-1.5 text-muted/50">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </span>
      )}

      {/* Active indicator */}
      {active && (
        <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-accent" />
      )}
    </button>
  );
}
