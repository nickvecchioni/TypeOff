"use client";

import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useSettings, useFocusActive } from "@/contexts/SettingsContext";

export function ZenFreeformArena() {
  const { focusMode } = useSettings();
  const [, setFocusActive] = useFocusActive();
  const [typedText, setTypedText] = useState("");
  const [status, setStatus] = useState<"idle" | "typing" | "finished">("idle");
  const [elapsed, setElapsed] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const startTimeRef = useRef(0);
  const tabPressedRef = useRef(false);

  // Focus on mount
  useEffect(() => {
    requestAnimationFrame(() => containerRef.current?.focus());
  }, []);

  // Timer
  useEffect(() => {
    if (status !== "typing") return;
    const interval = setInterval(() => {
      setElapsed(Math.floor((performance.now() - startTimeRef.current) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [status]);

  const liveWpm = useMemo(() => {
    if (elapsed === 0) return 0;
    const wordCount = typedText.trim().split(/\s+/).filter(Boolean).length;
    return Math.round(wordCount / (elapsed / 60));
  }, [typedText, elapsed]);

  const handleRestart = useCallback(() => {
    setTypedText("");
    setStatus("idle");
    setElapsed(0);
    startTimeRef.current = 0;
    tabPressedRef.current = false;
    requestAnimationFrame(() => containerRef.current?.focus());
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Tab") {
        e.preventDefault();
        tabPressedRef.current = true;
        return;
      }

      if (e.key === "Enter") {
        if (tabPressedRef.current) {
          e.preventDefault();
          tabPressedRef.current = false;
          handleRestart();
          return;
        }
        // Allow Enter as a word separator (space-equivalent for WPM)
        if (status !== "finished") {
          e.preventDefault();
          setTypedText((prev) => prev + " ");
        }
        return;
      }

      tabPressedRef.current = false;

      if (e.key === "Escape") {
        e.preventDefault();
        if (status === "typing") {
          setStatus("finished");
        }
        return;
      }

      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (status === "finished") return;

      if (status === "idle" && e.key.length === 1) {
        setStatus("typing");
        startTimeRef.current = performance.now();
      }

      if (e.key === "Backspace") {
        e.preventDefault();
        setTypedText((prev) => prev.slice(0, -1));
      } else if (e.key === " ") {
        e.preventDefault();
        setTypedText((prev) => prev + " ");
      } else if (e.key.length === 1) {
        setTypedText((prev) => prev + e.key);
      }
    },
    [status, handleRestart]
  );

  const isTyping = status === "typing";
  const isFinished = status === "finished";

  useEffect(() => {
    setFocusActive(isTyping && focusMode);
    return () => setFocusActive(false);
  }, [isTyping, focusMode, setFocusActive]);

  const finalWordCount = typedText.trim().split(/\s+/).filter(Boolean).length;
  const finalWpm =
    elapsed > 0 ? Math.round(finalWordCount / (elapsed / 60)) : 0;

  return (
    <div
      className={`flex flex-col items-center gap-6 w-full max-w-5xl mx-auto ${
        isTyping && focusMode ? "focus-active" : ""
      }`}
      onClick={() => containerRef.current?.focus()}
    >
      {/* Typing area */}
      {!isFinished && (
        <div
          ref={containerRef}
          tabIndex={0}
          onKeyDown={handleKeyDown}
          className="w-full outline-none cursor-default select-none min-h-[6rem] sm:min-h-[7.5rem]"
          role="textbox"
          aria-label="Zen typing area"
        >
          <div className="no-ligatures relative text-xl sm:text-2xl leading-[2rem] sm:leading-[2.5rem] break-words">
            <span className="text-muted/70">{typedText}</span>
            {/* Blinking caret at end of typed text */}
            <span
              className={isTyping ? "" : "animate-blink"}
              style={{
                display: "inline-block",
                width: "2px",
                height: "1.1em",
                backgroundColor: "rgba(77,158,255,1)",
                boxShadow: "0 0 8px rgba(96,165,250,0.5)",
                verticalAlign: "text-bottom",
                marginLeft: "1px",
              }}
            />
          </div>
        </div>
      )}

      {/* Live WPM */}
      {!isFinished && (
        <div
          className={`flex items-center justify-center tabular-nums -mt-2 transition-opacity duration-200 ${
            isTyping ? "opacity-100" : "opacity-0"
          }`}
        >
          <span className="text-muted text-sm inline-flex items-baseline">
            <span className="text-accent font-black text-5xl inline-block w-[3ch] text-right">
              {liveWpm}
            </span>{" "}
            wpm
          </span>
        </div>
      )}

      {/* Idle hint */}
      {!isFinished && status === "idle" && (
        <p
          className="text-muted/65 text-xs opacity-0 animate-fade-in"
          style={{ animationDelay: "100ms", animationFillMode: "both" }}
        >
          start typing anything, or paste text above —{" "}
          <kbd className="px-1 py-0.5 rounded bg-white/[0.05] text-muted/65 text-xs">
            Esc
          </kbd>{" "}
          to stop
        </p>
      )}

      {/* Results */}
      {isFinished && (
        <div className="flex flex-col items-center gap-8 animate-fade-in">
          <div className="flex gap-10 tabular-nums">
            <div className="flex flex-col items-center gap-1">
              <span className="text-accent font-black text-5xl">{finalWpm}</span>
              <span className="text-muted/65 text-sm">wpm</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <span className="text-text font-black text-5xl">{elapsed}</span>
              <span className="text-muted/65 text-sm">seconds</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <span className="text-text font-black text-5xl">{finalWordCount}</span>
              <span className="text-muted/65 text-sm">words</span>
            </div>
          </div>
          <p className="text-muted/65 text-xs">
            press{" "}
            <kbd className="px-1.5 py-0.5 rounded bg-white/[0.05] text-muted/65 text-xs">
              Tab
            </kbd>{" "}
            +{" "}
            <kbd className="px-1.5 py-0.5 rounded bg-white/[0.05] text-muted/65 text-xs">
              Enter
            </kbd>{" "}
            to restart
          </p>
        </div>
      )}
    </div>
  );
}
