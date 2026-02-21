"use client";

import React from "react";
import type { TestConfig, ContentType, StrictMode } from "@typeoff/shared";
import type { EngineStatus } from "@typeoff/shared";
import { StrictModeSelector } from "./StrictModeSelector";
import { CodeLanguagePicker } from "./CodeLanguagePicker";

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
const FIXED_CONTENT_TYPES: ContentType[] = ["quotes", "custom", "practice", "code", "zen"];

export function ConfigBar({
  config,
  status,
  onConfigChange,
  onAfterChange,
  onCustomTextChange,
  practiceWeakKeys,
}: ConfigBarProps) {
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
      set({ contentType: newCt });
    } else {
      const needsDefaults = FIXED_CONTENT_TYPES.includes(ct);
      set({
        contentType: newCt,
        mode:
          !needsDefaults && config.mode === "wordcount" && config.duration > 0
            ? "wordcount"
            : config.mode === "wordcount"
            ? "wordcount"
            : "timed",
        duration: config.duration > 0 ? config.duration : TIME_OPTIONS[0],
      });
    }
  };

  return (
    <div
      className={`focus-fade flex flex-col items-center gap-2 transition-opacity ${
        isTyping ? "pointer-events-none opacity-40" : ""
      }`}
    >
      {/* ── Primary row: mode / content type ── */}
      <div className="flex items-center gap-0.5">
        {/* Difficulty group */}
        <Chip
          active={ct === "words" && config.difficulty === "easy"}
          onClick={() => set({ contentType: "words", difficulty: "easy" })}
        >
          easy
        </Chip>
        <Chip
          active={ct === "words" && config.difficulty === "medium"}
          onClick={() => set({ contentType: "words", difficulty: "medium" })}
        >
          medium
        </Chip>
        <Chip
          active={ct === "words" && config.difficulty === "hard"}
          onClick={() => set({ contentType: "words", difficulty: "hard" })}
        >
          hard
        </Chip>

        <Divider />

        {/* Special modes */}
        <Chip active={ct === "quotes"} onClick={() => setContentType("quotes")}>
          quotes
        </Chip>
        <Chip active={ct === "custom"} onClick={() => setContentType("custom")}>
          custom
        </Chip>
        <Chip active={ct === "code"} onClick={() => setContentType("code")}>
          code
        </Chip>
        <Chip active={ct === "zen"} onClick={() => setContentType("zen")}>
          zen
        </Chip>
        {practiceWeakKeys?.length ? (
          <Chip
            active={ct === "practice"}
            onClick={() => setContentType("practice")}
          >
            practice
          </Chip>
        ) : null}
      </div>

      {/* ── Secondary row: timing + accessories ── */}
      <div className="flex items-center gap-1.5">
        {/* Time / words toggle + duration (faded for fixed modes) */}
        <div
          className={`flex items-center gap-0.5 transition-opacity ${
            isFixed ? "opacity-20 pointer-events-none" : ""
          }`}
        >
          <Sub
            active={mode === "time"}
            onClick={() => set({ mode: "timed", duration: TIME_OPTIONS[0] })}
          >
            time
          </Sub>
          <Sub
            active={mode === "words"}
            onClick={() => set({ mode: "wordcount", duration: WORD_OPTIONS[0] })}
          >
            words
          </Sub>
          <MicroDivider />
          {durations.map((d) => (
            <Sub
              key={d}
              active={config.duration === d}
              onClick={() => set({ duration: d })}
            >
              {d}
            </Sub>
          ))}
        </div>

        <MicroDivider />

        {/* Punctuation toggle (faded for quotes) */}
        <div
          className={`transition-opacity ${
            ct === "quotes" ? "opacity-20 pointer-events-none" : ""
          }`}
        >
          <Sub
            active={config.punctuation ?? false}
            onClick={() => set({ punctuation: !config.punctuation })}
          >
            @ punct
          </Sub>
        </div>

        {/* Strict mode (hidden for zen + code) */}
        {ct !== "zen" && ct !== "code" && (
          <>
            <MicroDivider />
            <StrictModeSelector
              value={config.strictMode ?? "normal"}
              onChange={(m: StrictMode) => set({ strictMode: m })}
            />
          </>
        )}

        {/* Code language picker */}
        {ct === "code" && (
          <>
            <MicroDivider />
            <CodeLanguagePicker
              value={config.codeLanguage}
              onChange={(lang) => set({ codeLanguage: lang })}
            />
          </>
        )}
      </div>

      {/* ── Contextual: custom text input ── */}
      {ct === "custom" && !isTyping && (
        <div className="w-full max-w-lg mt-1">
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

      {/* ── Practice weak keys info ── */}
      {ct === "practice" && !isTyping && practiceWeakKeys && practiceWeakKeys.length > 0 && (
        <div className="text-[11px] text-muted/40">
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

/* ── Sub-components ────────────────────────────────────── */

function Divider() {
  return <div className="w-px h-3.5 bg-white/[0.07] mx-1" />;
}

function MicroDivider() {
  return <div className="w-px h-3 bg-white/[0.06] mx-0.5" />;
}

/** Primary chip — used for the main mode/content selector */
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
      className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
        active
          ? "bg-accent/15 text-accent ring-1 ring-accent/20"
          : "text-muted/50 hover:text-text hover:bg-white/[0.04]"
      }`}
    >
      {children}
    </button>
  );
}

/** Sub chip — used for secondary controls (time/words, duration, punctuation) */
function Sub({
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
      className={`px-2 py-1 rounded text-[11px] font-medium transition-all ${
        active
          ? "text-accent/80 bg-accent/10"
          : "text-muted/35 hover:text-muted/70 hover:bg-white/[0.03]"
      }`}
    >
      {children}
    </button>
  );
}
