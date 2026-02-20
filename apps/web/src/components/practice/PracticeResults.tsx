"use client";

import React, { useEffect, useRef } from "react";
import { useSession, signIn } from "next-auth/react";
import Link from "next/link";
import type { TestStats, TestConfig } from "@typeoff/shared";
import { WpmChart } from "@/components/typing/WpmChart";
import { KeyboardHeatmap } from "@/components/typing/KeyboardHeatmap";
import { ShareResultCard } from "@/components/shared/ShareResultCard";

interface PracticeResultsProps {
  stats: TestStats;
  config: TestConfig;
  isPb: boolean | null;
  onRestart: () => void;
}

export function PracticeResults({ stats, config, isPb, onRestart }: PracticeResultsProps) {
  const { data: session } = useSession();
  // Tab+Enter shortcut to restart (matches typing engine pattern)
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

  return (
    <div className="flex flex-col items-center gap-6 w-full animate-slide-up">
      {/* Stats grid */}
      <div className="rounded-xl overflow-hidden ring-1 ring-white/[0.04] w-full">
        <div className="h-0.5 bg-accent opacity-50" />
        <div className="grid gap-px grid-cols-2 sm:grid-cols-4">
          {/* WPM */}
          <div className="bg-surface/40 p-4 sm:p-5 flex flex-col items-center text-center">
            <div className="flex items-baseline gap-2">
              <div className="text-3xl font-black text-accent tabular-nums">
                {Math.floor(stats.wpm)}
                <span className="text-lg opacity-50">
                  .{(stats.wpm % 1).toFixed(2).slice(2)}
                </span>
              </div>
              {isPb && (
                <span className="text-[10px] font-bold text-correct bg-correct/10 rounded-full px-2 py-0.5">
                  PB
                </span>
              )}
            </div>
            <div className="text-[11px] text-muted/60 mt-1">wpm</div>
          </div>

          {/* Accuracy */}
          <div className="bg-surface/40 p-4 sm:p-5 flex flex-col items-center text-center">
            <div className="text-3xl font-black text-text tabular-nums">
              {Math.floor(stats.accuracy)}
              <span className="text-lg opacity-50">
                .{(stats.accuracy % 1).toFixed(2).slice(2)}%
              </span>
            </div>
            <div className="text-[11px] text-muted/60 mt-1">accuracy</div>
          </div>

          {/* Consistency */}
          <div className="bg-surface/40 p-4 sm:p-5 flex flex-col items-center text-center">
            <div className="text-3xl font-black text-text tabular-nums">
              {Math.floor(stats.consistency)}
              <span className="text-lg opacity-50">%</span>
            </div>
            <div className="text-[11px] text-muted/60 mt-1">consistency</div>
          </div>

          {/* Mode */}
          <div className="bg-surface/40 p-4 sm:p-5 flex flex-col items-center text-center">
            {config.contentType === "quotes" || config.contentType === "custom" || config.contentType === "practice" ? (
              <>
                <div className="text-3xl font-black text-text tabular-nums">
                  {stats.time}
                  <span className="text-lg opacity-50">s</span>
                </div>
                <div className="text-[11px] text-muted/60 mt-1">
                  {config.contentType}{config.punctuation ? " + punct" : ""}
                </div>
              </>
            ) : (
              <>
                <div className="text-3xl font-black text-text tabular-nums">
                  {config.duration}
                  <span className="text-lg opacity-50">
                    {config.mode === "timed" ? "s" : " words"}
                  </span>
                </div>
                <div className="text-[11px] text-muted/60 mt-1">
                  {config.difficulty !== "easy" ? config.difficulty : ""}
                  {config.difficulty !== "easy" && config.punctuation ? " + " : ""}
                  {config.punctuation ? "punct" : ""}
                  {config.difficulty === "easy" && !config.punctuation
                    ? (config.mode === "timed" ? "time" : "words")
                    : ""}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* WPM Chart */}
      <div className="w-full max-w-lg mx-auto">
        <WpmChart samples={stats.wpmHistory} />
      </div>

      {/* Keyboard Heatmap */}
      {stats.keyStats && Object.keys(stats.keyStats).length > 0 && (
        <div className="w-full max-w-lg mx-auto">
          <KeyboardHeatmap keyStats={stats.keyStats} />
        </div>
      )}

      {/* Share Result Card */}
      {session?.user && (
        <ShareResultCard
          wpm={stats.wpm}
          accuracy={stats.accuracy}
          username={session.user.name ?? session.user.username ?? ""}
          mode={config.contentType === "quotes" ? "quotes" : `${config.mode === "timed" ? config.duration + "s" : config.duration + " words"}`}
        />
      )}

      {/* Sign-in prompt for guests */}
      {!session?.user && (
        <div className="flex flex-col items-center gap-3 w-full max-w-xs mx-auto">
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

      {/* Restart button */}
      <div className="flex flex-col items-center gap-2 w-full max-w-xs mx-auto pt-1">
        <button
          onClick={onRestart}
          className="w-full rounded-lg bg-accent/[0.06] ring-1 ring-accent/20 text-accent py-3 text-sm font-medium hover:bg-accent hover:text-bg hover:ring-accent transition-all"
        >
          Type Again
          <span className="inline-block w-[2px] h-[1em] bg-current animate-blink ml-0.5 translate-y-px" />
        </button>
        <p className="text-muted/30 text-xs">
          press{" "}
          <kbd className="px-1.5 py-0.5 rounded bg-white/[0.05] text-muted/50 text-[10px]">Tab</kbd>
          {" "}+{" "}
          <kbd className="px-1.5 py-0.5 rounded bg-white/[0.05] text-muted/50 text-[10px]">Enter</kbd>
          {" "}to restart
        </p>
        {session?.user && (
          <Link
            href="/ghost"
            className="text-xs text-purple-400/60 hover:text-purple-400 transition-colors mt-1"
          >
            Race your PB
          </Link>
        )}
      </div>
    </div>
  );
}
