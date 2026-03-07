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
  practiceWeakBigrams?: string[];
  isPro?: boolean;
}

const TIME_OPTIONS = [15, 30, 60, 120];
const WORD_OPTIONS = [10, 25, 50, 100];

/** Content types that use a fixed word set (no time/words toggle or duration picker) */
const FIXED_CONTENT_TYPES: ContentType[] = ["quotes", "custom", "code", "zen"];

export function ConfigBar({
  config,
  status,
  onConfigChange,
  onAfterChange,
  onCustomTextChange,
  practiceWeakKeys,
  practiceWeakBigrams,
  isPro = false,
}: ConfigBarProps) {
  const [customInput, setCustomInput] = React.useState("");
  const isTyping = status === "typing";
  const ct = config.contentType ?? "words";
  // Treat "practice" as a words/mixed variant for UI purposes
  const isWordsVariant = ct === "words" || ct === "practice";
  const isFixed = FIXED_CONTENT_TYPES.includes(ct);
  const mode = config.mode === "wordcount" ? "words" : "time";
  const durations = mode === "time" ? TIME_OPTIONS : WORD_OPTIONS;
  const hasPracticeData = isPro && !!(practiceWeakKeys?.length || practiceWeakBigrams?.length);
  const isPracticeOn = ct === "practice";

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
        punctuation: false,
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

  // Switches to words (or practice if toggled on) with punctuation flag — preserves sub-options
  const setWordMode = (punctuation: boolean) => {
    const wasFixed = FIXED_CONTENT_TYPES.includes(ct);
    const targetCt = isPracticeOn ? "practice" : "words";
    set({
      contentType: targetCt,
      punctuation,
      ...(targetCt === "practice" ? { weakBigrams: practiceWeakBigrams } : {}),
      mode: wasFixed
        ? "timed"
        : config.mode === "wordcount"
        ? "wordcount"
        : "timed",
      duration: wasFixed || config.duration <= 0 ? TIME_OPTIONS[0] : config.duration,
    });
  };

  const togglePractice = () => {
    if (isPracticeOn) {
      // Turn off practice → back to words
      set({ contentType: "words" });
    } else {
      // Turn on practice
      set({ contentType: "practice", weakBigrams: practiceWeakBigrams });
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
        <Chip active={isWordsVariant && !(config.punctuation ?? false)} onClick={() => setWordMode(false)}>
          words
        </Chip>
        <Chip active={isWordsVariant && (config.punctuation ?? false)} onClick={() => setWordMode(true)}>
          mixed
        </Chip>
        <Chip active={ct === "quotes"} onClick={() => setContentType("quotes")}>
          quotes
        </Chip>
        <Chip active={ct === "code"} onClick={() => setContentType("code")}>
          code
        </Chip>
        <Chip active={ct === "custom" || ct === "zen"} onClick={() => setContentType("custom")}>
          custom
        </Chip>
      </div>

      {/* ── Secondary row: timing + strict mode ── */}
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

        {/* Strict mode (invisible for zen/code/custom to preserve row width) */}
        <div className={`flex items-center gap-1 transition-opacity ${
          ct === "zen" || ct === "code" || ct === "custom" ? "invisible pointer-events-none" :
          ct === "quotes" ? "opacity-20 pointer-events-none" : ""
        }`}>
          <MicroDivider />
          <StrictModeSelector
            value={config.strictMode ?? "easy"}
            onChange={(m: StrictMode) =>
              set({
                strictMode: m,
                difficulty: m,
              })
            }
          />
        </div>
      </div>

      {/* ── Tertiary row: mode-specific options (fixed height to prevent shift) ── */}
      <div className="flex items-center justify-center min-h-[28px]">
        {/* Practice toggle — only for words/mixed, Pro users with weak data */}
        {isWordsVariant && hasPracticeData && (
          <div className="flex items-center gap-1.5">
            <Sub active={isPracticeOn} onClick={togglePractice}>
              practice
            </Sub>
            {isPracticeOn && (
              <span className="text-[10px] text-muted/45 leading-tight">
                targeting your weakest keys &amp; bigrams
              </span>
            )}
            {!isPracticeOn && (
              <span className="text-[10px] text-muted/35 leading-tight">
                drill your weak spots
              </span>
            )}
          </div>
        )}

        {/* Code language picker + indent style */}
        {ct === "code" && (
          <div className="flex items-center gap-1">
            <CodeLanguagePicker
              value={config.codeLanguage}
              onChange={(lang) => set({ codeLanguage: lang })}
            />
            <MicroDivider />
            <div className="flex items-center gap-0.5">
              <Sub
                active={(config.codeIndent ?? "spaces") === "spaces"}
                onClick={() => set({ codeIndent: "spaces" })}
              >
                spaces
              </Sub>
              <Sub
                active={config.codeIndent === "tabs"}
                onClick={() => set({ codeIndent: "tabs" })}
              >
                tabs
              </Sub>
            </div>
          </div>
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
            placeholder="Paste custom text here, or just start typing below..."
            className="w-full h-20 rounded-lg bg-surface/60 ring-1 ring-white/[0.08] px-3 py-2 text-sm text-text placeholder:text-muted/65 resize-none focus:outline-none focus:ring-accent/30"
          />
        </div>
      )}

    </div>
  );
}

/* ── Sub-components ────────────────────────────────────── */

function MicroDivider() {
  return <div className="w-px h-3 bg-white/[0.06] mx-0.5" />;
}

/** Primary chip — used for the main mode/content selector */
function Chip({
  active,
  onClick,
  children,
  proLocked,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  proLocked?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1 ${
        proLocked
          ? "text-accent/40 hover:text-accent/60 hover:bg-accent/[0.04]"
          : active
            ? "bg-accent/15 text-accent ring-1 ring-accent/20"
            : "text-muted/65 hover:text-text hover:bg-white/[0.04]"
      }`}
    >
      {children}
      {proLocked && <span className="text-[10px] font-bold text-accent/50 leading-none">PRO</span>}
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
      className={`px-2 py-1 rounded text-xs font-medium transition-all ${
        active
          ? "text-accent/80 bg-accent/10"
          : "text-muted/55 hover:text-muted/70 hover:bg-white/[0.03]"
      }`}
    >
      {children}
    </button>
  );
}
