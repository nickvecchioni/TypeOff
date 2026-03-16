"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useTypingEngine } from "@/hooks/useTypingEngine";
import { WordDisplay } from "@/components/typing/WordDisplay";
import { PlacementReveal } from "./PlacementReveal";
import { calibrateElo } from "@typeoff/shared";
import { useSettings, useFocusActive } from "@/contexts/SettingsContext";

type Phase = "idle" | "racing" | "reveal";

const GUEST_WORD_COUNT = 50;

const FEATURES = [
  {
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
      </svg>
    ),
    text: "ELO matchmaking. Every race is a fair fight",
  },
  {
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 9H3.5a2.5 2.5 0 010-5H6" />
        <path d="M18 9h2.5a2.5 2.5 0 000-5H18" />
        <path d="M6 4h12v6a6 6 0 01-12 0V4z" />
        <line x1="12" y1="16" x2="12" y2="20" />
        <line x1="8" y1="20" x2="16" y2="20" />
      </svg>
    ),
    text: "Climb 7 ranks from Bronze to Grandmaster",
  },
  {
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3l1.5 4 4 1.5-4 1.5L12 14l-1.5-4-4-1.5 4-1.5L12 3z" />
        <path d="M5 3v4M3 5h4" />
        <path d="M19 17v4M17 19h4" />
      </svg>
    ),
    text: "Unlock cosmetics: titles, cursors, effects",
  },
] as const;

/* ─────────────────────────────────────────────────────────────────────────── */

