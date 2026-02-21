"use client";

import React from "react";
import type { WordState, ContentType } from "@typeoff/shared";
import { Word } from "./Word";
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
  if (contentType === "code") {
    return (
      <CodeWordDisplay
        words={words}
        currentWordIndex={currentWordIndex}
        currentCharIndex={currentCharIndex}
        isTyping={isTyping}
      />
    );
  }

  return (
    <div className="no-ligatures relative text-xl sm:text-2xl leading-[2rem] sm:leading-[2.5rem]">
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
  );
}
