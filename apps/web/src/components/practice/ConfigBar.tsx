"use client";

import React from "react";
import type { TestConfig, ContentType } from "@typeoff/shared";
import type { EngineStatus } from "@typeoff/shared";

interface ConfigBarProps {
  config: TestConfig;
  status: EngineStatus;
  onConfigChange: (config: TestConfig) => void;
  onAfterChange?: () => void;
  onCustomTextChange?: (words: string[]) => void;
  practiceWeakKeys?: string[];
}

const TIME_OPTIONS = [15, 30, 60, 120];
const WORD_OPTIONS = [10, 25, 50, 100];

/** Content types that use a fixed word set (no time/words toggle or duration picker) */
const FIXED_CONTENT_TYPES: ContentType[] = ["quotes", "custom", "practice"];

export function ConfigBar({ config, status, onConfigChange, onAfterChange, onCustomTextChange, practiceWeakKeys }: ConfigBarProps) {
  const [customInput, setCustomInput] = React.useState("");
  const isTyping = status === "typing";
  const ct = config.contentType ?? "words";
  const isFixed = FIXED_CONTENT_TYPES.includes(ct);
  const mode = config.mode === "wordcount" ? "words" : "time";
  const durations = mode === "time" ? TIME_OPTIONS : WORD_OPTIONS;

  const set = (patch: Partial<TestConfig>) => {
    onConfigChange({ ...config, ...patch });
    onAfterChange?.();
  };

  const setContentType = (newCt: ContentType) => {
    if (FIXED_CONTENT_TYPES.includes(newCt)) {
      // Fixed modes — keep existing mode/duration selection visible
      set({ contentType: newCt });
    } else {
      // Switching back to "words" — restore sane defaults if needed
      const needsDefaults = FIXED_CONTENT_TYPES.includes(ct);
      set({
        contentType: newCt,
        mode: !needsDefaults && config.mode === "wordcount" && config.duration > 0 ? "wordcount" : config.mode === "wordcount" ? "wordcount" : "timed",
        duration: config.duration > 0 ? config.duration : TIME_OPTIONS[0],
      });
    }
  };

  return (
    <div
      className={`focus-fade flex items-center justify-center gap-3 sm:gap-4 flex-wrap transition-opacity ${
        isTyping ? "pointer-events-none opacity-40" : ""
      }`}
    >
      {/* Punctuation toggle (faded for quotes — they have inherent punctuation) */}
      <div className={`flex items-center gap-1 transition-opacity ${ct === "quotes" ? "opacity-30 pointer-events-none" : ""}`}>
        <Chip
          active={config.punctuation ?? false}
          onClick={() => set({ punctuation: !config.punctuation })}
        >
          @ punctuation
        </Chip>
      </div>
      <Divider />

      {/* Content type / difficulty selector */}
      <div className="flex items-center gap-1">
        <Chip active={ct === "words" && config.difficulty === "easy"} onClick={() => set({ contentType: "words", difficulty: "easy" })}>
          easy
        </Chip>
        <Chip active={ct === "words" && config.difficulty === "medium"} onClick={() => set({ contentType: "words", difficulty: "medium" })}>
          medium
        </Chip>
        <Chip active={ct === "words" && config.difficulty === "hard"} onClick={() => set({ contentType: "words", difficulty: "hard" })}>
          hard
        </Chip>
        <Chip active={ct === "quotes"} onClick={() => setContentType("quotes")}>
          quotes
        </Chip>
        <Chip active={ct === "custom"} onClick={() => setContentType("custom")}>
          custom
        </Chip>
        {practiceWeakKeys && practiceWeakKeys.length > 0 && (
          <Chip active={ct === "practice"} onClick={() => setContentType("practice")}>
            practice
          </Chip>
        )}
      </div>

      {/* Time/words toggle + duration (faded for fixed content types) */}
      <Divider />
      <div className={`flex items-center gap-1 transition-opacity ${isFixed ? "opacity-30 pointer-events-none" : ""}`}>
        <Chip
          active={mode === "time"}
          onClick={() => set({ mode: "timed", duration: TIME_OPTIONS[0] })}
        >
          time
        </Chip>
        <Chip
          active={mode === "words"}
          onClick={() => set({ mode: "wordcount", duration: WORD_OPTIONS[0] })}
        >
          words
        </Chip>
      </div>

      <Divider />

      <div className={`flex items-center gap-1 transition-opacity ${isFixed ? "opacity-30 pointer-events-none" : ""}`}>
        {durations.map((d) => (
          <Chip
            key={d}
            active={config.duration === d}
            onClick={() => set({ duration: d })}
          >
            {d}
          </Chip>
        ))}
      </div>

      {/* Custom text input */}
      {ct === "custom" && !isTyping && (
        <div className="w-full max-w-lg">
          <textarea
            value={customInput}
            onChange={(e) => {
              setCustomInput(e.target.value);
              const words = e.target.value.trim().split(/\s+/).filter(Boolean);
              if (words.length > 0) onCustomTextChange?.(words);
            }}
            placeholder="Paste or type your custom text here..."
            className="w-full h-20 rounded-lg bg-surface/60 ring-1 ring-white/[0.08] px-3 py-2 text-sm text-text placeholder:text-muted/30 resize-none focus:outline-none focus:ring-accent/30"
          />
        </div>
      )}

      {/* Practice mode weak keys info */}
      {ct === "practice" && !isTyping && practiceWeakKeys && practiceWeakKeys.length > 0 && (
        <div className="text-xs text-muted/50">
          practicing:{" "}
          {practiceWeakKeys.map((k, i) => (
            <span key={k}>
              <span className="text-accent font-bold">{k}</span>
              {i < practiceWeakKeys.length - 1 ? ", " : ""}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function Divider() {
  return <div className="w-px h-4 bg-white/[0.08]" />;
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
