"use client";

import React, { useRef, useEffect } from "react";
import { useTypingEngine } from "@/hooks/useTypingEngine";
import { WordDisplay } from "./WordDisplay";
import { ModeSelector } from "./ModeSelector";
import { StatsBar } from "./StatsBar";
import { Results } from "./Results";
import { PersonalBest } from "./PersonalBest";

interface TypingTestProps {
  onStatusChange?: (status: "idle" | "typing" | "finished") => void;
}

export function TypingTest({ onStatusChange }: TypingTestProps) {
  const engine = useTypingEngine();
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    words,
    currentWordIndex,
    currentCharIndex,
    status,
    timeLeft,
    config,
    liveWpm,
    stats,
    setConfig,
    restart,
    handleKeyDown,
  } = engine;

  // Notify parent of status changes
  useEffect(() => {
    onStatusChange?.(status);
  }, [status, onStatusChange]);

  // Keep focus on container so keydown events fire
  useEffect(() => {
    if (status !== "finished") {
      // Small delay to ensure the div has re-mounted after results → idle transition
      requestAnimationFrame(() => containerRef.current?.focus());
    }
  }, [status, words]);

  const isTyping = status === "typing";
  const isFinished = status === "finished";

  return (
    <div
      className={`flex flex-col items-center w-full max-w-4xl mx-auto ${
        isTyping ? "focus-active" : ""
      }`}
    >
      {/* PB + Mode selector */}
      {!isFinished && (
        <div className="focus-fade flex flex-col items-center gap-2 mb-8">
          <PersonalBest config={config} />
          <ModeSelector
            config={config}
            onConfigChange={setConfig}
            disabled={isTyping}
          />
        </div>
      )}

      {/* Typing area or results */}
      {isFinished && stats ? (
        <Results stats={stats} onRestart={restart} config={config} />
      ) : (
        <div
          ref={containerRef}
          tabIndex={0}
          onKeyDown={handleKeyDown}
          className="w-full outline-none cursor-default select-none"
          role="textbox"
          aria-label="Typing test area"
        >
          <WordDisplay
            words={words}
            currentWordIndex={currentWordIndex}
            currentCharIndex={currentCharIndex}
            isTyping={isTyping}
          />
        </div>
      )}

      {/* Stats bar (below words) */}
      {!isFinished && (
        <div className="mt-6">
          <StatsBar
            wpm={liveWpm}
            timeLeft={timeLeft}
            config={config}
            visible={isTyping}
          />
        </div>
      )}

      {/* Restart hint */}
      {!isFinished && (
        <div className="focus-fade text-sm text-muted mt-4">
          <kbd className="px-1.5 py-0.5 rounded border border-surface-bright bg-surface text-text text-xs">tab</kbd>
          {" + "}
          <kbd className="px-1.5 py-0.5 rounded border border-surface-bright bg-surface text-text text-xs">enter</kbd>
          {" "}to restart
        </div>
      )}
    </div>
  );
}
