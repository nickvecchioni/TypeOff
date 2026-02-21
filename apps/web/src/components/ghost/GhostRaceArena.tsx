"use client";

import React, { useRef, useEffect, useState, useCallback, useMemo } from "react";
import { useTypingEngine } from "@/hooks/useTypingEngine";
import { useGhostRace } from "@/hooks/useGhostRace";
import { WordDisplay } from "@/components/typing/WordDisplay";
import { GhostCursorDisplay } from "./GhostCursor";
import { generateWordsForMode } from "@typeoff/shared";
import type { ReplaySnapshot, RaceMode } from "@typeoff/shared";

interface GhostRaceArenaProps {
  replayData: ReplaySnapshot[];
  seed: number;
  mode: string;
  ghostName: string;
  ghostWpm: number;
  onFinish?: (stats: { wpm: number; accuracy: number; ghostWpm: number; won: boolean }) => void;
  onBack: () => void;
}

function getVisibleLines(): number {
  return 3;
}

export function GhostRaceArena({
  replayData,
  seed,
  mode,
  ghostName,
  ghostWpm,
  onFinish,
  onBack,
}: GhostRaceArenaProps) {
  // Generate same words as the original race
  const externalWords = useMemo(
    () => generateWordsForMode(mode as RaceMode, seed),
    [seed, mode],
  );

  const engine = useTypingEngine({
    externalWords,
    mode: "wordcount",
  });

  const ghost = useGhostRace({
    replayData,
    totalWords: externalWords.length,
    ghostName,
    ghostWpm,
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const wordsInnerRef = useRef<HTMLDivElement>(null);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [lineHeight, setLineHeight] = useState(40);
  const suppressTransitionRef = useRef(false);
  const ghostStartedRef = useRef(false);

  const isTyping = engine.status === "typing";
  const isFinished = engine.status === "finished";

  // Measure line height
  useEffect(() => {
    const el = wordsInnerRef.current?.querySelector(".no-ligatures");
    if (el) {
      const computed = parseFloat(getComputedStyle(el).lineHeight);
      if (computed > 0) setLineHeight(computed);
    }
  }, [engine.words]);

  // Scroll logic
  const visibleLines = getVisibleLines();
  const containerHeight = lineHeight * visibleLines;

  useEffect(() => {
    if (engine.status === "idle") {
      suppressTransitionRef.current = true;
      setScrollOffset(0);
      requestAnimationFrame(() => { suppressTransitionRef.current = false; });
      return;
    }

    const inner = wordsInnerRef.current;
    if (!inner) return;
    const spans = inner.querySelectorAll(".no-ligatures > *");
    const activeSpan = spans[engine.currentWordIndex];
    if (!activeSpan) return;

    const parentTop = inner.getBoundingClientRect().top;
    const spanTop = activeSpan.getBoundingClientRect().top;
    const relativeTop = spanTop - parentTop + scrollOffset;
    const targetLine = 1;
    const target = Math.max(0, relativeTop - targetLine * lineHeight);
    setScrollOffset(target);
  }, [engine.currentWordIndex, lineHeight, engine.status, scrollOffset]);

  // Auto-focus
  useEffect(() => {
    containerRef.current?.focus();
  }, []);

  // Start ghost when user starts typing
  useEffect(() => {
    if (isTyping && !ghostStartedRef.current) {
      ghostStartedRef.current = true;
      ghost.startGhost();
    }
  }, [isTyping, ghost]);

  // Stop ghost and report on finish
  useEffect(() => {
    if (isFinished && engine.stats) {
      ghost.stopGhost();
      const won = engine.stats.wpm > ghostWpm;
      onFinish?.({ wpm: engine.stats.wpm, accuracy: engine.stats.accuracy, ghostWpm, won });
    }
  }, [isFinished, engine.stats, ghost, ghostWpm, onFinish]);

  // Player progress for comparison bar
  const playerProgress = useMemo(() => {
    if (engine.words.length === 0) return 0;
    return engine.currentWordIndex / engine.words.length;
  }, [engine.currentWordIndex, engine.words.length]);

  return (
    <div className="space-y-4">
      {/* Progress comparison bar */}
      <div className="space-y-1.5">
        {/* Player */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-accent font-bold w-12 text-right">You</span>
          <div className="flex-1 h-2 rounded-full bg-surface/40 ring-1 ring-white/[0.04] overflow-hidden">
            <div
              className="h-full bg-accent rounded-full transition-all duration-150"
              style={{ width: `${Math.min(100, playerProgress * 100)}%` }}
            />
          </div>
          <span className="text-[10px] text-muted/60 tabular-nums w-12">
            {engine.liveWpm} wpm
          </span>
        </div>
        {/* Ghost */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-purple-400 font-bold w-12 text-right truncate">
            {ghostName}
          </span>
          <div className="flex-1 h-2 rounded-full bg-surface/40 ring-1 ring-white/[0.04] overflow-hidden">
            <div
              className="h-full bg-purple-400/60 rounded-full transition-all duration-150"
              style={{ width: `${Math.min(100, ghost.ghostCursor.progress * 100)}%` }}
            />
          </div>
          <span className="text-[10px] text-muted/60 tabular-nums w-12">
            {Math.floor(ghostWpm)} wpm
          </span>
        </div>
      </div>

      {/* Typing area */}
      {!isFinished && (
        <div
          ref={containerRef}
          tabIndex={0}
          onKeyDown={engine.handleKeyDown}
          className="w-full outline-none cursor-default select-none overflow-hidden"
          style={{ height: containerHeight }}
          role="textbox"
          aria-label="Ghost race typing area"
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

      {/* Live WPM */}
      {!isFinished && (
        <div className={`flex items-center justify-center gap-6 tabular-nums transition-opacity duration-200 ${
          isTyping ? "opacity-100" : "opacity-0"
        }`}>
          <div className="text-center">
            <span className="text-accent font-black text-3xl">{engine.liveWpm}</span>
            <span className="text-muted/60 text-xs ml-1">you</span>
          </div>
          <span className="text-muted/20">vs</span>
          <div className="text-center">
            <span className="text-purple-400 font-black text-3xl">{Math.floor(ghostWpm)}</span>
            <span className="text-muted/60 text-xs ml-1">ghost</span>
          </div>
        </div>
      )}

      {/* Results */}
      {isFinished && engine.stats && (
        <div className="animate-fade-in space-y-4 text-center">
          <div className={`text-3xl font-black ${engine.stats.wpm > ghostWpm ? "text-correct" : "text-error"}`}>
            {engine.stats.wpm > ghostWpm ? "You Win!" : "Ghost Wins!"}
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg bg-surface/40 ring-1 ring-white/[0.04] px-4 py-3 text-center">
              <div className="text-2xl font-black text-text tabular-nums">{Math.floor(engine.stats.wpm)}</div>
              <div className="text-[10px] text-muted/65 mt-0.5">Your WPM</div>
            </div>
            <div className="rounded-lg bg-surface/40 ring-1 ring-white/[0.04] px-4 py-3 text-center">
              <div className="text-2xl font-black text-text tabular-nums">{Math.floor(engine.stats.accuracy)}%</div>
              <div className="text-[10px] text-muted/65 mt-0.5">Accuracy</div>
            </div>
            <div className="rounded-lg bg-surface/40 ring-1 ring-white/[0.04] px-4 py-3 text-center">
              <div className="text-2xl font-black text-purple-400 tabular-nums">{Math.floor(ghostWpm)}</div>
              <div className="text-[10px] text-muted/65 mt-0.5">Ghost WPM</div>
            </div>
          </div>

          <div className="flex items-center justify-center gap-4">
            <button
              onClick={onBack}
              className="text-xs text-muted/60 hover:text-muted transition-colors"
            >
              pick another
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
