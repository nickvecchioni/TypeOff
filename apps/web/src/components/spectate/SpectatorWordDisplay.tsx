"use client";

import React, { useMemo } from "react";
import { WordDisplay } from "@/components/typing/WordDisplay";
import type { WordState, CharState } from "@typeoff/shared";

interface SpectatorWordDisplayProps {
  words: string[];
  wordIndex: number;
  charIndex: number;
  finished: boolean;
}

export const SpectatorWordDisplay = React.memo(function SpectatorWordDisplay({
  words,
  wordIndex,
  charIndex,
  finished,
}: SpectatorWordDisplayProps) {
  const wordStates = useMemo((): WordState[] => {
    return words.map((word, wi) => {
      const chars: CharState[] = word.split("").map((ch, ci) => {
        if (wi < wordIndex) {
          return { expected: ch, actual: ch, status: "correct" as const };
        }
        if (wi === wordIndex && ci < charIndex) {
          return { expected: ch, actual: ch, status: "correct" as const };
        }
        return { expected: ch, actual: null, status: "idle" as const };
      });
      return { chars, extraChars: [] };
    });
  }, [words, wordIndex, charIndex]);

  return (
    <div className="w-full select-none">
      <WordDisplay
        words={wordStates}
        currentWordIndex={finished ? -1 : wordIndex}
        currentCharIndex={finished ? 0 : charIndex}
        isTyping={!finished}
      />
    </div>
  );
});
