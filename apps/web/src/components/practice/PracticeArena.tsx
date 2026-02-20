"use client";

import React, { useRef, useEffect, useCallback, useState } from "react";
import { useSession } from "next-auth/react";
import { getPbKey } from "@typeoff/shared";
import { useTypingEngine } from "@/hooks/useTypingEngine";
import { WordDisplay } from "@/components/typing/WordDisplay";
import { ConfigBar } from "./ConfigBar";
import { PracticeResults } from "./PracticeResults";

function getVisibleLines(): number {
  return 3;
}

export function PracticeArena() {
  const { data: session } = useSession();
  const engine = useTypingEngine();
  const visibleLines = getVisibleLines();
  const containerRef = useRef<HTMLDivElement>(null);
  const wordsInnerRef = useRef<HTMLDivElement>(null);
  const hasSavedRef = useRef(false);
  const [isPb, setIsPb] = useState<boolean | null>(null);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [lineHeight, setLineHeight] = useState(40);
  const [pbs, setPbs] = useState<Record<string, number>>({});
  // Suppress scroll transition when resetting to idle (restart)
  const suppressTransitionRef = useRef(false);
  // Cascade key: changes on each restart to re-trigger animations
  const [cascadeKey, setCascadeKey] = useState(0);
  // Custom text words (for "custom" content type)
  const [customWords, setCustomWords] = useState<string[] | null>(null);
  // Weak keys for practice mode
  const [weakKeys, setWeakKeys] = useState<string[]>([]);

  // Fetch PBs on mount (logged-in only)
  useEffect(() => {
    if (!session?.user?.id) return;
    fetch("/api/solo-results")
      .then((res) => res.json())
      .then((data) => { if (data.pbs) setPbs(data.pbs); })
      .catch(() => {});
  }, [session?.user?.id]);

  // Fetch weak keys for practice mode (logged-in only)
  useEffect(() => {
    if (!session?.user?.id) return;
    fetch("/api/key-accuracy")
      .then((res) => res.json())
      .then((data) => { if (data.weakKeys) setWeakKeys(data.weakKeys); })
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

  // Focus container on mount, when returning to idle, and after cascade remount
  useEffect(() => {
    if (engine.status === "idle" || engine.status === "typing") {
      requestAnimationFrame(() => containerRef.current?.focus());
    }
  }, [engine.status, cascadeKey]);

  // Refocus container when returning to the tab/window
  useEffect(() => {
    if (engine.status !== "idle" && engine.status !== "typing") return;
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
        contentType: config.contentType ?? "words",
        difficulty: config.difficulty ?? "easy",
        punctuation: config.punctuation ?? false,
        wpm: stats.wpm,
        rawWpm: stats.rawWpm,
        accuracy: stats.accuracy,
        correctChars: stats.correctChars,
        incorrectChars: stats.incorrectChars,
        extraChars: stats.extraChars,
        totalChars: stats.totalChars,
        time: stats.time,
        consistency: stats.consistency,
        keyStats: stats.keyStats,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.isPb) {
          setIsPb(true);
          // Update local PB cache
          const key = getPbKey(config);
          setPbs((prev) => ({ ...prev, [key]: stats.wpm }));
        }
      })
      .catch(() => {});
  }, [engine.status, engine.stats, engine.config, session?.user?.id]);

  // Reset save guard on restart + bump cascade key
  const prevStatusRef = useRef(engine.status);
  useEffect(() => {
    const prev = prevStatusRef.current;
    prevStatusRef.current = engine.status;
    if (engine.status === "idle") {
      hasSavedRef.current = false;
      setIsPb(null);
      // Skip cascade bump when coming from results — the typing area is
      // already freshly mounting; a key change would double-mount it (flash).
      if (prev !== "finished") {
        setCascadeKey((k) => k + 1);
      }
    }
  }, [engine.status]);

  const handleRestart = useCallback(() => {
    engine.restart();
  }, [engine.restart]);

  const isTyping = engine.status === "typing";
  const isFinished = engine.status === "finished";

  // Current PB for the active config combo
  const pbKey = getPbKey(engine.config);
  const currentPb = pbs[pbKey] ?? null;

  const containerHeight = lineHeight * visibleLines;

  // Whether to show a stopwatch (elapsed time) instead of countdown
  const ct = engine.config.contentType ?? "words";
  const showStopwatch = ct === "quotes" || ct === "custom" || ct === "practice" ||
    (ct === "words" && engine.config.mode === "wordcount");

  return (
    <div
      className={`flex flex-col items-center gap-6 w-full max-w-4xl mx-auto ${
        isTyping ? "focus-active" : ""
      }`}
      onClick={() => containerRef.current?.focus()}
    >
      {/* PB + Config bar */}
      {!isFinished && (
        <div
          key={`config-${cascadeKey}`}
          className="flex flex-col items-center gap-2 opacity-0 animate-fade-in"
          style={{ animationDelay: "0ms", animationFillMode: "both" }}
        >
          {session?.user?.id && (
            <div className="focus-fade text-sm text-muted/50 tabular-nums">
              pb{" "}
              {currentPb !== null ? (
                <span className="text-muted font-medium">
                  {Math.floor(currentPb)}
                  <span className="opacity-50">
                    .{(currentPb % 1).toFixed(2).slice(2)}
                  </span>{" "}
                  wpm
                </span>
              ) : (
                <span className="text-muted/40 font-medium">n/a</span>
              )}
            </div>
          )}
          <ConfigBar
            config={engine.config}
            status={engine.status}
            onConfigChange={(c) => {
              // Inject weakKeys into config for practice mode
              if (c.contentType === "practice") {
                engine.setConfig({ ...c, weakKeys });
              } else {
                engine.setConfig(c);
              }
            }}
            onAfterChange={handleAfterConfigChange}
            onCustomTextChange={(words) => {
              setCustomWords(words);
              engine.setConfig({ ...engine.config, contentType: "custom", customText: words.join(" "), mode: "wordcount", duration: 0 });
            }}
            practiceWeakKeys={weakKeys}
          />
        </div>
      )}

      {/* Typing area with scroll clipping */}
      {!isFinished && (
        <div
          key={`words-${cascadeKey}`}
          ref={containerRef}
          tabIndex={0}
          onKeyDown={engine.handleKeyDown}
          className="w-full outline-none cursor-default select-none overflow-hidden opacity-0 animate-fade-in"
          style={{ height: containerHeight, animationDelay: "80ms", animationFillMode: "both" }}
          role="textbox"
          aria-label="Solo typing area"
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

      {/* Live WPM + time (fades in when typing starts, always reserves space) */}
      {!isFinished && (
        <div className={`flex items-center justify-center gap-6 tabular-nums -mt-2 transition-opacity duration-200 ${
          isTyping ? "opacity-100" : "opacity-0"
        }`}>
          <span className="text-muted text-sm inline-flex items-baseline">
            <span className="text-accent font-black text-5xl inline-block w-[3ch] text-right">{engine.liveWpm}</span> wpm
          </span>
          {showStopwatch ? (
            <span className="text-muted text-sm inline-flex items-baseline">
              <span className="text-accent font-black text-5xl inline-block w-[3ch] text-right">{engine.timeElapsed}</span>s
            </span>
          ) : engine.config.mode === "timed" ? (
            <span className="text-muted text-sm inline-flex items-baseline">
              <span className="text-accent font-black text-5xl inline-block w-[3ch] text-right">{engine.timeLeft}</span>s
            </span>
          ) : null}
        </div>
      )}

      {/* Hints (always reserves space to prevent layout shift) */}
      {!isFinished && (
        <p
          key={`hint-${cascadeKey}`}
          className={`text-muted/30 text-xs ${
            engine.status === "idle"
              ? "opacity-0 animate-fade-in"
              : "invisible"
          }`}
          style={engine.status === "idle" ? { animationDelay: "160ms", animationFillMode: "both" } : undefined}
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
