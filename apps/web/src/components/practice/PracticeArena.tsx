"use client";

import React, { useRef, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useTypingEngine } from "@/hooks/useTypingEngine";
import { WordDisplay } from "@/components/typing/WordDisplay";
import { ConfigBar } from "./ConfigBar";
import { PracticeResults } from "./PracticeResults";

export function PracticeArena() {
  const { data: session } = useSession();
  const engine = useTypingEngine();
  const containerRef = useRef<HTMLDivElement>(null);
  const hasSavedRef = useRef(false);
  const [isPb, setIsPb] = React.useState<boolean | null>(null);

  // Focus container on mount and when returning to idle
  useEffect(() => {
    if (engine.status === "idle" || engine.status === "typing") {
      requestAnimationFrame(() => containerRef.current?.focus());
    }
  }, [engine.status]);

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
        if (data.isPb) setIsPb(true);
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

  return (
    <div
      className={`flex flex-col items-center gap-6 w-full max-w-4xl mx-auto ${
        isTyping ? "focus-active" : ""
      }`}
    >
      {/* Config bar */}
      {!isFinished && (
        <ConfigBar
          config={engine.config}
          status={engine.status}
          onConfigChange={engine.setConfig}
        />
      )}

      {/* Typing area */}
      {!isFinished && (
        <div
          ref={containerRef}
          tabIndex={0}
          onKeyDown={engine.handleKeyDown}
          className="w-full outline-none cursor-default select-none"
          role="textbox"
          aria-label="Practice typing area"
        >
          <WordDisplay
            words={engine.words}
            currentWordIndex={engine.currentWordIndex}
            currentCharIndex={engine.currentCharIndex}
            isTyping={isTyping}
          />
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
