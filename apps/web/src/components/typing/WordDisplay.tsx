"use client";

import React, { useRef, useLayoutEffect } from "react";
import type { WordState, ContentType } from "@typeoff/shared";
import { Word } from "./Word";
import { Cursor, type CursorHandle } from "./Cursor";
import { CodeWordDisplay } from "./CodeWordDisplay";

interface WordDisplayProps {
  words: WordState[];
  currentWordIndex: number;
  currentCharIndex: number;
  isTyping: boolean;
  contentType?: ContentType;
}

export function WordDisplay({
  words,
  currentWordIndex,
  currentCharIndex,
  isTyping,
  contentType,
}: WordDisplayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const cursorRef = useRef<CursorHandle>(null);

  useLayoutEffect(() => {
    const container = containerRef.current;
    const measureEl = measureRef.current;
    if (!container || !measureEl) return;

    const wordEl = container.querySelector(
      `[data-wordindex="${currentWordIndex}"]`,
    ) as HTMLElement | null;
    if (!wordEl) return;

    const charW = measureEl.offsetWidth;
    if (charW === 0) return;

    const containerRect = container.getBoundingClientRect();
    const wordRect = wordEl.getBoundingClientRect();

    cursorRef.current?.moveTo(
      {
        x: wordRect.left - containerRect.left + currentCharIndex * charW,
        y: wordRect.top - containerRect.top,
        lineH: wordRect.height || 32,
        charW,
      },
      isTyping,
    );
  }, [currentWordIndex, currentCharIndex, isTyping]);

  if (contentType === "code") {
    return (
      <div ref={containerRef} className="relative">
        {/* Hidden span for measuring 1ch in the current font/size context */}
        <span
          ref={measureRef}
          aria-hidden
          className="absolute invisible pointer-events-none text-xl sm:text-2xl font-mono"
          style={{ width: "1ch" }}
        />
        <CodeWordDisplay
          words={words}
          currentWordIndex={currentWordIndex}
          currentCharIndex={currentCharIndex}
          isTyping={isTyping}
        />
        <Cursor ref={cursorRef} charIndex={0} isTyping={isTyping} smooth />
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="no-ligatures text-xl sm:text-2xl leading-[2rem] sm:leading-[2.5rem]">
        {/* Hidden span for measuring 1ch in the current font/size context */}
        <span
          ref={measureRef}
          aria-hidden
          className="absolute invisible pointer-events-none"
          style={{ width: "1ch" }}
        />
        {words.map((word, i) => (
          <Word
            key={i}
            word={word}
            isActive={i === currentWordIndex}
            charIndex={i === currentWordIndex ? currentCharIndex : 0}
            isTyping={isTyping}
            wordIndex={i}
          />
        ))}
      </div>
      <Cursor ref={cursorRef} charIndex={0} isTyping={isTyping} smooth />
    </div>
  );
}
