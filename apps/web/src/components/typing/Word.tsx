"use client";

import React, { forwardRef } from "react";
import type { WordState } from "@typeoff/shared";
import { Character } from "./Character";

interface WordProps {
  word: WordState;
  isActive: boolean;
  charIndex: number;
  isTyping: boolean;
  wordIndex?: number;
}

const WordInner = forwardRef<HTMLSpanElement, WordProps>(
  function WordInner({ word, isActive, charIndex, isTyping, wordIndex }, ref) {
    const hasErrors = word.chars.some((c) => c.status === "incorrect");

    return (
      <span
        ref={ref}
        data-wordindex={wordIndex}
        className={`relative inline-block mr-[1ch] border-b-2 ${
          isActive
            ? hasErrors
              ? "border-error bg-error/5 rounded-sm"
              : "border-accent/50"
            : hasErrors
            ? "border-error/50"
            : "border-transparent"
        }`}
      >
        {word.chars.map((char, i) => (
          <Character key={i} char={char} />
        ))}
        {word.extraChars.map((char, i) => (
          <Character key={`extra-${i}`} char={char} isExtra />
        ))}
      </span>
    );
  }
);

export const Word = React.memo(WordInner, (prev, next) => {
  if (prev.isActive !== next.isActive) return false;
  if (prev.isActive && prev.charIndex !== next.charIndex) return false;
  if (prev.isTyping !== next.isTyping) return false;
  if (prev.word !== next.word) return false;
  return true;
});
