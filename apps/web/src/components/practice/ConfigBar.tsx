"use client";

import React from "react";
import type { TestConfig, ContentType, StrictMode } from "@typeoff/shared";
import type { EngineStatus } from "@typeoff/shared";
import { StrictModeSelector } from "./StrictModeSelector";
import { CodeLanguagePicker } from "./CodeLanguagePicker";
import { Tooltip } from "@/components/shared/Tooltip";

interface WeakKeyData {
  key: string;
  accuracy: number;
  total: number;
}

interface WeakBigramData {
  bigram: string;
  accuracy: number;
  total: number;
}

interface ConfigBarProps {
  config: TestConfig;
  status: EngineStatus;
  onConfigChange: (config: TestConfig) => void;
  onAfterChange?: () => void;
  practiceWeakKeys?: string[];
  practiceWeakKeysData?: WeakKeyData[];
  practiceWeakBigrams?: string[];
  practiceWeakBigramsData?: WeakBigramData[];
}

/** Characters that appear in plain "words" mode (lowercase alpha only) */
const WORDS_CHARS = new Set("abcdefghijklmnopqrstuvwxyz".split(""));

/** Additional characters that appear in "mixed" mode (punctuation + numbers) */
const MIXED_EXTRA_CHARS = new Set(".,;:?!()-'\"0123456789".split(""));

export function isKeyRelevant(key: string, punctuation: boolean): boolean {
  const k = key.toLowerCase();
  if (WORDS_CHARS.has(k)) return true;
  if (punctuation && MIXED_EXTRA_CHARS.has(k)) return true;
  return false;
}

export function isBigramRelevant(bigram: string, punctuation: boolean): boolean {
  return bigram.split("").every((ch) => isKeyRelevant(ch, punctuation));
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
  practiceWeakKeys,
  practiceWeakKeysData,
  practiceWeakBigrams,
  practiceWeakBigramsData,
}: ConfigBarProps) {
  const isTyping = status === "typing";
  const ct = config.contentType ?? "words";
  // Treat "practice" as a words/mixed variant for UI purposes
  const isWordsVariant = ct === "words" || ct === "practice";
  const isFixed = FIXED_CONTENT_TYPES.includes(ct);
  const mode = config.mode === "wordcount" ? "words" : "time";
  const durations = mode === "time" ? TIME_OPTIONS : WORD_OPTIONS;
  const isPunctuation = config.punctuation ?? false;

  // Filter weak keys/bigrams to only those relevant to current mode
  const filteredWeakKeys = practiceWeakKeys?.filter((k) => isKeyRelevant(k, isPunctuation)) ?? [];
  const filteredWeakBigrams = practiceWeakBigrams?.filter((b) => isBigramRelevant(b, isPunctuation)) ?? [];

  // Build lookup maps for tooltip data
  const keyDataMap = new Map(practiceWeakKeysData?.map((d) => [d.key, d]));
  const bigramDataMap = new Map(practiceWeakBigramsData?.map((d) => [d.bigram, d]));

  const hasPracticeData = !!(filteredWeakKeys.length || filteredWeakBigrams.length);
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
      className={`focus-fade flex flex-col items-center transition-opacity ${
        isTyping ? "pointer-events-none opacity-40" : ""
      }`}
    >
      {/* ── Primary row: mode / content type — always fixed position ── */}
      <div className="flex items-center gap-1">
        <Chip active={isWordsVariant && !(config.punctuation ?? false)} onClick={() => setWordMode(false)}>
          words
        </Chip>
        <Chip active={isWordsVariant && (config.punctuation ?? false)} onClick={() => setWordMode(true)}>
          full
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

      {/* ── Secondary row: fixed height, content fades in/out ── */}
      <div className="relative h-[36px] mt-3 flex items-center justify-center w-full">
        {/* Words/Mixed: time/words toggle + duration + strict + practice */}
        <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-200 ${
          isWordsVariant ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <Tooltip label="Time mode" position="bottom">
                <Sub
                  active={mode === "time"}
                  onClick={() => set({ mode: "timed", duration: TIME_OPTIONS[0] })}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="13" r="8" />
                    <path d="M12 9v4l2 2" />
                    <path d="M5 3L2 6" />
                    <path d="M22 6l-3-3" />
                    <line x1="12" y1="1" x2="12" y2="3" />
                  </svg>
                </Sub>
              </Tooltip>
              <Tooltip label="Word count mode" position="bottom">
                <Sub
                  active={mode === "words"}
                  onClick={() => set({ mode: "wordcount", duration: WORD_OPTIONS[0] })}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="4" y1="9" x2="20" y2="9" />
                    <line x1="4" y1="15" x2="20" y2="15" />
                    <line x1="10" y1="3" x2="8" y2="21" />
                    <line x1="16" y1="3" x2="14" y2="21" />
                  </svg>
                </Sub>
              </Tooltip>
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

            <div className="flex items-center gap-1">
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

            {hasPracticeData && (
              <div className="flex items-center">
                <MicroDivider />
                <Tooltip label={isPracticeOn ? "Targeting your weakest keys & bigrams. Click to disable" : "Generate text targeting your weak spots"} position="bottom">
                  <button
                    onClick={togglePractice}
                    className={`p-1.5 rounded-md transition-all inline-flex items-center ${
                      isPracticeOn
                        ? "text-amber-400 bg-amber-500/15"
                        : "text-muted/55 hover:text-muted/70 hover:bg-white/[0.03]"
                    }`}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="8" />
                      <line x1="12" y1="2" x2="12" y2="6" />
                      <line x1="12" y1="18" x2="12" y2="22" />
                      <line x1="2" y1="12" x2="6" y2="12" />
                      <line x1="18" y1="12" x2="22" y2="12" />
                    </svg>
                  </button>
                </Tooltip>
              </div>
            )}
          </div>
        </div>

        {/* Code: language picker */}
        <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-200 ${
          ct === "code" ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}>
          <CodeLanguagePicker
            value={config.codeLanguage}
            onChange={(lang) => set({ codeLanguage: lang })}
          />
        </div>

        {/* Custom: hint */}
        <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-200 ${
          ct === "custom" || ct === "zen" ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}>
          <span className="text-sm text-text/45">
            paste text or just start typing
          </span>
        </div>
      </div>

    </div>
  );
}

/* ── Sub-components ────────────────────────────────────── */

function MicroDivider() {
  return <div className="w-px h-4 bg-white/[0.08] mx-0.5" />;
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
      className={`px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1 ${
        proLocked
          ? "text-accent/60 hover:text-accent/60 hover:bg-accent/[0.04]"
          : active
            ? "bg-accent/15 text-accent ring-1 ring-accent/20"
            : "text-muted/65 hover:text-text hover:bg-white/[0.04]"
      }`}
    >
      {children}
      {proLocked && <span className="text-xs font-bold text-accent/60 leading-none">PRO</span>}
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
      className={`px-2.5 py-1.5 rounded-md text-sm font-medium transition-all inline-flex items-center ${
        active
          ? "text-accent/80 bg-accent/10"
          : "text-muted/55 hover:text-muted/70 hover:bg-white/[0.03]"
      }`}
    >
      {children}
    </button>
  );
}
