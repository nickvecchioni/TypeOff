"use client";

import React from "react";
import type { TestConfig, ContentType } from "@typeoff/shared";
import type { EngineStatus } from "@typeoff/shared";

interface ConfigBarProps {
  config: TestConfig;
  status: EngineStatus;
  onConfigChange: (config: TestConfig) => void;
  onAfterChange?: () => void;
}

const TIME_OPTIONS = [15, 30, 60, 120];
const WORD_OPTIONS = [10, 25, 50, 100];

/** Content types that use a fixed word set (no time/words toggle or duration picker) */
const FIXED_CONTENT_TYPES: ContentType[] = ["quotes", "marathon", "sprint"];

export function ConfigBar({ config, status, onConfigChange, onAfterChange }: ConfigBarProps) {
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
      // Fixed modes force wordcount behavior internally
      set({ contentType: newCt, mode: "wordcount", duration: 0 });
    } else {
      // Switching back to "words" — restore sane defaults
      set({
        contentType: newCt,
        mode: config.mode === "wordcount" && config.duration > 0 ? "wordcount" : "timed",
        duration: config.mode === "wordcount" && config.duration > 0 ? config.duration : TIME_OPTIONS[0],
      });
    }
  };

  return (
    <div
      className={`focus-fade flex items-center justify-center gap-3 sm:gap-4 flex-wrap transition-opacity ${
        isTyping ? "pointer-events-none opacity-40" : ""
      }`}
    >
      {/* Punctuation toggle (hidden for quotes — they have inherent punctuation) */}
      {ct !== "quotes" && (
        <>
          <div className="flex items-center gap-1">
            <Chip
              active={config.punctuation ?? false}
              onClick={() => set({ punctuation: !config.punctuation })}
            >
              @ punctuation
            </Chip>
          </div>
          <Divider />
        </>
      )}

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
        <Chip active={ct === "marathon"} onClick={() => setContentType("marathon")}>
          marathon
        </Chip>
        <Chip active={ct === "sprint"} onClick={() => setContentType("sprint")}>
          sprint
        </Chip>
      </div>

      {/* Time/words toggle + duration (hidden for fixed content types) */}
      {!isFixed && (
        <>
          <Divider />
          <div className="flex items-center gap-1">
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

          <div className="flex items-center gap-1">
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
        </>
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
