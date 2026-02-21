"use client";

import React from "react";
import type { WordState } from "@typeoff/shared";
import { Cursor } from "./Cursor";

interface CodeWordDisplayProps {
  words: WordState[];
  currentWordIndex: number;
  currentCharIndex: number;
  isTyping: boolean;
}

/**
 * Renders code with proper indentation and line breaks.
 * `\n` tokens create visual line breaks.
 * Indent tokens (all spaces) are rendered as whitespace.
 */
export function CodeWordDisplay({
  words,
  currentWordIndex,
  currentCharIndex,
  isTyping,
}: CodeWordDisplayProps) {
  // Split words into lines at \n tokens
  const lines: { words: { word: WordState; globalIdx: number }[]; }[] = [];
  let currentLine: { word: WordState; globalIdx: number }[] = [];

  for (let i = 0; i < words.length; i++) {
    const text = words[i].chars.map((c) => c.expected).join("");
    if (text === "\\n") {
      // If this is the active token, place an invisible cursor holder at the
      // END of the current line (before committing it), not the start of the next.
      if (i === currentWordIndex) {
        currentLine.push({ word: words[i], globalIdx: i });
      }
      lines.push({ words: currentLine });
      currentLine = [];
    } else {
      currentLine.push({ word: words[i], globalIdx: i });
    }
  }
  if (currentLine.length > 0) {
    lines.push({ words: currentLine });
  }

  return (
    <div className="no-ligatures relative text-xl sm:text-2xl leading-[2rem] sm:leading-[2.5rem] font-mono">
      {lines.map((line, lineIdx) => (
        <div key={lineIdx} className="flex flex-wrap">
          {line.words.map(({ word, globalIdx }) => {
            const isActive = globalIdx === currentWordIndex;
            const text = word.chars.map((c) => c.expected).join("");
            const isIndent = text.trim() === "" && text.length > 0;
            const isNewlineToken = text === "\\n";
            const hasErrors = word.chars.some((c) => c.status === "incorrect");

            if (isNewlineToken) {
              // Invisible — just anchor the cursor at end of line, no visible text
              return (
                <span
                  key={globalIdx}
                  data-wordindex={globalIdx}
                  className="relative inline-block w-0"
                >
                  {isActive && <Cursor charIndex={currentCharIndex} isTyping={isTyping} />}
                </span>
              );
            }

            if (isIndent) {
              // Render indent as whitespace
              return (
                <span
                  key={globalIdx}
                  data-wordindex={globalIdx}
                  className={`relative inline-block ${
                    isActive ? "border-b-2 border-accent/50" : ""
                  }`}
                  style={{ width: `${text.length}ch` }}
                >
                  {word.chars.map((char, ci) => (
                    <span
                      key={ci}
                      className={
                        char.status === "correct" ? "text-correct/30" :
                        char.status === "incorrect" ? "text-error" :
                        "text-transparent"
                      }
                    >
                      {"\u00B7"}
                    </span>
                  ))}
                  {isActive && <Cursor charIndex={currentCharIndex} isTyping={isTyping} />}
                </span>
              );
            }

            // Regular code token
            return (
              <span
                key={globalIdx}
                data-wordindex={globalIdx}
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
                {word.chars.map((char, ci) => {
                  const charClass =
                    char.status === "correct" ? "text-correct" :
                    char.status === "incorrect" ? "text-error" :
                    "text-muted";
                  return (
                    <span key={ci} className={charClass}>
                      {char.expected}
                    </span>
                  );
                })}
                {isActive && <Cursor charIndex={currentCharIndex} isTyping={isTyping} />}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
}
