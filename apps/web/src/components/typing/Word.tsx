"use client";

import React, { forwardRef } from "react";
import type { WordState } from "@typeoff/shared";
import { Character } from "./Character";
import { Cursor } from "./Cursor";

interface WordProps {
  word: WordState;
  isActive: boolean;
  charIndex: number;
  isTyping: boolean;
}

const WordInner = forwardRef<HTMLSpanElement, WordProps>(
  function WordInner({ word, isActive, charIndex, isTyping }, ref) {
    // Check if word was completed with errors
    const hasErrors =
      !isActive &&
      (word.chars.some((c) => c.status === "incorrect") ||
        word.extraChars.length > 0 ||
        word.chars.some((c) => c.status === "idle" && word.chars[0].status !== "idle"));

    return (
      <span
        ref={ref}
        className={`relative inline-block mr-[1ch] ${
          isActive ? "border-b-2 border-accent/50" : ""
        } ${hasErrors ? "border-b-2 border-error/50" : ""}`}
      >
        {word.chars.map((char, i) => (
          <Character key={i} char={char} />
        ))}
        {word.extraChars.map((char, i) => (
          <Character key={`extra-${i}`} char={char} isExtra />
        ))}
        {isActive && <Cursor charIndex={charIndex} isTyping={isTyping} />}
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
