"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { signIn } from "next-auth/react";
import { useTypingEngine } from "@/hooks/useTypingEngine";
import { WordDisplay } from "@/components/typing/WordDisplay";
import { PlacementReveal } from "./PlacementReveal";
import { calibrateElo } from "@typeoff/shared";

type Phase = "landing" | "idle" | "racing" | "reveal";

const GUEST_WORD_COUNT = 35;

/* ── Rank tier ladder data ───────────────────────────── */
const RANK_TIERS = [
  { label: "Bronze",      color: "#d97706" },
  { label: "Silver",      color: "#9ca3af" },
  { label: "Gold",        color: "#eab308" },
  { label: "Platinum",    color: "#67e8f9" },
  { label: "Diamond",     color: "#3b82f6" },
  { label: "Master",      color: "#a855f7" },
  { label: "Grandmaster", color: "#ef4444" },
] as const;

/* ── Landing phase component ─────────────────────────── */
function LandingPhase({ onStart }: { onStart: () => void }) {
  return (
    <div className="flex flex-col items-center w-full max-w-4xl mx-auto px-4">

      {/* Headline */}
      <div
        className="flex flex-col items-center gap-3 mt-2 mb-10 opacity-0 animate-fade-in"
        style={{ animationDelay: "0ms", animationFillMode: "both" }}
      >
        <h1 className="text-4xl sm:text-5xl font-black text-text tracking-tight text-center leading-tight">
          Competitive typing,{" "}
          <span className="text-accent text-glow-accent">ranked.</span>
        </h1>
        <p className="text-muted/60 text-sm sm:text-base text-center max-w-lg leading-relaxed">
          Race real players in ELO-matched battles.
          <br className="hidden sm:block" />{" "}
          Climb from Bronze to Grandmaster.
        </p>
      </div>

      {/* Rank tier ladder */}
      <div
        className="flex items-end justify-center gap-0 mb-10 opacity-0 animate-fade-in"
        style={{ animationDelay: "80ms", animationFillMode: "both" }}
      >
        {RANK_TIERS.map((tier, i) => (
          <div key={tier.label} className="flex flex-col items-center">
            <div
              className="w-8 sm:w-10 rounded-sm mx-px"
              style={{
                height: 12 + i * 7,
                background: tier.color,
                opacity: 0.85,
                boxShadow: `0 0 8px ${tier.color}55`,
              }}
            />
            <span
              className="mt-1.5 text-[9px] sm:text-[10px] font-bold tracking-wide uppercase"
              style={{ color: tier.color }}
            >
              {tier.label === "Grandmaster" ? "GM" : tier.label.slice(0, 2)}
            </span>
          </div>
        ))}
      </div>

      {/* Feature cards */}
      <div
        className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full mb-10 opacity-0 animate-fade-in"
        style={{ animationDelay: "160ms", animationFillMode: "both" }}
      >
        {[
          {
            title: "Real Competition",
            body: "ELO matchmaking places you against players at your exact skill level. Every race counts.",
            icon: (
              <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
                <path d="M8 1L10.5 6H14L11 9.5L12.5 15L8 11.5L3.5 15L5 9.5L2 6H5.5L8 1Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
              </svg>
            ),
          },
          {
            title: "7 Rank Tiers",
            body: "Bronze through Grandmaster. Your ELO rating is recalculated after every race.",
            icon: (
              <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
                <path d="M1 12L4 4L8 9L11 5L15 12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            ),
          },
          {
            title: "Earn Cosmetics",
            body: "Unlock titles, cursor effects, name colors, and profile borders as you climb.",
            icon: (
              <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
                <path d="M8 2V14M4 6L8 2L12 6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            ),
          },
        ].map((card) => (
          <div
            key={card.title}
            className="flex flex-col gap-2 rounded-xl bg-white/[0.03] ring-1 ring-white/[0.07] px-5 py-4"
          >
            <span className="text-accent/70">{card.icon}</span>
            <span className="text-text text-sm font-semibold">{card.title}</span>
            <span className="text-muted/50 text-xs leading-relaxed">{card.body}</span>
          </div>
        ))}
      </div>

      {/* Primary CTA */}
      <div
        className="flex flex-col items-center gap-3 opacity-0 animate-fade-in"
        style={{ animationDelay: "240ms", animationFillMode: "both" }}
      >
        <button
          onClick={onStart}
          className="group flex items-center gap-2 rounded-xl bg-accent px-8 py-3.5 text-base font-bold text-[#0c0c12] transition-all hover:brightness-110 active:scale-[0.98]"
          style={{ boxShadow: "0 0 24px #4d9eff44" }}
        >
          Find Your Rank
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            className="transition-transform duration-150 group-hover:translate-x-0.5"
          >
            <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        <p className="text-muted/40 text-xs">
          Already have an account?{" "}
          <button
            onClick={() => signIn("google")}
            className="text-muted/60 underline underline-offset-2 hover:text-muted/80 transition-colors"
          >
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
}

export function GuestPlacement() {
  const [phase, setPhase] = useState<Phase>("landing");
  const [finishedWpm, setFinishedWpm] = useState(0);
  const [finishedAccuracy, setFinishedAccuracy] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const wordsInnerRef = useRef<HTMLDivElement>(null);
  const tabPressedRef = useRef(false);
  const [cascadeKey, setCascadeKey] = useState(0);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [lineHeight, setLineHeight] = useState(40);
  const suppressTransitionRef = useRef(false);

  const engine = useTypingEngine({
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
    const wordLine = Math.floor(wordTop / lineHeight);
    const scrollLine = Math.round(scrollOffset / lineHeight);
    if (wordLine > scrollLine + 1) {
      setScrollOffset((wordLine - 1) * lineHeight);
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
      setPhase("reveal");
    }
  }, [engine.status, engine.stats, phase]);

  // Focus container when entering idle/racing
  useEffect(() => {
    if (phase === "idle" || phase === "racing") {
      requestAnimationFrame(() => containerRef.current?.focus());
    }
  }, [phase, cascadeKey]);

  // Refocus container when returning to the tab/window
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

  // Restart helper — delegates to engine.restart() so the engine
  // actually resets its status and generates fresh words
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

  // Handle Tab+Enter restart on the typing container
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

  // Window-level Tab+Enter / Escape listener (works in all phases including reveal)
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || tag === "BUTTON" || tag === "A") return;

      // Skip restart shortcuts on landing — user hasn't started yet
      if (phase !== "landing") {
        if (e.key === "Tab") {
          e.preventDefault();
          tabPressedRef.current = true;
          return;
        }
        if (e.key === "Enter" && tabPressedRef.current) {
          e.preventDefault();
          tabPressedRef.current = false;
          restart();
          return;
        }
        if (e.key === "Escape") {
          e.preventDefault();
          restart();
          return;
        }
      }

      // Focus container on Enter during idle (start typing)
      if (phase === "idle" && e.key === "Enter" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        containerRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [phase, restart]);

  const { elo } = calibrateElo(finishedWpm);
  const isTyping = engine.status === "typing";

  /* ── Landing phase ───────────────────────────────────── */
  if (phase === "landing") {
    return <LandingPhase onStart={() => setPhase("idle")} />;
  }

  /* ── Reveal phase (combined stats + rank) ────────────── */
  if (phase === "reveal") {
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

  /* ── Idle / Racing ───────────────────────────────────── */
  return (
    <div
      className={`flex flex-col items-center w-full max-w-4xl mx-auto ${
        isTyping ? "focus-active" : ""
      }`}
      key={cascadeKey}
      onClick={() => containerRef.current?.focus()}
    >
      {/* Hero section — fades out when typing starts, space preserved so text doesn't shift */}
      <div
        className="w-full transition-opacity duration-500 ease-out"
        style={{
          opacity: phase === "idle" ? 1 : 0,
          pointerEvents: phase === "idle" ? undefined : "none",
        }}
      >
        <div className="flex flex-col items-center">
          <div className="flex flex-col items-center w-full mb-8">
            {/* Headline */}
            <div
              className="flex flex-col items-center gap-3 mb-6 opacity-0 animate-fade-in"
              style={{ animationDelay: "0ms", animationFillMode: "both" }}
            >
              <h1 className="text-3xl sm:text-4xl font-black text-text tracking-tight text-center">
                Competitive typing,{" "}
                <span className="text-accent text-glow-accent">ranked.</span>
              </h1>
              <p className="text-muted/70 text-sm text-center max-w-md leading-relaxed">
                Race real players in ELO-matched typing battles.
                <br className="hidden sm:block" />{" "}
                Climb from Bronze to Grandmaster.
              </p>
            </div>

            {/* Feature pills */}
            <div
              className="flex flex-wrap justify-center gap-2 mb-8 opacity-0 animate-fade-in"
              style={{ animationDelay: "80ms", animationFillMode: "both" }}
            >
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.04] ring-1 ring-white/[0.06] text-[11px] text-muted/60">
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" className="text-accent/70">
                  <path d="M8 1L10.5 6H14L11 9.5L12.5 15L8 11.5L3.5 15L5 9.5L2 6H5.5L8 1Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
                </svg>
                ELO Matchmaking
              </span>
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.04] ring-1 ring-white/[0.06] text-[11px] text-muted/60">
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" className="text-accent/70">
                  <path d="M1 12L4 4L8 9L11 5L15 12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Real-time Races
              </span>
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.04] ring-1 ring-white/[0.06] text-[11px] text-muted/60">
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" className="text-accent/70">
                  <path d="M8 2V14M4 6L8 2L12 6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                7 Rank Tiers
              </span>
            </div>

            {/* Placement CTA */}
            <div
              className="flex flex-col items-center gap-1 opacity-0 animate-fade-in"
              style={{ animationDelay: "160ms", animationFillMode: "both" }}
            >
              <span className="text-accent text-xs uppercase tracking-[0.25em] font-bold">
                Placement Test
              </span>
              <p className="text-muted/40 text-xs">
                Start typing to find your rank
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Typing area with scroll clipping */}
      <div
        ref={containerRef}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        className="w-full max-w-2xl mx-auto outline-none cursor-default select-none overflow-hidden opacity-0 animate-fade-in"
        style={{ height: containerHeight, animationDelay: phase === "idle" ? "240ms" : "0ms", animationFillMode: "both" }}
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
      <div className={`flex items-center justify-center gap-6 tabular-nums mt-4 transition-opacity duration-200 ${
        isTyping ? "opacity-100" : "opacity-0"
      }`}>
        <span className="text-muted text-sm inline-flex items-baseline">
          <span className="text-accent font-black text-5xl inline-block w-[3ch] text-right">{engine.liveWpm}</span> wpm
        </span>
      </div>

      {/* Tab+Enter hint (always reserves space to prevent layout shift) */}
      <p
        className={`text-muted/30 text-xs mt-4 ${
          phase === "idle"
            ? "opacity-0 animate-fade-in"
            : "invisible"
        }`}
        style={phase === "idle" ? { animationDelay: "320ms", animationFillMode: "both" } : undefined}
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
