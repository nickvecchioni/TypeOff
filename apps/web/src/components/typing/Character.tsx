"use client";

import React from "react";
import type { CharState } from "@typeoff/shared";

interface CharacterProps {
  char: CharState;
  isExtra?: boolean;
}

const statusClasses: Record<string, string> = {
  idle: "text-muted",
  correct: "text-correct",
  incorrect: "text-error",
};

function CharacterInner({ char, isExtra }: CharacterProps) {
  const display = char.status === "incorrect" && char.actual ? char.actual : char.expected;
  const className = isExtra
    ? "text-error bg-error/20"
    : statusClasses[char.status] || "text-muted";

  return <span className={className}>{display}</span>;
}

export const Character = React.memo(CharacterInner, (prev, next) => {
  return (
    prev.char.status === next.char.status &&
    prev.char.actual === next.char.actual &&
    prev.isExtra === next.isExtra
  );
});
