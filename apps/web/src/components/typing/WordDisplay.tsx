"use client";

import React, { useRef, useEffect, useState } from "react";
import type { WordState, ContentType } from "@typeoff/shared";
import { Word } from "./Word";
import { Cursor, type SmoothCursorPos } from "./Cursor";
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
  const [smoothPos, setSmoothPos] = useState<SmoothCursorPos>({ x: 0, y: 0, lineH: 32, charW: 12 });

  useEffect(() => {
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

    setSmoothPos({
      x: wordRect.left - containerRect.left + currentCharIndex * charW,
      y: wordRect.top - containerRect.top,
      lineH: wordRect.height,
      charW,
    });
  }, [currentWordIndex, currentCharIndex]);

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
        <Cursor charIndex={0} isTyping={isTyping} smooth={smoothPos} />
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
      <Cursor charIndex={0} isTyping={isTyping} smooth={smoothPos} />
    </div>
  );
}
