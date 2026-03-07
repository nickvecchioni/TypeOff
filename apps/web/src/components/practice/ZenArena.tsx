"use client";

import React, { useRef, useEffect, useCallback, useState } from "react";
import { WordDisplay } from "@/components/typing/WordDisplay";
import type { TypingEngine } from "@/hooks/useTypingEngine";
import { PracticeResults } from "./PracticeResults";

interface ZenArenaProps {
  engine: TypingEngine;
}

function getVisibleLines(): number {
  return 3;
}

export function ZenArena({ engine }: ZenArenaProps) {
  const visibleLines = getVisibleLines();
  const containerRef = useRef<HTMLDivElement>(null);
  const wordsInnerRef = useRef<HTMLDivElement>(null);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [lineHeight, setLineHeight] = useState(40);
  const suppressTransitionRef = useRef(false);

  // Measure line height
  useEffect(() => {
    const el = wordsInnerRef.current?.querySelector(".no-ligatures");
    if (el) {
      const computed = parseFloat(getComputedStyle(el).lineHeight);
      if (computed > 0) setLineHeight(computed);
    }
  }, [engine.words]);

  // Word scrolling
  useEffect(() => {
    if (engine.status === "idle") {
      suppressTransitionRef.current = true;
      setScrollOffset(0);
      return;
    }

    const inner = wordsInnerRef.current;
    if (!inner) return;

    const wordSpans = inner.querySelectorAll(".no-ligatures > span");
    const activeSpan = wordSpans[engine.currentWordIndex] as HTMLElement;
    if (!activeSpan) return;

    const wordTop = activeSpan.offsetTop;
    const threshold = scrollOffset + lineHeight;
    if (wordTop > threshold) {
      setScrollOffset(wordTop - lineHeight);
    }
  }, [engine.currentWordIndex, engine.status, lineHeight, scrollOffset]);

  useEffect(() => {
    if (suppressTransitionRef.current) {
      requestAnimationFrame(() => { suppressTransitionRef.current = false; });
    }
  }, [scrollOffset]);

  // Focus management
  useEffect(() => {
    if (engine.status === "idle" || engine.status === "typing") {
      requestAnimationFrame(() => containerRef.current?.focus());
    }
  }, [engine.status]);

  const handleRestart = useCallback(() => {
    engine.restart();
  }, [engine.restart]);

  const isTyping = engine.status === "typing";
  const isFinished = engine.status === "finished";
  const containerHeight = lineHeight * visibleLines;

  return (
    <div
      className={`flex flex-col items-center gap-6 w-full max-w-5xl mx-auto ${
        isTyping ? "focus-active" : ""
      }`}
      onClick={() => containerRef.current?.focus()}
    >
      {/* Minimal header */}
      {!isFinished && (
        <div className="focus-fade flex items-center gap-4 text-sm text-muted/60">
          <span className="text-accent/60 font-medium">zen mode</span>
          {isTyping && (
            <span className="text-xs text-muted/65">
              press <kbd className="px-1 py-0.5 rounded bg-white/[0.05] text-muted/65 text-xs">Esc</kbd> to stop
            </span>
          )}
        </div>
      )}

      {/* Typing area */}
      {!isFinished && (
        <div
          ref={containerRef}
          tabIndex={0}
          onKeyDown={engine.handleKeyDown}
          className="w-full outline-none cursor-default select-none overflow-hidden animate-fade-in"
          style={{ height: containerHeight, animationFillMode: "both" }}
          role="textbox"
          aria-label="Zen typing area"
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
              isTyping={isTyping}
            />
          </div>
        </div>
      )}

      {/* Live WPM (no timer, no progress) */}
      {!isFinished && (
        <div className={`flex items-center justify-center tabular-nums -mt-2 transition-opacity duration-200 ${
          isTyping ? "opacity-100" : "opacity-0"
        }`}>
          <span className="text-muted text-sm inline-flex items-baseline">
            <span className="text-accent font-black text-5xl inline-block w-[3ch] text-right">{engine.liveWpm}</span> wpm
          </span>
        </div>
      )}

      {/* Hint */}
      {!isFinished && engine.status === "idle" && (
        <p className="text-muted/65 text-xs opacity-0 animate-fade-in" style={{ animationDelay: "100ms", animationFillMode: "both" }}>
          start typing — no time limit, no word count
        </p>
      )}

      {/* Results */}
      {isFinished && engine.stats && (
        <PracticeResults
          stats={engine.stats}
          config={engine.config}
          isPb={null}
          onRestart={handleRestart}
        />
      )}
    </div>
  );
}
