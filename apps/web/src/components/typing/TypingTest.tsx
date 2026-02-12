"use client";

import React, { useRef, useEffect } from "react";
import { useTypingEngine } from "@/hooks/useTypingEngine";
import { WordDisplay } from "./WordDisplay";
import { ModeSelector } from "./ModeSelector";
import { StatsBar } from "./StatsBar";
import { Results } from "./Results";

export function TypingTest() {
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
    liveAccuracy,
    stats,
    setConfig,
    restart,
    handleKeyDown,
  } = engine;

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
      className={`flex flex-col items-center gap-8 w-full max-w-3xl mx-auto ${
        isTyping ? "focus-active" : ""
      }`}
    >
      {/* Mode selector */}
      {!isFinished && (
        <div className="focus-fade">
          <ModeSelector
            config={config}
            onConfigChange={setConfig}
            disabled={isTyping}
          />
        </div>
      )}

      {/* Stats bar */}
      {!isFinished && (
        <StatsBar
          wpm={liveWpm}
          accuracy={liveAccuracy}
          timeLeft={timeLeft}
          config={config}
          visible={isTyping}
        />
      )}

      {/* Typing area or results */}
      {isFinished && stats ? (
        <Results stats={stats} onRestart={restart} />
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

      {/* Restart hint */}
      {!isFinished && (
        <div className="focus-fade text-sm text-muted">
          <kbd className="px-1.5 py-0.5 rounded bg-surface text-text text-xs">tab</kbd> to restart
        </div>
      )}
    </div>
  );
}
