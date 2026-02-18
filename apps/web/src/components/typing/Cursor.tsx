"use client";

import React from "react";
import { useActiveCosmetics } from "@/contexts/CosmeticContext";
import { CURSOR_STYLES } from "@typeoff/shared";

interface CursorProps {
  charIndex: number;
  isTyping: boolean;
}

function CursorInner({ charIndex, isTyping }: CursorProps) {
  const { activeCursorStyle } = useActiveCosmetics();
  const style = activeCursorStyle ? CURSOR_STYLES[activeCursorStyle] : null;

  // Defaults (original cursor)
  let width = "w-[2px]";
  let bgColor = "rgba(77,158,255,1)";
  let shadow = "0 0 8px rgba(96, 165, 250, 0.5), 0 0 2px rgba(96, 165, 250, 0.8)";
  let animation: string | undefined;
  let positionClass = "absolute top-0 bottom-0";

  if (style) {
    bgColor = style.color;
    shadow = style.glowColor
      ? `0 0 8px ${style.glowColor}, 0 0 2px ${style.glowColor}`
      : "none";
    animation = style.animation;

    switch (style.shape) {
      case "block":
        width = "w-[1ch]";
        // Block cursor is semi-transparent so text shows through
        bgColor = style.color;
        shadow = style.glowColor
          ? `0 0 12px ${style.glowColor}`
          : "none";
        break;
      case "underline":
        positionClass = "absolute bottom-0 left-0";
        width = "w-[1ch]";
        break;
      // "line" uses defaults
    }
  }

  const isUnderline = style?.shape === "underline";
  const isBlock = style?.shape === "block";

  return (
    <span
      className={`${positionClass} ${width} transition-[left] duration-50 ${
        isTyping ? "" : "animate-blink"
      }`}
      style={{
        left: `${charIndex}ch`,
        backgroundColor: bgColor,
        boxShadow: shadow,
        opacity: isBlock ? 0.3 : 1,
        height: isUnderline ? "2px" : undefined,
        top: isUnderline ? "auto" : undefined,
        animation: animation ? `${animation} 2s ease-in-out infinite` : undefined,
      }}
      aria-hidden
    />
  );
}

export const Cursor = React.memo(CursorInner);
