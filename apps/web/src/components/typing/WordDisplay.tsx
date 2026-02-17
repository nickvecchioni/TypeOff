"use client";

import React from "react";
import type { WordState } from "@typeoff/shared";
import { Word } from "./Word";

interface WordDisplayProps {
  words: WordState[];
  currentWordIndex: number;
  currentCharIndex: number;
  isTyping: boolean;
}

export function WordDisplay({
  words,
  currentWordIndex,
  currentCharIndex,
  isTyping,
}: WordDisplayProps) {
  return (
    <div className="no-ligatures relative text-xl sm:text-2xl leading-[2rem] sm:leading-[2.5rem]">
      {words.map((word, i) => (
        <Word
          key={i}
          word={word}
          isActive={i === currentWordIndex}
          charIndex={i === currentWordIndex ? currentCharIndex : 0}
          isTyping={isTyping}
        />
      ))}
    </div>
  );
}
