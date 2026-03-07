"use client";

import React, { useRef, useEffect, useCallback, useState } from "react";
import { useSession } from "next-auth/react";
import { getPbKey, getQuoteAuthor, getCodeSnippet } from "@typeoff/shared";
import { useTypingEngine } from "@/hooks/useTypingEngine";
import { useCapsLock } from "@/hooks/useCapsLock";
import { WordDisplay } from "@/components/typing/WordDisplay";
import Link from "next/link";
import { ConfigBar } from "./ConfigBar";
import { PracticeResults } from "./PracticeResults";
import { ZenFreeformArena } from "./ZenFreeformArena";

function getVisibleLines(): number {
  return 3;
}

export function PracticeArena({ initialDrill = false, initialBigrams }: { initialDrill?: boolean; initialBigrams?: string[] }) {
  const { data: session } = useSession();
  const isPro = session?.user?.isPro ?? false;
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
  // Weak keys and accuracy for practice mode (Pro only)
  const [weakKeys, setWeakKeys] = useState<string[]>([]);
  const [weakKeyAccuracy, setWeakKeyAccuracy] = useState<Record<string, number>>({});
  // Weak bigrams and accuracy for practice mode (Pro only)
  const [weakBigrams, setWeakBigrams] = useState<string[]>([]);
  const [weakBigramAccuracy, setWeakBigramAccuracy] = useState<Record<string, number>>({});

  // Fetch PBs on mount (logged-in only)
  useEffect(() => {
    if (!session?.user?.id) return;
    fetch("/api/solo-results")
      .then((res) => res.json())
      .then((data) => { if (data.pbs) setPbs(data.pbs); })
      .catch(() => {});
  }, [session?.user?.id]);

  // Fetch weak keys + weak bigrams for practice mode (Pro only)
  useEffect(() => {
    if (!session?.user?.id || !isPro) return;
    fetch("/api/key-accuracy")
      .then((res) => res.json())
      .then((data: { weakKeys?: string[]; all?: Array<{ key: string; accuracy: number; total: number }> }) => {
        if (data.weakKeys) setWeakKeys(data.weakKeys);
        if (data.all) {
          const acc: Record<string, number> = {};
          for (const k of data.all) acc[k.key] = k.accuracy;
          setWeakKeyAccuracy(acc);
        }
      })
      .catch(() => {});
    fetch("/api/bigram-accuracy")
      .then((res) => res.json())
      .then((data: { bigrams?: Array<{ bigram: string; accuracy: number; total: number }> }) => {
        if (!data.bigrams) return;
        // Keep worst 10 bigrams with enough data (>= 10 total)
        const meaningful = data.bigrams.filter((b) => b.total >= 10);
        meaningful.sort((a, b) => a.accuracy - b.accuracy);
        const worst = meaningful.slice(0, 10);
        setWeakBigrams(worst.map((b) => b.bigram));
        const acc: Record<string, number> = {};
        for (const b of data.bigrams) acc[b.bigram] = b.accuracy;
        setWeakBigramAccuracy(acc);
      })
      .catch(() => {});
  }, [session?.user?.id, isPro]);

  // Load practice config from localStorage on mount
  const configLoadedRef = useRef(false);
  useEffect(() => {
    if (configLoadedRef.current) return;
    configLoadedRef.current = true;
    try {
      const saved = localStorage.getItem("typeoff-practice-config");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === "object") {
          engine.setConfig({ ...engine.config, ...parsed });
        }
      }
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save practice config to localStorage on change (exclude non-persistent fields)
  useEffect(() => {
    if (!configLoadedRef.current) return;
    try {
      const { customText, weakKeys: _wk, weakBigrams: _wb, ...persistable } = engine.config;
      localStorage.setItem("typeoff-practice-config", JSON.stringify(persistable));
    } catch {}
  }, [engine.config]);

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

    const activeSpan = inner.querySelector(`[data-wordindex="${engine.currentWordIndex}"]`) as HTMLElement;
    if (!activeSpan) return;

    const wordTop = activeSpan.offsetTop;
    // Use line-based rounding to avoid sub-pixel shifts from fractional DPR rendering
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

  // Refocus after config change + bump cascade to replay animations
  const handleAfterConfigChange = useCallback(() => {
    setCascadeKey((k) => k + 1);
    requestAnimationFrame(() => containerRef.current?.focus());
  }, []);

  // Auto-start practice mode when ?drill=true or ?bigrams=... is set
  const practiceActivatedRef = useRef(false);
  useEffect(() => {
    if (practiceActivatedRef.current || !isPro) return;
    if (initialDrill && !weakKeys.length) return; // wait for weak keys to load
    if (!initialDrill && !initialBigrams?.length) return; // no practice param set
    practiceActivatedRef.current = true;
    engine.setConfig({
      ...engine.config,
      contentType: "practice",
      weakKeys,
      weakBigrams: initialBigrams?.length ? initialBigrams : weakBigrams,
    });
    handleAfterConfigChange();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialDrill, initialBigrams, isPro, weakKeys, weakBigrams]);

  // Show Pro upsell banner for free users trying practice mode
  const showProUpsell = !isPro && session?.user?.id && (initialDrill || !!initialBigrams?.length);

  // Save results when test finishes (logged-in only)
  useEffect(() => {
    if (engine.status !== "finished" || !engine.stats) return;
    if (hasSavedRef.current) return;
    if (!session?.user?.id) return;

    hasSavedRef.current = true;
    const stats = engine.stats;
    const config = engine.config;
    const currentSeed = engine.lastSeed;

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
        bigramStats: stats.bigramStats,
        seed: currentSeed,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.isPb) {
          setIsPb(true);
          // Update local PB cache (per-text for quotes/code)
          const key = getPbKey(config, currentSeed);
          setPbs((prev) => ({ ...prev, [key]: stats.wpm }));
        }
      })
      .catch(() => {});
  }, [engine.status, engine.stats, engine.config, engine.lastSeed, session?.user?.id]);

  // Reset save guard on restart + bump cascade key
  const prevStatusRef = useRef(engine.status);
  useEffect(() => {
    const prev = prevStatusRef.current;
    prevStatusRef.current = engine.status;
    if (engine.status === "idle") {
      hasSavedRef.current = false;
      setIsPb(null);
      // Only bump cascade key on config-driven restarts (idle → idle handled
      // by setConfig). Tab+Enter (typing → idle) and results restart
      // (finished → idle) skip the bump to prevent a double-mount flash.
    }
  }, [engine.status]);

  const handleRestart = useCallback(() => {
    engine.restart();
  }, [engine.restart]);

  const isTyping = engine.status === "typing";
  const isFinished = engine.status === "finished";
  const capsLock = useCapsLock();

  // Current PB for the active config combo (per-text for quotes/code)
  const pbKey = getPbKey(engine.config, engine.lastSeed);
  const currentPb = pbs[pbKey] ?? null;

  const containerHeight = lineHeight * visibleLines;

  // Whether to show a stopwatch (elapsed time) instead of countdown
  const ct = engine.config.contentType ?? "words";
  const showStopwatch = ct === "quotes" || ct === "custom" || ct === "practice" || ct === "code" || ct === "zen" ||
    (ct === "words" && engine.config.mode === "wordcount");

  // Route zen mode to freeform arena (no predefined words)
  if (ct === "zen") {
    return (
      <div className="flex flex-col items-center gap-6 w-full max-w-5xl mx-auto">
        {/* Config bar — always accessible for mode switching */}
        <div className="focus-fade flex flex-col items-center gap-2">
          <ConfigBar
            config={engine.config}
            status={engine.status}
            onConfigChange={(c) => {
              if (c.contentType === "practice") {
                engine.setConfig({ ...c, weakKeys, weakBigrams });
              } else {
                engine.setConfig(c);
              }
            }}
            onAfterChange={handleAfterConfigChange}
            onCustomTextChange={(words) => {
              setCustomWords(words);
              engine.setConfig({ ...engine.config, contentType: "custom", customText: words.join(" "), mode: "wordcount", duration: 0 });
              handleAfterConfigChange();
            }}
            practiceWeakKeys={weakKeys}
            weakKeyAccuracy={weakKeyAccuracy}
            practiceWeakBigrams={weakBigrams}
            weakBigramAccuracy={weakBigramAccuracy}
            isPro={isPro}
          />
        </div>
        <ZenFreeformArena />
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col items-center gap-6 w-full max-w-5xl mx-auto ${
        isTyping ? "focus-active" : ""
      }`}
      onClick={(e) => {
        const tag = (e.target as HTMLElement).tagName;
        if (tag === "TEXTAREA" || tag === "INPUT") return;
        containerRef.current?.focus();
      }}
    >
      {/* PB + Config bar */}
      {!isFinished && (
        <div
          className="flex flex-col items-center gap-2 opacity-0 animate-fade-in"
          style={{ animationDelay: "0ms", animationFillMode: "both" }}
        >
          {session?.user?.id && (
            <div className="focus-fade text-sm text-muted/65 tabular-nums">
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
                <span className="text-muted/60 font-medium">n/a</span>
              )}
            </div>
          )}
          <ConfigBar
            config={engine.config}
            status={engine.status}
            onConfigChange={(c) => {
              // Inject weakKeys into config for practice mode
              if (c.contentType === "practice") {
                engine.setConfig({ ...c, weakKeys, weakBigrams });
              } else {
                engine.setConfig(c);
              }
            }}
            onAfterChange={handleAfterConfigChange}
            onCustomTextChange={(words) => {
              setCustomWords(words);
              engine.setConfig({ ...engine.config, contentType: "custom", customText: words.join(" "), mode: "wordcount", duration: 0 });
              handleAfterConfigChange();
            }}
            practiceWeakKeys={weakKeys}
            weakKeyAccuracy={weakKeyAccuracy}
            practiceWeakBigrams={weakBigrams}
            weakBigramAccuracy={weakBigramAccuracy}
            isPro={isPro}
          />
        </div>
      )}

      {/* Pro upsell for free users with practice params */}
      {showProUpsell && !isFinished && (
        <div className="rounded-lg ring-1 ring-accent/15 bg-accent/[0.03] px-4 py-3 flex items-center gap-3 animate-fade-in max-w-lg">
          <div className="flex-1">
            <p className="text-xs font-bold text-accent/70">Pro Feature</p>
            <p className="text-xs text-muted/60 leading-relaxed mt-0.5">
              Practice mode is available with Pro. Upgrade to target your weakest keys and bigrams.
            </p>
          </div>
          <Link
            href="/pro"
            className="shrink-0 text-xs font-bold text-white bg-accent hover:bg-accent/80 px-3 py-1.5 rounded-md transition-colors"
          >
            Upgrade
          </Link>
        </div>
      )}

      {/* Typing area with scroll clipping */}
      {!isFinished && (
        <div
          ref={containerRef}
          tabIndex={0}
          onKeyDown={engine.handleKeyDown}
          className="relative w-full outline-none cursor-default select-none overflow-hidden opacity-0 animate-fade-in"
          style={{ height: containerHeight, animationDelay: "40ms", animationFillMode: "both" }}
          role="textbox"
          aria-label="Solo typing area"
        >
          <div
            ref={wordsInnerRef}
            className={suppressTransitionRef.current ? "" : "transition-transform duration-150 ease-out"}
            style={{ transform: `translateY(-${scrollOffset}px)` }}
          >
            {ct === "custom" && !engine.config.customText ? (
              <div className="text-muted/45 text-xl sm:text-2xl leading-[2rem] sm:leading-[2.5rem]">
                paste or type text above to begin
              </div>
            ) : (
              <WordDisplay
                words={engine.words}
                currentWordIndex={engine.currentWordIndex}
                currentCharIndex={engine.currentCharIndex}
                isTyping={isTyping}
                contentType={engine.config.contentType}
              />
            )}
          </div>
        </div>
      )}

      {/* Quote attribution */}
      {ct === "quotes" && engine.lastSeed != null && (
        <div className="text-center mt-1 -mb-2 text-xs text-muted/50 italic">
          — {getQuoteAuthor(engine.lastSeed)}
        </div>
      )}

      {/* Code snippet info */}
      {ct === "code" && engine.lastSeed != null && (() => {
        const snippet = getCodeSnippet(engine.lastSeed);
        return (
          <div className="text-center mt-1 -mb-2 text-xs text-muted/50">
            {snippet.name} <span className="text-muted/35">·</span> <span className="text-muted/40">{snippet.language}</span>
          </div>
        );
      })()}

      {/* Live WPM+time / Tab+Enter hint — overlaid in shared space */}
      {!isFinished && (
        <div className="relative flex items-center justify-center h-16 -mt-2 tabular-nums w-full">
          {/* Live WPM + time (fades in when typing starts) */}
          <div className={`absolute inset-0 flex items-center justify-center gap-6 transition-opacity duration-300 ${
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


          {/* Tab+Enter hint (fades out when typing starts) */}
          <p
            key={`hint-${cascadeKey}`}
            className={`absolute text-muted/65 text-xs transition-opacity duration-300 ${
              engine.status === "idle" ? "opacity-0 animate-fade-in" : "opacity-0"
            }`}
            style={engine.status === "idle" ? { animationDelay: "100ms", animationFillMode: "both" } : undefined}
          >
            press{" "}
            <kbd className="px-1.5 py-0.5 rounded bg-white/[0.05] text-muted/65 text-xs">Tab</kbd>
            {" "}+{" "}
            <kbd className="px-1.5 py-0.5 rounded bg-white/[0.05] text-muted/65 text-xs">Enter</kbd>
            {" "}to restart
          </p>
        </div>
      )}

      {/* Caps Lock warning — below typing area, never overlapping text */}
      {!isFinished && capsLock && (
        <div className="flex justify-center -mt-2 mb-2">
          <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/20">
            Caps Lock
          </span>
        </div>
      )}

      {/* Results */}
      {isFinished && engine.stats && (
        <PracticeResults
          stats={engine.stats}
          config={engine.config}
          isPb={isPb}
          onRestart={handleRestart}
          seed={engine.lastSeed}
        />
      )}
    </div>
  );
}
