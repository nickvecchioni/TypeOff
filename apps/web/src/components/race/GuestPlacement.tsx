"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { signIn } from "next-auth/react";
import { useTypingEngine } from "@/hooks/useTypingEngine";
import { WordDisplay } from "@/components/typing/WordDisplay";
import { PlacementReveal } from "./PlacementReveal";
import { calibrateElo } from "@typeoff/shared";

type Phase = "idle" | "racing" | "finished" | "reveal";

const GUEST_WORD_COUNT = 35;

export function GuestPlacement() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [finishedWpm, setFinishedWpm] = useState(0);
  const [finishedAccuracy, setFinishedAccuracy] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const wordsInnerRef = useRef<HTMLDivElement>(null);
  const tabPressedRef = useRef(false);
  const [seed, setSeed] = useState(() => Date.now());
  const [scrollOffset, setScrollOffset] = useState(0);
  const [lineHeight, setLineHeight] = useState(40);
  const suppressTransitionRef = useRef(false);

  const engine = useTypingEngine({
    externalSeed: seed,
    externalWordCount: GUEST_WORD_COUNT,
    mode: "wordcount",
  });

  const visibleLines = 3;
  const containerHeight = lineHeight * visibleLines;

  // Measure line height from the words container
  useEffect(() => {
    const el = wordsInnerRef.current?.querySelector(".no-ligatures");
    if (el) {
      const computed = parseFloat(getComputedStyle(el).lineHeight);
      if (computed > 0) setLineHeight(computed);
    }
  }, [engine.words]);

  // Word scrolling: keep active word visible within visible lines window
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

  // Clear suppress flag after the instant reset renders
  useEffect(() => {
    if (suppressTransitionRef.current) {
      requestAnimationFrame(() => {
        suppressTransitionRef.current = false;
      });
    }
  }, [scrollOffset]);

  // Track engine status → update phase
  useEffect(() => {
    if (engine.status === "typing" && phase === "idle") {
      setPhase("racing");
    }
    if (engine.status === "finished" && engine.stats && phase === "racing") {
      setFinishedWpm(engine.stats.wpm);
      setFinishedAccuracy(engine.stats.accuracy);
      try {
        localStorage.setItem(
          "guest-placement",
          JSON.stringify({ wpm: engine.stats.wpm })
        );
      } catch {}
      setPhase("finished");
    }
  }, [engine.status, engine.stats, phase]);

  // Auto-transition from finished stats → reveal after a brief pause
  useEffect(() => {
    if (phase === "finished") {
      const timer = setTimeout(() => setPhase("reveal"), 2000);
      return () => clearTimeout(timer);
    }
  }, [phase]);

  // Focus container when entering idle/racing
  useEffect(() => {
    if (phase === "idle" || phase === "racing") {
      requestAnimationFrame(() => containerRef.current?.focus());
    }
  }, [phase, seed]);

  // Restart helper
  const restart = useCallback(() => {
    setSeed(Date.now());
    setPhase("idle");
    setFinishedWpm(0);
    setFinishedAccuracy(0);
    setScrollOffset(0);
    suppressTransitionRef.current = true;
    tabPressedRef.current = false;
  }, []);

  // Handle Tab+Enter restart (matching Solo behavior)
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Tab") {
        e.preventDefault();
        tabPressedRef.current = true;
        return;
      }
      if (e.key === "Enter" && tabPressedRef.current) {
        e.preventDefault();
        restart();
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        restart();
        return;
      }
      engine.handleKeyDown(e);
    },
    [engine.handleKeyDown, restart]
  );

  // Enter key to start from idle CTA
  useEffect(() => {
    if (phase !== "idle") return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Enter" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || tag === "BUTTON" || tag === "A") return;
        e.preventDefault();
        containerRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [phase]);

  const { elo } = calibrateElo(finishedWpm);
  const isTyping = engine.status === "typing";

  /* ── Reveal phase ────────────────────────────────────── */
  if (phase === "reveal") {
    return (
      <PlacementReveal
        elo={elo}
        onContinue={() => signIn("google", { callbackUrl: "/" })}
        subtitle="Sign in to save your rank"
        ctaContent={
          <button
            onClick={() => signIn("google", { callbackUrl: "/" })}
            className="group flex items-center gap-3 rounded-lg bg-white/[0.05] ring-1 ring-white/[0.08] px-6 py-3.5 text-sm text-text hover:bg-white/[0.09] hover:ring-white/[0.15] transition-all"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            <span className="font-medium">Sign in with Google</span>
          </button>
        }
      />
    );
  }

  /* ── Finished stats (brief display before reveal) ──── */
  if (phase === "finished") {
    return (
      <div className="flex flex-col items-center gap-6 animate-fade-in">
        <div className="flex gap-8">
          <div className="text-center">
            <div className="text-3xl font-black text-accent tabular-nums text-glow-accent">
              {Math.round(finishedWpm)}
            </div>
            <div className="text-xs text-muted mt-1">WPM</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-black text-text tabular-nums">
              {finishedAccuracy.toFixed(1)}%
            </div>
            <div className="text-xs text-muted mt-1">Accuracy</div>
          </div>
        </div>
      </div>
    );
  }

  /* ── Idle / Racing ───────────────────────────────────── */
  return (
    <div
      className={`flex flex-col items-center gap-6 w-full max-w-4xl mx-auto ${
        isTyping ? "focus-active" : ""
      }`}
      key={seed}
    >
      {/* Header */}
      {phase === "idle" && (
        <div
          className="flex flex-col items-center gap-1 mb-2 opacity-0 animate-fade-in"
          style={{ animationDelay: "0ms", animationFillMode: "both" }}
        >
          <span className="text-accent text-xs uppercase tracking-[0.25em] font-bold">
            Placement Test
          </span>
          <p className="text-muted/60 text-xs text-center max-w-sm">
            Just type naturally to set your starting rank. Don&apos;t stress
            it&mdash;your first few races carry extra weight, so your rank
            adjusts quickly.
          </p>
        </div>
      )}

      {/* Typing area with scroll clipping */}
      <div
        ref={containerRef}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        className="w-full outline-none cursor-default select-none overflow-hidden opacity-0 animate-fade-in"
        style={{ height: containerHeight, animationDelay: "80ms", animationFillMode: "both" }}
        role="textbox"
        aria-label="Placement typing area"
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

      {/* Live WPM (always reserves space to prevent layout shift) */}
      <div className={`flex items-center justify-center gap-6 tabular-nums -mt-2 transition-opacity duration-200 ${
        isTyping ? "opacity-100" : "opacity-0"
      }`}>
        <span className="text-muted text-sm inline-flex items-baseline">
          <span className="text-accent font-black text-5xl inline-block w-[3ch] text-right">{engine.liveWpm}</span> wpm
        </span>
      </div>

      {/* Tab+Enter hint (always reserves space to prevent layout shift) */}
      <p
        className={`text-muted/30 text-xs ${
          phase === "idle"
            ? "opacity-0 animate-fade-in"
            : "invisible"
        }`}
        style={phase === "idle" ? { animationDelay: "160ms", animationFillMode: "both" } : undefined}
      >
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
    </div>
  );
}
