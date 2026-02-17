"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { useTypingEngine } from "@/hooks/useTypingEngine";
import { WordDisplay } from "@/components/typing/WordDisplay";
import { WpmChart } from "@/components/typing/WpmChart";

interface DailyChallengeProps {
  seed: number;
  wordCount: number;
  myBestWpm: number | null;
}

export function DailyChallenge({ seed, wordCount, myBestWpm }: DailyChallengeProps) {
  const engine = useTypingEngine({
    externalSeed: seed,
    externalWordCount: wordCount,
    mode: "wordcount",
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<{
    wpm: number;
    accuracy: number;
    streak: number;
    isNewBest: boolean;
  } | null>(null);
  const [bestWpm, setBestWpm] = useState(myBestWpm);

  // Focus the typing area on mount and after restart
  useEffect(() => {
    if (engine.status !== "finished") {
      containerRef.current?.focus();
    }
  }, [engine.status]);

  // Submit result when finished
  useEffect(() => {
    if (engine.status === "finished" && engine.stats && !submitted) {
      setSubmitted(true);
      fetch("/api/daily", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wpm: engine.stats.wpm,
          rawWpm: engine.stats.rawWpm,
          accuracy: engine.stats.accuracy,
        }),
      })
        .then((r) => r.json())
        .then((data) => {
          setResult({
            wpm: data.result?.wpm ?? engine.stats!.wpm,
            accuracy: data.result?.accuracy ?? engine.stats!.accuracy,
            streak: data.streak ?? 0,
            isNewBest: data.isNewBest ?? false,
          });
          if (data.result?.wpm) {
            setBestWpm(data.result.wpm);
          }
        })
        .catch(() => {
          // If not logged in or error, show local stats
          setResult({
            wpm: engine.stats!.wpm,
            accuracy: engine.stats!.accuracy,
            streak: 0,
            isNewBest: false,
          });
        });
    }
  }, [engine.status, engine.stats, submitted]);

  const handleRestart = useCallback(() => {
    setSubmitted(false);
    setResult(null);
    engine.restart();
    setTimeout(() => containerRef.current?.focus(), 0);
  }, [engine]);

  if (engine.status === "finished" && engine.stats) {
    return (
      <div className="space-y-6 animate-fade-in">
        {/* Results header */}
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-3">
            <span className="text-4xl font-black text-accent tabular-nums text-glow-accent">
              {engine.stats.wpm.toFixed(2)}
            </span>
            <span className="text-sm text-muted uppercase tracking-wider">wpm</span>
          </div>
          {result?.isNewBest && (
            <span className="text-xs font-bold text-correct uppercase tracking-wider animate-fade-in">
              New best!
            </span>
          )}
        </div>

        {/* Stat pills */}
        <div className="flex gap-3">
          <div className="rounded-lg bg-surface/40 ring-1 ring-white/[0.04] px-4 py-2.5 text-center flex-1">
            <div className="text-lg font-bold text-text tabular-nums">
              {engine.stats.rawWpm.toFixed(2)}
            </div>
            <div className="text-xs text-muted/60 mt-0.5">raw wpm</div>
          </div>
          <div className="rounded-lg bg-surface/40 ring-1 ring-white/[0.04] px-4 py-2.5 text-center flex-1">
            <div className="text-lg font-bold text-text tabular-nums">
              {engine.stats.accuracy}%
            </div>
            <div className="text-xs text-muted/60 mt-0.5">accuracy</div>
          </div>
          <div className="rounded-lg bg-surface/40 ring-1 ring-white/[0.04] px-4 py-2.5 text-center flex-1">
            <div className="text-lg font-bold text-text tabular-nums">
              {engine.stats.time}s
            </div>
            <div className="text-xs text-muted/60 mt-0.5">time</div>
          </div>
          {result && result.streak > 0 && (
            <div className="rounded-lg bg-surface/40 ring-1 ring-white/[0.04] px-4 py-2.5 text-center flex-1">
              <div className="text-lg font-bold text-accent tabular-nums">
                {result.streak}
              </div>
              <div className="text-xs text-muted/60 mt-0.5">streak</div>
            </div>
          )}
        </div>

        {/* WPM chart */}
        {engine.stats.wpmHistory.length >= 2 && (
          <WpmChart samples={engine.stats.wpmHistory} />
        )}

        {/* Best score */}
        {bestWpm != null && (
          <p className="text-sm text-muted text-center tabular-nums">
            Your best: {bestWpm.toFixed(2)} WPM
          </p>
        )}

        {/* Restart */}
        <div className="text-center">
          <button
            onClick={handleRestart}
            className="text-sm text-muted hover:text-text transition-colors"
          >
            Try again
            <span className="ml-2 text-xs text-muted/40">Tab+Enter</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Live WPM + best */}
      <div className="flex items-baseline justify-between">
        <span className="text-sm text-muted tabular-nums">
          {engine.status === "typing" && (
            <>{engine.liveWpm} <span className="text-muted/60">wpm</span></>
          )}
        </span>
        {bestWpm != null && (
          <span className="text-xs text-muted/60 tabular-nums">
            Your best: {bestWpm.toFixed(2)} WPM
          </span>
        )}
      </div>

      {/* Typing area */}
      <div
        ref={containerRef}
        tabIndex={0}
        onKeyDown={engine.handleKeyDown}
        className="outline-none cursor-text rounded-xl bg-surface/30 ring-1 ring-white/[0.04] px-6 py-5 max-h-[12rem] overflow-hidden"
      >
        <WordDisplay
          words={engine.words}
          currentWordIndex={engine.currentWordIndex}
          currentCharIndex={engine.currentCharIndex}
          isTyping={engine.status === "typing"}
        />
      </div>

      {/* Hint */}
      <p className="text-xs text-muted/40 text-center">
        {engine.status === "idle"
          ? "Start typing to begin"
          : "Tab+Enter to restart"}
      </p>
    </div>
  );
}
