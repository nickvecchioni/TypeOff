"use client";

import React, { useRef, useEffect, useState } from "react";
import type { WordState } from "@typeoff/shared";
import { Word } from "./Word";

interface WordDisplayProps {
  words: WordState[];
  currentWordIndex: number;
  currentCharIndex: number;
  isTyping: boolean;
}

const LINE_HEIGHT = 2.5; // rem
const VISIBLE_LINES = 3;

export function WordDisplay({
  words,
  currentWordIndex,
  currentCharIndex,
  isTyping,
}: WordDisplayProps) {
  const innerRef = useRef<HTMLDivElement>(null);
  const activeWordRef = useRef<HTMLSpanElement>(null);
  const [scrollLine, setScrollLine] = useState(0);

  // Reset scroll when test restarts
  useEffect(() => {
    if (currentWordIndex === 0) {
      setScrollLine(0);
    }
  }, [currentWordIndex]);

  // Scroll when active word reaches the 3rd visible line
  useEffect(() => {
    if (!activeWordRef.current || !innerRef.current) return;

    // offsetTop is relative to offsetParent and NOT affected by transforms
    const wordOffsetTop = activeWordRef.current.offsetTop;
    const remPx = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const lineHeightPx = LINE_HEIGHT * remPx;
    const wordLine = Math.round(wordOffsetTop / lineHeightPx);

    // Keep active word on line 2 (0-indexed) — scroll once it reaches line 3+
    if (wordLine >= scrollLine + 2) {
      setScrollLine(wordLine - 1);
    }
  }, [currentWordIndex, scrollLine]);

  return (
    <div
      className="no-ligatures relative overflow-hidden text-2xl leading-[2.5rem]"
      style={{ height: `${VISIBLE_LINES * LINE_HEIGHT}rem` }}
    >
      <div
        ref={innerRef}
        className="transition-transform duration-200 ease-out"
        style={{
          transform: `translateY(-${scrollLine * LINE_HEIGHT}rem)`,
        }}
      >
        {words.map((word, i) => (
          <Word
            key={i}
            ref={i === currentWordIndex ? activeWordRef : undefined}
            word={word}
            isActive={i === currentWordIndex}
            charIndex={i === currentWordIndex ? currentCharIndex : 0}
            isTyping={isTyping}
          />
        ))}
      </div>
    </div>
  );
}
