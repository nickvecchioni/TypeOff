"use client";

import React from "react";
import { useRouter } from "next/navigation";
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
  weakKeyAccuracy?: Record<string, number>;
  practiceWeakBigrams?: string[];
  weakBigramAccuracy?: Record<string, number>;
  isPro?: boolean;
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
  weakKeyAccuracy,
  practiceWeakBigrams,
  weakBigramAccuracy,
  isPro = false,
}: ConfigBarProps) {
  const router = useRouter();
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

  // Switches to words content type with punctuation flag set — preserves sub-options
  const setWordMode = (punctuation: boolean) => {
    const needsDefaults = FIXED_CONTENT_TYPES.includes(ct);
    set({
      contentType: "words",
      punctuation,
      mode: needsDefaults
        ? "timed"
        : config.mode === "wordcount"
        ? "wordcount"
        : "timed",
      duration: needsDefaults || config.duration <= 0 ? TIME_OPTIONS[0] : config.duration,
    });
  };

  return (
    <div
      className={`focus-fade flex flex-col items-center gap-2 transition-opacity ${
        isTyping ? "pointer-events-none opacity-40" : ""
      }`}
    >
      {/* ── Primary row: mode / content type ── */}
      <div className="flex items-center gap-0.5">
        <Chip active={ct === "words" && !(config.punctuation ?? false)} onClick={() => setWordMode(false)}>
          words
        </Chip>
        <Chip active={ct === "words" && (config.punctuation ?? false)} onClick={() => setWordMode(true)}>
          mixed
        </Chip>

        <Divider />

        {/* Special modes */}
        <Chip active={ct === "quotes"} onClick={() => setContentType("quotes")}>
          quotes
        </Chip>
        <Chip active={ct === "code"} onClick={() => setContentType("code")}>
          code
        </Chip>
        <Chip active={ct === "zen"} onClick={() => setContentType("zen")}>
          zen
        </Chip>
        <Chip
          active={ct === "custom"}
          onClick={() => {
            if (!isPro) { router.push("/pro"); return; }
            setContentType("custom");
          }}
          proLocked={!isPro}
        >
          custom
        </Chip>
        {isPro && practiceWeakKeys?.length ? (
          <Chip
            active={ct === "practice" && !(config.weakBigrams?.length)}
            onClick={() => set({ contentType: "practice", weakBigrams: undefined })}
          >
            drill
          </Chip>
        ) : null}
        {isPro && (practiceWeakBigrams?.length || practiceWeakKeys?.length) ? (
          <Chip
            active={ct === "practice" && !!(config.weakBigrams?.length)}
            onClick={() => set({ contentType: "practice", weakBigrams: practiceWeakBigrams })}
          >
            smart
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

        {/* Strict mode (invisible for zen + code to preserve row height) */}
        <div className={`flex items-center gap-1 transition-opacity ${
          ct === "zen" || ct === "code" ? "invisible pointer-events-none" :
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
            className="w-full h-20 rounded-lg bg-surface/60 ring-1 ring-white/[0.08] px-3 py-2 text-sm text-text placeholder:text-muted/65 resize-none focus:outline-none focus:ring-accent/30"
          />
        </div>
      )}

      {/* ── Drill weak keys info ── */}
      {ct === "practice" && !isTyping && !config.weakBigrams?.length && practiceWeakKeys && practiceWeakKeys.length > 0 && (
        <div className="flex flex-wrap justify-center gap-1.5">
          {practiceWeakKeys.map((k) => {
            const acc = weakKeyAccuracy?.[k];
            return (
              <span key={k} className="flex items-center gap-1 px-2 py-0.5 rounded bg-surface/60 ring-1 ring-white/[0.06]">
                <span className="text-accent font-bold text-xs">{k}</span>
                {acc != null && (
                  <span className={`text-[10px] tabular-nums ${acc < 0.7 ? "text-error/60" : acc < 0.9 ? "text-amber-400/60" : "text-correct/60"}`}>
                    {Math.round(acc * 100)}%
                  </span>
                )}
              </span>
            );
          })}
        </div>
      )}

      {/* ── Smart practice: weak bigrams info ── */}
      {ct === "practice" && !isTyping && config.weakBigrams?.length ? (
        <div className="flex flex-wrap justify-center gap-1.5">
          {config.weakBigrams.map((bg) => {
            const acc = weakBigramAccuracy?.[bg];
            return (
              <span key={bg} className="flex items-center gap-1 px-2 py-0.5 rounded bg-surface/60 ring-1 ring-white/[0.06]">
                <span className="text-accent font-bold text-xs">{bg}</span>
                {acc != null && (
                  <span className={`text-[10px] tabular-nums ${acc < 0.7 ? "text-error/60" : acc < 0.9 ? "text-amber-400/60" : "text-correct/60"}`}>
                    {Math.round(acc * 100)}%
                  </span>
                )}
              </span>
            );
          })}
        </div>
      ) : null}
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
          ? "text-amber-400/40 hover:text-amber-400/60 hover:bg-amber-400/[0.04]"
          : active
            ? "bg-accent/15 text-accent ring-1 ring-accent/20"
            : "text-muted/65 hover:text-text hover:bg-white/[0.04]"
      }`}
    >
      {children}
      {proLocked && <span className="text-[8px] font-bold text-amber-400/50 leading-none">PRO</span>}
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
          : "text-muted/55 hover:text-muted/70 hover:bg-white/[0.03]"
      }`}
    >
      {children}
    </button>
  );
}
