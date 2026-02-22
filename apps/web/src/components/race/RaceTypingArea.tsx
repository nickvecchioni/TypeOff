"use client";

import React, { useRef, useEffect, useCallback, useState, useMemo } from "react";
import { useTypingEngine } from "@/hooks/useTypingEngine";
import { useCapsLock } from "@/hooks/useCapsLock";
import { WordDisplay } from "@/components/typing/WordDisplay";
import { useActiveCosmetics } from "@/contexts/CosmeticContext";
import { TYPING_THEMES, generateWordsForMode } from "@typeoff/shared";
import type { RaceMode } from "@typeoff/shared";

interface RaceTypingAreaProps {
  seed: number;
  wordCount: number;
  mode: RaceMode;
  finishTimeoutEnd?: number | null;
  onProgress: (data: {
    wordIndex: number;
    charIndex: number;
    wpm: number;
    progress: number;
  }) => void;
  onFinish: (data: {
    wpm: number;
    rawWpm: number;
    accuracy: number;
    misstypedChars: number;
    wpmHistory?: import("@typeoff/shared").WpmSample[];
  }) => void;
  disabled: boolean;
}

export function RaceTypingArea({
  seed,
  wordCount,
  mode,
  finishTimeoutEnd,
  onProgress,
  onFinish,
  disabled,
}: RaceTypingAreaProps) {
  const { activeTypingTheme } = useActiveCosmetics();
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
  const sentFinish = useRef(false);

  // Auto-focus and start race timer when the race begins
  useEffect(() => {
    if (!disabled) {
      requestAnimationFrame(() => containerRef.current?.focus());
      engine.startRaceTimer();
    }
  }, [disabled]); // eslint-disable-line react-hooks/exhaustive-deps

  // Report progress
  const prevReport = useRef({ wordIndex: 0, charIndex: 0 });
  useEffect(() => {
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
      let typedChars = engine.currentCharIndex;
      for (let i = 0; i < engine.currentWordIndex; i++) {
        typedChars += engine.words[i]?.chars.length ?? 0;
      }
      const totalChars = engine.words.reduce((sum, w) => sum + w.chars.length, 0);

      onProgress({
        wordIndex: engine.currentWordIndex,
        charIndex: engine.currentCharIndex,
        wpm: engine.liveWpm,
        progress: totalChars > 0 ? typedChars / totalChars : 0,
      });
    }
  }, [engine.currentWordIndex, engine.currentCharIndex, engine.status, engine.liveWpm, onProgress, wordCount]);

  // Report finish
  useEffect(() => {
    if (engine.status === "finished" && engine.stats && !sentFinish.current) {
      sentFinish.current = true;
      onFinish({
        wpm: engine.stats.wpm,
        rawWpm: engine.stats.rawWpm,
        accuracy: engine.stats.accuracy,
        misstypedChars: engine.stats.misstypedChars,
        wpmHistory: engine.stats.wpmHistory,
      });
    }
  }, [engine.status, engine.stats, onFinish]);

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

  // Finish timeout countdown
  const [timeoutRemaining, setTimeoutRemaining] = useState<number | null>(null);
  useEffect(() => {
    if (!finishTimeoutEnd || engine.status === "finished") {
      setTimeoutRemaining(null);
      return;
    }
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((finishTimeoutEnd - Date.now()) / 1000));
      setTimeoutRemaining(remaining);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [finishTimeoutEnd, engine.status]);

  return (
    <div className={`w-full relative ${themeClass}`}>
      {timeoutRemaining != null && timeoutRemaining > 0 && (
        <div className="text-center text-sm text-muted mb-3 tabular-nums h-5 flex items-center justify-center">
          Time remaining: <span className="text-accent font-bold ml-1">{timeoutRemaining}s</span>
        </div>
      )}
      <div
        ref={containerRef}
        tabIndex={0}
        onKeyDown={disabled ? undefined : handleKeyDown}
        className="relative w-full outline-none cursor-default select-none"
        role="textbox"
        aria-label="Race typing area"
      >
        {capsLock && (
          <div className="absolute top-1.5 right-0 z-10 pointer-events-none">
            <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/20">
              Caps Lock
            </span>
          </div>
        )}
        <WordDisplay
          words={engine.words}
          currentWordIndex={engine.currentWordIndex}
          currentCharIndex={engine.currentCharIndex}
          isTyping={engine.status === "typing"}
          contentType={mode === "code" ? "code" : undefined}
        />
      </div>
      <div className={`flex items-baseline justify-center text-muted text-sm tabular-nums mt-4 transition-opacity duration-200 ${
        engine.status === "typing" ? "opacity-100" : "opacity-0"
      }`}>
        <span className="text-accent font-black text-5xl inline-block w-[3ch] text-right">{engine.liveWpm}</span> wpm
      </div>
    </div>
  );
}
