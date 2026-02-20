"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useTypingEngine } from "@/hooks/useTypingEngine";
import { WordDisplay } from "@/components/typing/WordDisplay";
import { generateWordsForMode } from "@typeoff/shared";
import type { RaceMode } from "@typeoff/shared";
import { DailyLeaderboard } from "./DailyLeaderboard";

interface DailyChallenge {
  id: string;
  date: string;
  seed: number;
  mode: string;
  wordCount: number;
}

interface DailyEntry {
  userId: string;
  username: string | null;
  wpm: number;
  rawWpm: number;
  accuracy: number;
  attempts: number;
}

interface DailyArenaProps {
  challenge: DailyChallenge;
  leaderboard: DailyEntry[];
  myResult: { wpm: number; rawWpm: number; accuracy: number; attempts: number } | null;
  nextDailyAt: number;
}

function getVisibleLines(): number {
  return 3;
}

export function DailyArena({ challenge, leaderboard: initialLeaderboard, myResult: initialMyResult, nextDailyAt }: DailyArenaProps) {
  const { data: session } = useSession();
  const [leaderboard, setLeaderboard] = useState(initialLeaderboard);
  const [myResult, setMyResult] = useState(initialMyResult);
  const [hasSaved, setHasSaved] = useState(false);
  const [countdown, setCountdown] = useState("");

  // Generate words from the challenge seed/mode
  const externalWords = React.useMemo(
    () => generateWordsForMode(challenge.mode as RaceMode, challenge.seed),
    [challenge.seed, challenge.mode],
  );

  const engine = useTypingEngine({
    externalWords,
    mode: "wordcount",
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const wordsInnerRef = useRef<HTMLDivElement>(null);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [lineHeight, setLineHeight] = useState(40);
  const suppressTransitionRef = useRef(false);

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

  // Clear suppress flag after the instant reset renders
  useEffect(() => {
    if (suppressTransitionRef.current) {
      requestAnimationFrame(() => {
        suppressTransitionRef.current = false;
      });
    }
  }, [scrollOffset]);

  // Auto-focus
  useEffect(() => {
    containerRef.current?.focus();
  }, []);

  // Countdown timer
  useEffect(() => {
    const tick = () => {
      const diff = Math.max(0, nextDailyAt - Date.now());
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setCountdown(`${h}h ${m}m ${s}s`);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [nextDailyAt]);

  // Save result when finished
  useEffect(() => {
    if (!isFinished || !engine.stats || hasSaved) return;
    if (!session?.user?.id) return;

    setHasSaved(true);
    fetch("/api/daily", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        challengeId: challenge.id,
        wpm: engine.stats.wpm,
        rawWpm: engine.stats.rawWpm,
        accuracy: engine.stats.accuracy,
      }),
    })
      .then((r) => r.json())
      .then(() => {
        // Refresh leaderboard
        fetch("/api/daily")
          .then((r) => r.json())
          .then((d) => {
            setLeaderboard(d.leaderboard);
            setMyResult(d.myResult);
          });
      })
      .catch(() => {});
  }, [isFinished, engine.stats, hasSaved, session?.user?.id, challenge.id]);

  // Restart handler
  const handleRestart = useCallback(() => {
    engine.restart();
    setHasSaved(false);
    suppressTransitionRef.current = true;
    setScrollOffset(0);
    requestAnimationFrame(() => {
      suppressTransitionRef.current = false;
      containerRef.current?.focus();
    });
  }, [engine]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-baseline justify-between">
        <div>
          <h1 className="text-lg font-black text-text uppercase tracking-wider">
            Daily Challenge
          </h1>
          <p className="text-xs text-muted/50 mt-0.5">
            {challenge.date} &middot; {challenge.wordCount} words
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-muted/40 uppercase tracking-wider">Next daily in</p>
          <p className="text-sm font-bold text-accent tabular-nums">{countdown}</p>
        </div>
      </div>

      {/* My best result */}
      {myResult && !isFinished && (
        <div className="flex items-center gap-4 rounded-lg bg-surface/40 ring-1 ring-white/[0.04] px-4 py-2.5">
          <span className="text-xs text-muted/50">Your best:</span>
          <span className="text-sm font-bold text-accent tabular-nums">{Math.floor(myResult.wpm)} wpm</span>
          <span className="text-xs text-muted/40 tabular-nums">{Math.floor(myResult.accuracy)}%</span>
          <span className="text-xs text-muted/30 tabular-nums">{myResult.attempts} attempt{myResult.attempts !== 1 ? "s" : ""}</span>
        </div>
      )}

      {/* Typing area */}
      {!isFinished && (
        <div
          ref={containerRef}
          tabIndex={0}
          onKeyDown={engine.handleKeyDown}
          className="w-full outline-none cursor-default select-none overflow-hidden"
          style={{ height: containerHeight }}
          role="textbox"
          aria-label="Daily challenge typing area"
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
        <div className={`flex items-center justify-center tabular-nums transition-opacity duration-200 ${
          isTyping ? "opacity-100" : "opacity-0"
        }`}>
          <span className="text-accent font-black text-4xl">{engine.liveWpm}</span>
          <span className="text-muted/40 text-sm ml-2">wpm</span>
        </div>
      )}

      {/* Results */}
      {isFinished && engine.stats && (
        <div className="animate-fade-in space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg bg-surface/40 ring-1 ring-white/[0.04] px-4 py-3 text-center">
              <div className="text-2xl font-black text-text tabular-nums">{Math.floor(engine.stats.wpm)}</div>
              <div className="text-[10px] text-muted/50 mt-0.5">WPM</div>
            </div>
            <div className="rounded-lg bg-surface/40 ring-1 ring-white/[0.04] px-4 py-3 text-center">
              <div className="text-2xl font-black text-text tabular-nums">{Math.floor(engine.stats.accuracy)}%</div>
              <div className="text-[10px] text-muted/50 mt-0.5">Accuracy</div>
            </div>
            <div className="rounded-lg bg-surface/40 ring-1 ring-white/[0.04] px-4 py-3 text-center">
              <div className="text-2xl font-black text-text tabular-nums">{engine.stats.rawWpm}</div>
              <div className="text-[10px] text-muted/50 mt-0.5">Raw WPM</div>
            </div>
          </div>

          <button
            onClick={handleRestart}
            className="w-full py-2.5 rounded-lg bg-accent/10 text-accent text-sm font-bold hover:bg-accent/20 transition-colors"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Leaderboard */}
      <div>
        <h2 className="text-xs font-bold text-muted/60 uppercase tracking-wider mb-3 flex items-center gap-3">
          Today&apos;s Leaderboard
          <span className="flex-1 h-px bg-white/[0.03]" />
        </h2>
        <DailyLeaderboard entries={leaderboard} myUserId={session?.user?.id} />
      </div>
    </div>
  );
}
