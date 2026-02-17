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
      style={{
        left: `${charIndex}ch`,
        boxShadow: "0 0 8px rgba(96, 165, 250, 0.5), 0 0 2px rgba(96, 165, 250, 0.8)",
      }}
      aria-hidden
    />
  );
}

export const Cursor = React.memo(CursorInner);
