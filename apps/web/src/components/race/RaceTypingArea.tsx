"use client";

import React, { useRef, useEffect, useCallback, useState, useMemo } from "react";
import { useTypingEngine } from "@/hooks/useTypingEngine";
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
  const themeClass = activeTypingTheme ? TYPING_THEMES[activeTypingTheme]?.className ?? "" : "";

  // Use the same generation function as the server for all modes
  const externalWords = useMemo(
    () => generateWordsForMode(mode, seed),
    [mode, seed],
  );

  const engine = useTypingEngine({
    externalWords,
    mode: "wordcount",
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const sentFinish = useRef(false);

  // Auto-focus
  useEffect(() => {
    if (!disabled) {
      requestAnimationFrame(() => containerRef.current?.focus());
    }
  }, [disabled]);

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
      // Don't allow Tab/Escape to restart during a race
      if (e.key === "Tab" || e.key === "Escape") {
        e.preventDefault();
        return;
      }
      engine.handleKeyDown(e);
    },
    [engine.handleKeyDown]
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
      <div className="text-center text-sm text-muted mb-3 tabular-nums h-5">
        {timeoutRemaining != null && timeoutRemaining > 0 && (
          <>Time remaining: <span className="text-accent font-bold">{timeoutRemaining}s</span></>
        )}
      </div>
      <div
        ref={containerRef}
        tabIndex={0}
        onKeyDown={disabled ? undefined : handleKeyDown}
        className="w-full outline-none cursor-default select-none"
        role="textbox"
        aria-label="Race typing area"
      >
        <WordDisplay
          words={engine.words}
          currentWordIndex={engine.currentWordIndex}
          currentCharIndex={engine.currentCharIndex}
          isTyping={engine.status === "typing"}
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
