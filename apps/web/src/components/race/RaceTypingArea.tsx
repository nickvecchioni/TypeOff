"use client";

import React, { useRef, useEffect, useCallback, useState, useMemo } from "react";
import { useTypingEngine } from "@/hooks/useTypingEngine";
import { useCapsLock } from "@/hooks/useCapsLock";
import { WordDisplay } from "@/components/typing/WordDisplay";
import { useActiveCosmetics } from "@/contexts/CosmeticContext";
import { useSettings, useFocusActive } from "@/contexts/SettingsContext";
import { TYPING_THEMES, generateWordsForMode, getCodeSnippet } from "@typeoff/shared";
import type { RaceMode } from "@typeoff/shared";

interface RaceTypingAreaProps {
  seed: number;
  wordCount: number;
  mode: RaceMode;
  onProgress: (data: {
    wordIndex: number;
    charIndex: number;
    wpm: number;
    progress: number;
    finalStats?: { wpm: number; rawWpm: number; accuracy: number; misstypedChars?: number };
  }) => void;
  onFinish: (data: {
    wpm: number;
    rawWpm: number;
    accuracy: number;
    misstypedChars: number;
    wpmHistory?: import("@typeoff/shared").WpmSample[];
    keyStats?: import("@typeoff/shared").KeyStatsMap;
  }) => void;
  disabled: boolean;
}

const VISIBLE_LINES = 3;

