"use client";

import React, { useRef, useEffect, useCallback } from "react";
import { useTypingEngine } from "@/hooks/useTypingEngine";
import { WordDisplay } from "@/components/typing/WordDisplay";

interface RaceTypingAreaProps {
  seed: number;
  wordCount: number;
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
  }) => void;
  disabled: boolean;
}

export function RaceTypingArea({
  seed,
  wordCount,
  onProgress,
  onFinish,
  disabled,
}: RaceTypingAreaProps) {
  const engine = useTypingEngine({
    externalSeed: seed,
    externalWordCount: wordCount,
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
      onProgress({
        wordIndex: engine.currentWordIndex,
        charIndex: engine.currentCharIndex,
        wpm: engine.liveWpm,
        progress: engine.currentWordIndex / wordCount,
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

  return (
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
  );
}