export function GuestPlacement({
  startFromIdle,
  onPlacementComplete,
}: {
  startFromIdle?: boolean;
  onPlacementComplete?: (wpm: number) => void;
} = {}) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [finishedWpm, setFinishedWpm] = useState(0);
  const [finishedAccuracy, setFinishedAccuracy] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const wordsInnerRef = useRef<HTMLDivElement>(null);
  const tabPressedRef = useRef(false);
  const [cascadeKey, setCascadeKey] = useState(0);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [lineHeight, setLineHeight] = useState(40);
  const suppressTransitionRef = useRef(false);
  const [racesThisWeek, setRacesThisWeek] = useState<number | null>(null);

  const engine = useTypingEngine({
    externalWordCount: GUEST_WORD_COUNT,
    mode: "wordcount",
  });

  const visibleLines = 5;
  const containerHeight = lineHeight * visibleLines;

  /* ── Social proof fetch ──────────────────────────────────────────────────── */
  useEffect(() => {
    if (startFromIdle) return;
    fetch("/api/stats/live")
      .then((r) => r.json())
      .then((d) => {
        if (d.racesThisWeek > 0) setRacesThisWeek(d.racesThisWeek);
      })
      .catch(() => {});
  }, [startFromIdle]);

  /* ── Line height measurement ─────────────────────────────────────────────── */
  useEffect(() => {
    const el = wordsInnerRef.current?.querySelector(".no-ligatures");
    if (el) {
      const computed = parseFloat(getComputedStyle(el).lineHeight);
      if (computed > 0) setLineHeight(computed);
    }
  }, [engine.words]);

  /* ── Word scrolling ──────────────────────────────────────────────────────── */
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
    const wordLine = Math.floor(wordTop / lineHeight);
    const scrollLine = Math.round(scrollOffset / lineHeight);
    if (wordLine > scrollLine + 1) {
      setScrollOffset((wordLine - 1) * lineHeight);
    }
  }, [engine.currentWordIndex, engine.status, lineHeight, scrollOffset]);

  useEffect(() => {
    if (suppressTransitionRef.current) {
      requestAnimationFrame(() => {
        suppressTransitionRef.current = false;
      });
    }
  }, [scrollOffset]);

  /* ── Phase tracking ──────────────────────────────────────────────────────── */
  useEffect(() => {
    if (engine.status === "typing" && phase === "idle") setPhase("racing");
    if (engine.status === "finished" && engine.stats && phase === "racing") {
      setFinishedWpm(engine.stats.wpm);
      setFinishedAccuracy(engine.stats.accuracy);
      try {
        localStorage.setItem(
          "guest-placement",
          JSON.stringify({ wpm: engine.stats.wpm })
        );
      } catch {}
      setPhase("reveal");
    }
  }, [engine.status, engine.stats, phase]);

  /* ── Focus management ────────────────────────────────────────────────────── */
  useEffect(() => {
    if (phase === "idle" || phase === "racing") {
      requestAnimationFrame(() => containerRef.current?.focus());
    }
  }, [phase, cascadeKey]);

  useEffect(() => {
    if (phase !== "idle" && phase !== "racing") return;
    function handleVisibility() {
      if (document.visibilityState === "visible") {
        requestAnimationFrame(() => containerRef.current?.focus());
      }
    }
    function handleWindowFocus() {
      requestAnimationFrame(() => containerRef.current?.focus());
    }
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("focus", handleWindowFocus);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("focus", handleWindowFocus);
    };
  }, [phase]);

  /* ── Restart ─────────────────────────────────────────────────────────────── */
  const restart = useCallback(() => {
    engine.restart();
    setPhase("idle");
    setFinishedWpm(0);
    setFinishedAccuracy(0);
    setScrollOffset(0);
    suppressTransitionRef.current = true;
    tabPressedRef.current = false;
    setCascadeKey((k) => k + 1);
  }, [engine.restart]);

  /* ── Keyboard handling ───────────────────────────────────────────────────── */
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

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      if (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        tag === "BUTTON" ||
        tag === "A"
      )
        return;
      if (e.key === "Tab") {
        e.preventDefault();
        tabPressedRef.current = true;
        return;
      }
      if (e.key === "Enter" && tabPressedRef.current) {
        e.preventDefault();
        tabPressedRef.current = false;
        if (phase === "idle") containerRef.current?.focus();
        else restart();
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        restart();
        return;
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [phase, restart]);

  /* ── Focus mode ──────────────────────────────────────────────────────────── */
  const { focusMode } = useSettings();
  const [, setFocusActive] = useFocusActive();
  const { elo } = calibrateElo(finishedWpm);
  const isTyping = engine.status === "typing";

  useEffect(() => {
    setFocusActive(isTyping && focusMode);
    return () => setFocusActive(false);
  }, [isTyping, focusMode, setFocusActive]);

  /* ═══════════════════════════════════════════════════════════════════════════
   * Reveal phase
   * ═════════════════════════════════════════════════════════════════════════ */
  if (phase === "reveal") {
    if (onPlacementComplete) {
      return (
        <PlacementReveal
          elo={elo}
          wpm={finishedWpm}
          accuracy={finishedAccuracy}
          onContinue={() => onPlacementComplete(finishedWpm)}
          ctaContent={
            <button
              onClick={() => onPlacementComplete(finishedWpm)}
              className="group flex items-center gap-3 rounded-lg bg-accent/[0.08] ring-1 ring-accent/25 px-6 py-3.5 text-sm font-medium text-accent hover:bg-accent hover:text-bg hover:ring-accent transition-all"
            >
              Activate Rank
            </button>
          }
        />
      );
    }
    return (
      <PlacementReveal
        elo={elo}
        wpm={finishedWpm}
        accuracy={finishedAccuracy}
        onContinue={() => signIn("google", { callbackUrl: "/" })}
        ctaContent={
          <button
            onClick={() => signIn("google", { callbackUrl: "/" })}
            className="group flex items-center gap-3 rounded-lg bg-white/[0.05] ring-1 ring-white/[0.08] px-6 py-3.5 text-sm text-text hover:bg-white/[0.09] hover:ring-white/[0.15] transition-all"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              className="shrink-0"
            >
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            <span className="font-medium">Sign in with Google</span>
          </button>
        }
      />
    );
  }

  /* ═══════════════════════════════════════════════════════════════════════════
   * Signed-in placement (no marketing chrome)
   * ═════════════════════════════════════════════════════════════════════════ */
  if (startFromIdle) {
    return (
      <div
        className={`flex flex-col items-center gap-5 w-full max-w-5xl mx-auto pb-20 ${
          isTyping && focusMode ? "focus-active" : ""
        }`}
        key={cascadeKey}
        onClick={() => containerRef.current?.focus()}
      >
        {/* Placement info */}
        <div
          className="flex flex-col items-center gap-1.5 w-full transition-opacity duration-500 ease-out"
          style={{
            opacity: isTyping ? 0 : 1,
            pointerEvents: isTyping ? "none" : undefined,
          }}
        >
          <div
            className="flex items-center gap-2 opacity-0 animate-fade-in"
            style={{ animationDelay: "0ms", animationFillMode: "both" }}
          >
            <span className="text-accent text-xs font-bold uppercase tracking-[0.2em]">
              Speed Test
            </span>
            <span className="text-muted/60">·</span>
            <span className="text-muted/70 text-xs">
              {GUEST_WORD_COUNT} words
            </span>
          </div>
          <p
            className="text-muted/80 text-sm text-center leading-relaxed opacity-0 animate-fade-in"
            style={{ animationDelay: "40ms", animationFillMode: "both" }}
          >
            See how fast you type. Your rank adjusts naturally from your first race.
          </p>
          <p
            className="text-muted/70 text-xs text-center leading-relaxed opacity-0 animate-fade-in"
            style={{ animationDelay: "70ms", animationFillMode: "both" }}
          >
            No pressure. Your first races use boosted ELO adjustments to get
            you to your true rank fast.
          </p>
          <p
            className="text-muted/60 text-xs text-center leading-relaxed opacity-0 animate-fade-in"
            style={{ animationDelay: "100ms", animationFillMode: "both" }}
          >
            Note: each word must be typed correctly before you can advance.
          </p>
        </div>

        {/* Typing area */}
        <div
          ref={containerRef}
          tabIndex={0}
          onKeyDown={handleKeyDown}
          className="w-full outline-none cursor-default select-none overflow-hidden opacity-0 animate-fade-in"
          style={{
            height: containerHeight,
            animationDelay: "200ms",
            animationFillMode: "both",
          }}
          role="textbox"
          aria-label="Typing speed test"
        >
          <div
            ref={wordsInnerRef}
            className={
              suppressTransitionRef.current
                ? ""
                : "transition-transform duration-150 ease-out"
            }
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

        {/* WPM / hint */}
        <div className="relative flex items-center justify-center h-16 -mt-2 tabular-nums w-full">
          <div
            className={`absolute inset-0 flex items-center justify-center gap-6 transition-opacity duration-300 ${
              isTyping ? "opacity-100" : "opacity-0"
            }`}
          >
            <span className="text-muted text-sm inline-flex items-baseline">
              <span className="text-accent font-black text-5xl inline-block w-[3ch] text-right">
                {engine.liveWpm}
              </span>{" "}
              wpm
            </span>
          </div>
          <p
            className={`absolute text-muted/80 text-xs transition-opacity duration-300 ${
              phase === "idle" ? "opacity-0 animate-fade-in" : "opacity-0"
            }`}
            style={
              phase === "idle"
                ? { animationDelay: "320ms", animationFillMode: "both" }
                : undefined
            }
          >
            press{" "}
            <kbd className="px-1.5 py-0.5 rounded bg-white/[0.05] text-muted/80 text-xs">
              Tab
            </kbd>{" "}
            +{" "}
            <kbd className="px-1.5 py-0.5 rounded bg-white/[0.05] text-muted/80 text-xs">
              Enter
            </kbd>{" "}
            to restart
          </p>
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════════════════════════
   * Guest landing — typing test embedded directly on the homepage
   * ═════════════════════════════════════════════════════════════════════════ */
  return (
    <div
      className={`flex flex-col items-center w-full max-w-5xl mx-auto ${
        isTyping && focusMode ? "focus-active" : ""
      }`}
      key={cascadeKey}
      onClick={() => containerRef.current?.focus()}
    >
      {/* ── Hero headline (fades when typing) ──────────────────────────────── */}
      <div
        className={`transition-opacity duration-500 ease-out ${
          isTyping ? "opacity-0 pointer-events-none" : "opacity-100"
        }`}
      >
        <div
          className="relative flex flex-col items-center gap-2 mb-5 opacity-0 animate-fade-in"
          style={{ animationDelay: "0ms", animationFillMode: "both" }}
        >
          {/* Ambient glow */}
          <div
            className="absolute -inset-16 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse 70% 50% at 50% 40%, rgba(77,158,255,0.07) 0%, transparent 70%)",
            }}
          />
          <h1 className="relative text-3xl sm:text-4xl font-black text-text tracking-tight text-center leading-tight">
            Competitive typing,{" "}
            <span className="text-accent">ranked.</span>
          </h1>
          <p className="relative text-muted/70 text-sm text-center whitespace-nowrap">
            Race real players at your exact skill level. Start typing to try it out.
          </p>
        </div>
      </div>

      {/* ── Speed test label (fades when typing) ─────────────────────────── */}
      <div
        className={`transition-opacity duration-500 ease-out ${
          isTyping ? "opacity-0 pointer-events-none" : "opacity-100"
        }`}
      >
        <div
          className="flex items-center gap-2 mb-3 opacity-0 animate-fade-in"
          style={{ animationDelay: "60ms", animationFillMode: "both" }}
        >
          <span className="text-accent text-xs font-bold uppercase tracking-[0.2em]">
            Speed Test
          </span>
          <span className="text-muted/60">·</span>
          <span className="text-muted/70 text-xs">
            {GUEST_WORD_COUNT} words
          </span>
        </div>
      </div>

      {/* ── Typing area (always visible) ───────────────────────────────────── */}
      <div
        ref={containerRef}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        className="w-full outline-none cursor-default select-none overflow-hidden opacity-0 animate-fade-in"
        style={{
          height: containerHeight,
          animationDelay: "120ms",
          animationFillMode: "both",
        }}
        role="textbox"
        aria-label="Typing speed test"
      >
        <div
          ref={wordsInnerRef}
          className={
            suppressTransitionRef.current
              ? ""
              : "transition-transform duration-150 ease-out"
          }
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

      {/* ── Live WPM / hint ────────────────────────────────────────────────── */}
      <div className="relative flex items-center justify-center h-12 tabular-nums w-full mt-1">
        {/* Live WPM (visible when typing) */}
        <div
          className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${
            isTyping ? "opacity-100" : "opacity-0"
          }`}
        >
          <span className="text-muted text-sm inline-flex items-baseline">
            <span className="text-accent font-black text-4xl inline-block w-[3ch] text-right tabular-nums">
              {engine.liveWpm}
            </span>
            <span className="ml-1">wpm</span>
          </span>
        </div>

        {/* Hint (visible when idle) */}
        <p
          className={`absolute text-muted/55 text-xs transition-opacity duration-300 ${
            !isTyping ? "opacity-0 animate-fade-in" : "opacity-0"
          }`}
          style={
            !isTyping
              ? { animationDelay: "220ms", animationFillMode: "both" }
              : undefined
          }
        >
          just start typing. each word must be correct before you advance
        </p>
      </div>

      {/* ── Bottom section (fades when typing) ─────────────────────────────── */}
      <div
        className={`flex flex-col items-center w-full gap-4 mt-3 transition-opacity duration-500 ease-out ${
          isTyping ? "opacity-0 pointer-events-none" : "opacity-100"
        }`}
      >
        {/* Rank progression + social proof */}
        {/* Social proof */}
        {racesThisWeek != null && racesThisWeek > 0 && (
          <span
            className="text-muted/45 text-xs tabular-nums opacity-0 animate-fade-in"
            style={{ animationDelay: "180ms", animationFillMode: "both" }}
          >
            {racesThisWeek.toLocaleString()} races this week
          </span>
        )}

        {/* Feature highlights */}
        <div
          className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 w-full max-w-2xl opacity-0 animate-fade-in"
          style={{ animationDelay: "240ms", animationFillMode: "both" }}
        >
          {FEATURES.map((item, i) => (
            <div
              key={item.text}
              className="group/feat flex items-center gap-2.5 rounded-lg bg-white/[0.025] ring-1 ring-white/[0.06] px-3 py-2 transition-all duration-300 hover:bg-white/[0.05] hover:ring-white/[0.12] hover:scale-[1.02] hover:-translate-y-0.5 cursor-default"
              style={{
                animation: `feat-slide-up 0.4s ease-out ${280 + i * 70}ms both`,
              }}
            >
              <span className="text-accent/50 shrink-0 transition-all duration-300 group-hover/feat:text-accent/80 group-hover/feat:scale-110">
                {item.icon}
              </span>
              <span className="text-muted/65 text-xs leading-snug transition-colors duration-300 group-hover/feat:text-muted/85">
                {item.text}
              </span>
            </div>
          ))}
        </div>

        {/* CTAs */}
        <div
          className="flex flex-col items-center gap-2 opacity-0 animate-fade-in"
          style={{ animationDelay: "300ms", animationFillMode: "both" }}
        >
          <p className="text-muted/55 text-xs">
            Already have an account?{" "}
            <button
              onClick={() => signIn("google")}
              className="text-muted/55 underline underline-offset-2 hover:text-muted transition-colors"
            >
              Sign in
            </button>
          </p>
          <Link
            href="/solo"
            className="text-muted/45 text-xs hover:text-accent/70 transition-colors"
          >
            or try Solo Practice →
          </Link>
        </div>
      </div>
    </div>
  );
}