export function RaceTypingArea({
  seed,
  wordCount,
  mode,
  onProgress,
  onFinish,
  disabled,
}: RaceTypingAreaProps) {
  const { activeTypingTheme } = useActiveCosmetics();
  const settings = useSettings();
  const [, setFocusActive] = useFocusActive();
  const capsLock = useCapsLock();
  const themeClass = activeTypingTheme ? TYPING_THEMES[activeTypingTheme]?.className ?? "" : "";

  // Use the same generation function as the server for all modes
  const externalWords = useMemo(
    () => generateWordsForMode(mode, seed),
    [mode, seed],
  );

  const engine = useTypingEngine({
    externalWords,
    mode: "wordcount",
    contentType: mode === "code" ? "code" : undefined,
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const wordsInnerRef = useRef<HTMLDivElement>(null);
  const sentFinish = useRef(false);

  // Word scrolling state (mirrors PracticeArena pattern)
  const [scrollOffset, setScrollOffset] = useState(0);
  const [lineHeight, setLineHeight] = useState(40);
  const suppressTransitionRef = useRef(false);

  // Measure line height from the rendered word list
  useEffect(() => {
    const el = wordsInnerRef.current?.querySelector(".no-ligatures");
    if (el) {
      const computed = parseFloat(getComputedStyle(el).lineHeight);
      if (computed > 0) setLineHeight(computed);
    }
  }, [engine.words]);

  // Reset scroll when a new race starts (seed/mode change or re-enable)
  useEffect(() => {
    suppressTransitionRef.current = true;
    setScrollOffset(0);
  }, [seed, mode]);

  // Clear suppress flag after the instant reset renders
  useEffect(() => {
    if (suppressTransitionRef.current) {
      requestAnimationFrame(() => {
        suppressTransitionRef.current = false;
      });
    }
  }, [scrollOffset]);

  // Scroll to keep active word in the visible window
  useEffect(() => {
    const inner = wordsInnerRef.current;
    if (!inner) return;

    const activeSpan = inner.querySelector(
      `[data-wordindex="${engine.currentWordIndex}"]`,
    ) as HTMLElement | null;
    if (!activeSpan) return;

    const wordTop = activeSpan.offsetTop;
    const wordLine = Math.floor(wordTop / lineHeight);
    const scrollLine = Math.round(scrollOffset / lineHeight);
    if (wordLine > scrollLine + 1) {
      setScrollOffset((wordLine - 1) * lineHeight);
    }
  }, [engine.currentWordIndex, engine.status, lineHeight, scrollOffset]);

  // Sync focus mode state to layout
  const raceIsTyping = engine.status === "typing";
  useEffect(() => {
    setFocusActive(raceIsTyping && settings.focusMode);
    return () => setFocusActive(false);
  }, [raceIsTyping, settings.focusMode, setFocusActive]);

  // Auto-focus and start race timer when the race begins
  useEffect(() => {
    if (!disabled) {
      requestAnimationFrame(() => containerRef.current?.focus());
      engine.startRaceTimer();
    }
  }, [disabled]); // eslint-disable-line react-hooks/exhaustive-deps

  // Report progress — also fires once when status becomes "finished" to send progress=1.0
  // so the server's auto-finish safety net triggers even if the raceFinish event is lost.
  const prevReport = useRef({ wordIndex: 0, charIndex: 0 });
  const sentFinalProgress = useRef(false);
  useEffect(() => {
    if (engine.status === "finished" && !sentFinalProgress.current) {
      // Send one final progress update with progress=1.0
      // Include finalStats directly so the server's safety net has accurate WPM
      // even before localFinishRef is set (the finish effect fires after this one).
      sentFinalProgress.current = true;
      onProgress({
        wordIndex: engine.currentWordIndex,
        charIndex: engine.currentCharIndex,
        wpm: engine.liveWpm > 0 ? engine.liveWpm : 1,
        progress: 1,
        finalStats: engine.stats ? {
          wpm: engine.stats.wpm,
          rawWpm: engine.stats.rawWpm,
          accuracy: engine.stats.accuracy,
          misstypedChars: engine.stats.misstypedChars,
        } : undefined,
      });
      return;
    }
    if (
      engine.status === "typing" &&
      (engine.currentWordIndex !== prevReport.current.wordIndex ||
        engine.currentCharIndex !== prevReport.current.charIndex)
    ) {
      prevReport.current = {
        wordIndex: engine.currentWordIndex,
        charIndex: engine.currentCharIndex,
      };

      // Character-level progress for smooth race track
      // Include inter-word spaces to match server's bot progress denominator
      let typedChars = engine.currentCharIndex;
      for (let i = 0; i < engine.currentWordIndex; i++) {
        typedChars += (engine.words[i]?.chars.length ?? 0) + 1; // +1 for space after each completed word
      }
      const totalChars = engine.words.reduce((sum, w) => sum + w.chars.length, 0)
        + (engine.words.length - 1); // include inter-word spaces like the server does

      let prog = totalChars > 0 ? typedChars / totalChars : 0;
      // Cap at 0.99 during typing — the final progress=1 is sent explicitly
      // when the engine finishes (all words correct). Without this cap, typing
      // all chars of the last word incorrectly would reach 1.0 and trigger the
      // server's auto-finish safety net prematurely.
      if (prog >= 1) prog = 0.99;

      onProgress({
        wordIndex: engine.currentWordIndex,
        charIndex: engine.currentCharIndex,
        wpm: engine.liveWpm,
        progress: prog,
      });
    }
  }, [engine.currentWordIndex, engine.currentCharIndex, engine.status, engine.liveWpm, onProgress, wordCount]);

  // Report finish — sends raceFinish and retries aggressively until parent transitions away
  const finishRetryTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (engine.status === "finished" && engine.stats && !sentFinish.current) {
      sentFinish.current = true;
      const finishData = {
        wpm: engine.stats.wpm,
        rawWpm: engine.stats.rawWpm,
        accuracy: engine.stats.accuracy,
        misstypedChars: engine.stats.misstypedChars,
        wpmHistory: engine.stats.wpmHistory,
        keyStats: engine.stats.keyStats,
      };
      onFinish(finishData);

      // Retry every 2s — handles socket reconnections where the first event was lost.
      // Also resend progress=1 so the server's auto-finish safety net triggers.
      const progressData = {
        wordIndex: engine.currentWordIndex,
        charIndex: engine.currentCharIndex,
        wpm: engine.liveWpm > 0 ? engine.liveWpm : 1,
        progress: 1,
      };
      let retryCount = 0;
      finishRetryTimer.current = setInterval(() => {
        retryCount++;
        console.warn(`[RaceTypingArea] Finish retry #${retryCount}: resending raceFinish + progress=1`);
        onFinish(finishData);
        onProgress(progressData);
        // Stop after 6 retries (12s) — the stuck detection in RaceArena takes over
        if (retryCount >= 6 && finishRetryTimer.current) {
          clearInterval(finishRetryTimer.current);
          finishRetryTimer.current = null;
        }
      }, 2000);
    }
    return () => {
      if (finishRetryTimer.current) {
        clearInterval(finishRetryTimer.current);
        finishRetryTimer.current = null;
      }
    };
  }, [engine.status, engine.stats, onFinish, onProgress]);

  // Safety-net: detect completion from word state and force finish if the engine missed it.
  // Runs on every render — checks if all chars are correct and forces the race to end.
  const safetyFinishSent = useRef(false);
  useEffect(() => {
    if (disabled || engine.words.length === 0 || safetyFinishSent.current || sentFinish.current) return;
    // Check if every char in every word is correct
    const allWordsComplete = engine.words.every(
      (w) => w.chars.length > 0 && w.chars.every((c) => c.status === "correct"),
    );
    if (!allWordsComplete) return;

    // All words are complete — the race should be over
    if (engine.status === "finished") {
      // Engine already finished — the normal finish effect will handle it
      return;
    }

    console.warn("[RaceTypingArea] Safety-net: all words complete but engine status is", engine.status);

    // Try forcing the engine to finish — this schedules setStats + setStatus("finished")
    engine.forceFinish();

    // Schedule a fallback: if the normal finish flow hasn't sent after 100ms, send directly
    const timer = setTimeout(() => {
      if (!sentFinish.current && !safetyFinishSent.current) {
        safetyFinishSent.current = true;
        const wpm = engine.liveWpm > 0 ? engine.liveWpm : 1;
        console.warn("[RaceTypingArea] Safety-net fallback: sending onFinish directly with wpm=", wpm);
        onFinish({
          wpm,
          rawWpm: wpm,
          accuracy: 100,
          misstypedChars: 0,
        });
      }
    }, 100);
    return () => clearTimeout(timer);
  });

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Don't allow Escape to restart during a race
      if (e.key === "Escape") {
        e.preventDefault();
        return;
      }
      // Allow Tab through in code mode (used to skip indent tokens)
      if (e.key === "Tab" && mode !== "code") {
        e.preventDefault();
        return;
      }
      engine.handleKeyDown(e);
    },
    [engine.handleKeyDown, mode]
  );

  const wordContainerHeight = lineHeight * VISIBLE_LINES;

  return (
    <div className={`w-full relative ${themeClass}`}>
      <div
        ref={containerRef}
        tabIndex={0}
        onKeyDown={disabled ? undefined : handleKeyDown}
        className="relative w-full outline-none cursor-default select-none overflow-hidden"
        style={{ height: wordContainerHeight }}
        role="textbox"
        aria-label="Race typing area"
      >
        <div
          ref={wordsInnerRef}
          className={suppressTransitionRef.current ? "" : "transition-transform duration-150 ease-out"}
          style={{ transform: `translateY(-${scrollOffset}px)` }}
        >
          <WordDisplay
            words={engine.words}
            currentWordIndex={engine.currentWordIndex}
            currentCharIndex={engine.currentCharIndex}
            isTyping={engine.status === "typing"}
            contentType={mode === "code" ? "code" : undefined}
          />
        </div>
      </div>
      {mode === "code" && (() => {
        const snippet = getCodeSnippet(seed);
        return (
          <div className="text-center mt-2 text-xs text-muted/50">
            {snippet.name} <span className="text-muted/60">·</span> <span className="text-muted/60">{snippet.language}</span>
          </div>
        );
      })()}
      <div className={`flex items-baseline justify-center gap-6 text-muted text-sm tabular-nums mt-4 transition-opacity duration-200 ${
        engine.status === "typing" ? "opacity-100" : "opacity-0"
      }`}>
        {settings.showLiveWpm && (
          <span className="inline-flex items-baseline">
            <span className="text-accent font-black text-5xl inline-block w-[3ch] text-right">{engine.liveWpm}</span> wpm
          </span>
        )}
        {settings.showLiveAccuracy && (
          <span className="inline-flex items-baseline">
            <span className="text-accent font-black text-5xl inline-block w-[4ch] text-right">{engine.liveAccuracy}</span>%
          </span>
        )}
      </div>
      {capsLock && (
        <div className="absolute left-1/2 -translate-x-1/2 bottom-2 z-10">
          <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/20">
            Caps Lock
          </span>
        </div>
      )}
    </div>
  );
}
