"use client";

import React, { useRef, useEffect, useCallback, useState } from "react";
import { useSession } from "next-auth/react";
import { useTypingEngine } from "@/hooks/useTypingEngine";
import { WordDisplay } from "@/components/typing/WordDisplay";
import { ConfigBar } from "./ConfigBar";
import { PracticeResults } from "./PracticeResults";

const VISIBLE_LINES = 3;

export function PracticeArena() {
  const { data: session } = useSession();
  const engine = useTypingEngine();
  const containerRef = useRef<HTMLDivElement>(null);
  const wordsInnerRef = useRef<HTMLDivElement>(null);
  const hasSavedRef = useRef(false);
  const [isPb, setIsPb] = useState<boolean | null>(null);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [lineHeight, setLineHeight] = useState(40);
  const [pbs, setPbs] = useState<Record<string, number>>({});

  // Fetch PBs on mount (logged-in only)
  useEffect(() => {
    if (!session?.user?.id) return;
    fetch("/api/solo-results")
      .then((res) => res.json())
      .then((data) => { if (data.pbs) setPbs(data.pbs); })
      .catch(() => {});
  }, [session?.user?.id]);

  // Measure line height from the words container
  useEffect(() => {
    const el = wordsInnerRef.current?.querySelector(".no-ligatures");
    if (el) {
      const computed = parseFloat(getComputedStyle(el).lineHeight);
      if (computed > 0) setLineHeight(computed);
    }
  }, [engine.words]);

  // Word scrolling: keep active word visible within VISIBLE_LINES window
  useEffect(() => {
    if (engine.status === "idle") {
      setScrollOffset(0);
      return;
    }

    const inner = wordsInnerRef.current;
    if (!inner) return;

    const wordSpans = inner.querySelectorAll(".no-ligatures > span");
    const activeSpan = wordSpans[engine.currentWordIndex] as HTMLElement;
    if (!activeSpan) return;

    const wordTop = activeSpan.offsetTop;
    // Scroll when active word reaches the 2nd visible line (0-indexed)
    const threshold = scrollOffset + lineHeight;
    if (wordTop > threshold) {
      setScrollOffset(wordTop - lineHeight);
    }
  }, [engine.currentWordIndex, engine.status, lineHeight, scrollOffset]);

  // Focus container on mount and when returning to idle
  useEffect(() => {
    if (engine.status === "idle" || engine.status === "typing") {
      requestAnimationFrame(() => containerRef.current?.focus());
    }
  }, [engine.status]);

  // Refocus after config change
  const handleAfterConfigChange = useCallback(() => {
    requestAnimationFrame(() => containerRef.current?.focus());
  }, []);

  // Save results when test finishes (logged-in only)
  useEffect(() => {
    if (engine.status !== "finished" || !engine.stats) return;
    if (hasSavedRef.current) return;
    if (!session?.user?.id) return;

    hasSavedRef.current = true;
    const stats = engine.stats;
    const config = engine.config;

    fetch("/api/solo-results", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: config.mode === "wordcount" ? "wordcount" : "timed",
        duration: config.duration,
        wpm: stats.wpm,
        rawWpm: stats.rawWpm,
        accuracy: stats.accuracy,
        correctChars: stats.correctChars,
        incorrectChars: stats.incorrectChars,
        extraChars: stats.extraChars,
        totalChars: stats.totalChars,
        time: stats.time,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.isPb) {
          setIsPb(true);
          // Update local PB cache
          const key = `${config.mode === "wordcount" ? "wordcount" : "timed"}:${config.duration}`;
          setPbs((prev) => ({ ...prev, [key]: stats.wpm }));
        }
      })
      .catch(() => {});
  }, [engine.status, engine.stats, engine.config, session?.user?.id]);

  // Reset save guard on restart
  useEffect(() => {
    if (engine.status === "idle") {
      hasSavedRef.current = false;
      setIsPb(null);
    }
  }, [engine.status]);

  const handleRestart = useCallback(() => {
    engine.restart();
  }, [engine.restart]);

  const isTyping = engine.status === "typing";
  const isFinished = engine.status === "finished";

  // Current PB for the active mode/duration
  const pbKey = `${engine.config.mode === "wordcount" ? "wordcount" : "timed"}:${engine.config.duration}`;
  const currentPb = pbs[pbKey] ?? null;

  const containerHeight = lineHeight * VISIBLE_LINES;

  return (
    <div
      className={`flex flex-col items-center gap-6 w-full max-w-4xl mx-auto ${
        isTyping ? "focus-active" : ""
      }`}
    >
      {/* Config bar + PB display */}
      {!isFinished && (
        <div className="flex flex-col items-center gap-2">
          <ConfigBar
            config={engine.config}
            status={engine.status}
            onConfigChange={engine.setConfig}
            onAfterChange={handleAfterConfigChange}
          />
          {currentPb !== null && session?.user?.id && (
            <div className="focus-fade text-xs text-muted/50 tabular-nums">
              pb{" "}
              <span className="text-muted font-medium">
                {Math.floor(currentPb)}
                <span className="opacity-50">
                  .{(currentPb % 1).toFixed(2).slice(2)}
                </span>
              </span>
              {" "}wpm
            </div>
          )}
        </div>
      )}

      {/* Typing area with scroll clipping */}
      {!isFinished && (
        <div
          ref={containerRef}
          tabIndex={0}
          onKeyDown={engine.handleKeyDown}
          className="w-full outline-none cursor-default select-none overflow-hidden"
          style={{ height: containerHeight }}
          role="textbox"
          aria-label="Solo typing area"
        >
          <div
            ref={wordsInnerRef}
            className="transition-transform duration-150 ease-out"
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

      {/* Live HUD */}
      {isTyping && (
        <div className="focus-fade flex items-center gap-4 text-sm text-muted tabular-nums">
          <span>
            <span className="text-text font-bold">{engine.liveWpm}</span> wpm
          </span>
          {engine.config.mode === "timed" && (
            <span>
              <span className="text-text font-bold">{engine.timeLeft}</span>s
            </span>
          )}
        </div>
      )}

      {/* Hints */}
      {engine.status === "idle" && (
        <p className="focus-fade text-muted/30 text-xs">
          press{" "}
          <kbd className="px-1.5 py-0.5 rounded bg-white/[0.05] text-muted/50 text-[10px]">
            Tab
          </kbd>{" "}
          +{" "}
          <kbd className="px-1.5 py-0.5 rounded bg-white/[0.05] text-muted/50 text-[10px]">
            Enter
          </kbd>{" "}
          to restart
        </p>
      )}

      {/* Results */}
      {isFinished && engine.stats && (
        <PracticeResults
          stats={engine.stats}
          config={engine.config}
          isPb={isPb}
          onRestart={handleRestart}
        />
      )}
    </div>
  );
}
