"use client";

import React from "react";

interface CursorProps {
  charIndex: number;
  isTyping: boolean;
}

function CursorInner({ charIndex, isTyping }: CursorProps) {
  return (
    <span
      className={`absolute top-0 bottom-0 w-[2px] bg-accent transition-[left] duration-50 ${
        isTyping ? "" : "animate-blink"
      }`}
      style={{ left: `${charIndex}ch` }}
      aria-hidden
    />
  );
}

export const Cursor = React.memo(CursorInner);
