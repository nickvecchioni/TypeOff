"use client";

import React, { useEffect, useRef } from "react";
import { useSession, signIn } from "next-auth/react";
import Link from "next/link";
import type { TestStats, TestConfig } from "@typeoff/shared";
import { getQuoteByIndex, getCodeSnippet } from "@typeoff/shared";
import { WpmChart } from "@/components/typing/WpmChart";
import { KeyboardHeatmap } from "@/components/typing/KeyboardHeatmap";
import { ShareResultCard } from "@/components/shared/ShareResultCard";

interface PracticeResultsProps {
  stats: TestStats;
  config: TestConfig;
  isPb: boolean | null;
  onRestart: () => void;
  seed?: number | null;
}

export function PracticeResults({ stats, config, isPb, onRestart, seed }: PracticeResultsProps) {
  const { data: session } = useSession();
  const tabPressedRef = useRef(false);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || tag === "BUTTON" || tag === "A") return;

      if (e.key === "Tab") {
        e.preventDefault();
        tabPressedRef.current = true;
        return;
      }
      if (e.key === "Enter" && tabPressedRef.current) {
        e.preventDefault();
        tabPressedRef.current = false;
        onRestart();
        return;
      }
      tabPressedRef.current = false;
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onRestart]);

  const modeLabel = (() => {
    const parts: string[] = [];
    if (config.contentType === "quotes" || config.contentType === "custom" || config.contentType === "practice") {
      parts.push(config.contentType);
    } else {
      parts.push(config.mode === "timed" ? `${config.duration}s` : `${config.duration} words`);
      if (config.difficulty !== "easy") parts.push(config.difficulty);
      if (config.punctuation) parts.push("punct");
    }
    return parts.join(" · ");
  })();

  const showRawWpm = stats.rawWpm > 0 && Math.floor(stats.rawWpm) !== Math.floor(stats.wpm);

  return (
    <div className="flex flex-col gap-1.5 w-full animate-slide-up">
      {/* ── Hero stats ─────────────────────────────────────── */}
      <div className="rounded-xl overflow-hidden ring-1 ring-white/[0.04]">
        <div className="h-0.5 bg-accent opacity-50" />
        <div className="grid gap-px grid-cols-2 sm:grid-cols-4">
          {/* WPM */}
          <div className="bg-surface/40 px-4 py-2.5">
            <div className="flex items-baseline gap-2">
              <div className="text-3xl sm:text-4xl font-black text-accent tabular-nums leading-none">
                {Math.floor(stats.wpm)}
                <span className="text-lg opacity-50">
                  .{(stats.wpm % 1).toFixed(2).slice(2)}
                </span>
              </div>
              {isPb && (
                <span className="text-[10px] font-black text-correct bg-correct/10 ring-1 ring-correct/30 rounded px-1.5 py-0.5 uppercase tracking-wider leading-none animate-fade-in">
                  PB
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <div className="text-[10px] text-muted/60 uppercase tracking-wide">wpm</div>
              {showRawWpm && (
                <div className="text-[10px] text-muted/65 tabular-nums">
                  {Math.floor(stats.rawWpm)} raw
                </div>
              )}
            </div>
          </div>

          {/* Accuracy */}
          <div className="bg-surface/40 px-3 py-2.5 sm:px-4 flex flex-col justify-end">
            <div className="text-3xl sm:text-4xl font-black text-text tabular-nums leading-none">
              {Math.floor(stats.accuracy)}
              <span className="text-lg opacity-50">
                .{((stats.accuracy % 1) * 10).toFixed(0)}%
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <div className="text-[10px] text-muted/60 uppercase tracking-wide">accuracy</div>
              {stats.misstypedChars > 0 && (
                <div className="text-[10px] text-error/50 tabular-nums">
                  {stats.misstypedChars} mistakes
                </div>
              )}
            </div>
          </div>

          {/* Consistency */}
          <div className="bg-surface/40 px-3 py-2.5 sm:px-4 flex flex-col justify-end">
            <div className="text-3xl sm:text-4xl font-black text-text tabular-nums leading-none">
              {Math.floor(stats.consistency)}
              <span className="text-lg opacity-50">%</span>
            </div>
            <div className="text-[10px] text-muted/60 mt-1 uppercase tracking-wide">consistency</div>
          </div>

          {/* Time + Mode */}
          <div className="bg-surface/40 px-3 py-2.5 sm:px-4 flex flex-col justify-end">
            <div className="text-3xl sm:text-4xl font-black text-text tabular-nums leading-none">
              {stats.time >= 60
                ? <>{Math.floor(stats.time / 60)}<span className="text-lg opacity-50">:{String(Math.round(stats.time % 60)).padStart(2, "0")}</span></>
                : <>{stats.time}<span className="text-lg opacity-50">s</span></>}
            </div>
            <div className="text-[10px] text-muted/60 mt-1 uppercase tracking-wide">{modeLabel}</div>
          </div>
        </div>

        {/* Secondary stats row: characters breakdown */}
        <div className="flex items-center gap-px">
          <div className="flex-1 bg-surface/40 px-3 py-1.5 sm:px-4">
            <div className="flex items-center gap-3 text-[11px] tabular-nums">
              <span className="text-correct/70">
                <span className="font-bold">{stats.correctChars}</span>
                <span className="text-muted/50 ml-1">correct</span>
              </span>
              <span className="text-error/60">
                <span className="font-bold">{stats.incorrectChars}</span>
                <span className="text-muted/50 ml-1">incorrect</span>
              </span>
              {stats.extraChars > 0 && (
                <span className="text-muted/60">
                  <span className="font-bold">{stats.extraChars}</span>
                  <span className="text-muted/50 ml-1">extra</span>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Quote / Code info ────────────────────────────────── */}
      {config.contentType === "quotes" && seed != null && (() => {
        const quote = getQuoteByIndex(seed);
        return (
          <div className="rounded-xl bg-surface/30 ring-1 ring-white/[0.04] px-4 py-3">
            <div className="text-sm text-text/70 italic leading-relaxed">&ldquo;{quote.text}&rdquo;</div>
            <div className="text-xs text-muted/50 mt-1.5">&mdash; {quote.author}</div>
          </div>
        );
      })()}
      {config.contentType === "code" && seed != null && (() => {
        const snippet = getCodeSnippet(seed, config.codeLanguage);
        return (
          <div className="rounded-xl bg-surface/30 ring-1 ring-white/[0.04] px-4 py-2.5 flex items-center gap-2">
            <span className="text-xs font-mono text-accent/70">&lt;/&gt;</span>
            <span className="text-sm text-text/70">{snippet.name}</span>
            <span className="text-xs text-muted/40">{snippet.language}</span>
          </div>
        );
      })()}

      {/* ── Two-column grid ────────────────────────────────── */}
      <div
        className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 w-full"
        style={{ animation: "fade-in 0.3s ease-out 0.05s both" }}
      >
        {/* ── Left: WPM Chart ── */}
        <div className="flex flex-col gap-1.5">
          {stats.wpmHistory.length >= 2 && (
            <div className="rounded-xl bg-surface/30 ring-1 ring-white/[0.04] px-3 pt-2.5 pb-1.5 flex flex-col min-h-[180px]">
              <div className="text-[10px] font-bold text-muted/50 uppercase tracking-widest mb-1.5">WPM over time</div>
              <div className="flex-1 min-h-0">
                <WpmChart samples={stats.wpmHistory} />
              </div>
            </div>
          )}

          {/* Share + Sign-in */}
          <div className="flex flex-col items-center gap-3">
            {session?.user?.username && (
              <ShareResultCard
                data={{
                  variant: "solo",
                  wpm: stats.wpm,
                  accuracy: stats.accuracy,
                  consistency: stats.consistency,
                  modeLabel,
                  username: session.user!.username!,
                  date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
                }}
              />
            )}

            {!session?.user && (
              <div className="flex flex-col items-center gap-3 w-full">
                <p className="text-muted/60 text-xs">Sign in to save your result</p>
                <button
                  onClick={() => signIn("google", { callbackUrl: "/solo" })}
                  className="group flex items-center gap-3 rounded-lg bg-white/[0.05] ring-1 ring-white/[0.08] px-6 py-3.5 text-sm text-text hover:bg-white/[0.09] hover:ring-white/[0.15] transition-all"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  <span className="font-medium">Sign in with Google</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── Right: Keyboard Heatmap ── */}
        <div className="flex flex-col gap-1.5">
          {stats.keyStats && Object.keys(stats.keyStats).length > 0 && (
            <div className="rounded-xl bg-surface/30 ring-1 ring-white/[0.04] px-3 pt-2.5 pb-2 flex flex-col">
              <div className="text-[10px] font-bold text-muted/50 uppercase tracking-widest mb-2">Key Accuracy</div>
              <KeyboardHeatmap keyStats={stats.keyStats} />
            </div>
          )}
        </div>
      </div>

      {/* ── Actions ────────────────────────────────────────── */}
      <div className="flex flex-col items-center gap-1.5 w-full max-w-xs mx-auto pt-1">
        <button
          onClick={onRestart}
          className="w-full rounded-lg bg-accent/[0.06] ring-1 ring-accent/20 text-accent py-2.5 text-sm font-medium hover:bg-accent hover:text-bg hover:ring-accent transition-all flex flex-col items-center gap-1"
        >
          <span>
            Type Again
            <span className="inline-block w-[2px] h-[1em] bg-current animate-blink ml-0.5 translate-y-px" />
          </span>
          <span className="text-[9px] font-normal text-accent/40 flex items-center gap-1">
            <kbd className="inline-flex items-center px-1 py-px rounded bg-white/[0.04] ring-1 ring-white/[0.07] text-[9px] font-medium">Tab</kbd>
            {" + "}
            <kbd className="inline-flex items-center px-1 py-px rounded bg-white/[0.04] ring-1 ring-white/[0.07] text-[9px] font-medium">Enter ↵</kbd>
          </span>
        </button>

        {/* Secondary actions */}
        <div className="flex items-center gap-2">
          <Link
            href="/analytics"
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-muted/50 hover:text-muted transition-colors rounded"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="20" x2="18" y2="10" />
              <line x1="12" y1="20" x2="12" y2="4" />
              <line x1="6" y1="20" x2="6" y2="14" />
            </svg>
            <span className="text-[10px] font-medium">Analytics</span>
          </Link>
          <Link
            href="/history"
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-muted/50 hover:text-muted transition-colors rounded"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span className="text-[10px] font-medium">History</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
