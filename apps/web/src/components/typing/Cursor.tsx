"use client";

import React from "react";
import { useActiveCosmetics } from "@/contexts/CosmeticContext";
import { CURSOR_STYLES } from "@typeoff/shared";

export interface SmoothCursorPos {
  x: number;
  y: number;
  lineH: number;
  charW: number;
}

interface CursorProps {
  charIndex: number;
  isTyping: boolean;
  /** When provided, cursor uses GPU-composited transform animation instead of left-offset */
  smooth?: SmoothCursorPos;
}

function CursorInner({ charIndex, isTyping, smooth }: CursorProps) {
  const { activeCursorStyle } = useActiveCosmetics();
  const style = activeCursorStyle ? CURSOR_STYLES[activeCursorStyle] : null;

  const bgColor = style
    ? style.color
    : "rgba(77,158,255,1)";
  const shadow = style?.glowColor
    ? `0 0 8px ${style.glowColor}, 0 0 2px ${style.glowColor}`
    : "0 0 8px rgba(96, 165, 250, 0.5), 0 0 2px rgba(96, 165, 250, 0.8)";
  const cosmeticAnimation = style?.animation;
  const shape = style?.shape ?? "line";

  if (smooth) {
    // Smooth mode — single cursor per typing area, repositioned via transform
    let w: string;
    let h: string;
    let ty = smooth.y;

    switch (shape) {
      case "block":
        w = `${smooth.charW}px`;
        h = `${smooth.lineH}px`;
        break;
      case "underline":
        w = `${smooth.charW}px`;
        h = "2px";
        ty = smooth.y + smooth.lineH - 2;
        break;
      default:
        w = "2px";
        h = `${smooth.lineH}px`;
    }

    // Separate positioning (outer) from cosmetic animation (inner) so that
    // re-renders from position changes don't restart the CSS animation.
    return (
      <span
        className="absolute pointer-events-none select-none z-10"
        style={{
          left: 0,
          top: 0,
          width: w,
          height: h,
          transform: `translate(${smooth.x}px, ${ty}px)`,
          transition: isTyping ? "transform 80ms cubic-bezier(0.22, 1, 0.36, 1)" : "none",
          willChange: "transform",
        }}
        aria-hidden
      >
        <span
          className="block w-full h-full"
          style={{
            backgroundColor: bgColor,
            boxShadow: shape === "block" ? (style?.glowColor ? `0 0 12px ${style.glowColor}` : "none") : shadow,
            opacity: shape === "block" ? 0.3 : 1,
            animation: isTyping
              ? cosmeticAnimation ? `${cosmeticAnimation} 2s ease-in-out infinite` : "none"
              : shape === "block" ? "blink-block 1s step-end infinite" : "blink 1s step-end infinite",
          }}
        />
      </span>
    );
  }

  // Legacy mode — kept for fallback; not used in main typing flow
  const positionClass = shape === "underline" ? "absolute bottom-0 left-0" : "absolute top-0 bottom-0";
  const width = shape === "block" || shape === "underline" ? "w-[1ch]" : "w-[2px]";

  const blinkAnim = shape === "block" ? "blink-block 1s step-end infinite" : "blink 1s step-end infinite";

  return (
    <span
      className={`${positionClass} ${width} transition-[left] duration-50`}
      style={{
        left: `${charIndex}ch`,
        backgroundColor: bgColor,
        boxShadow: shadow,
        opacity: shape === "block" ? 0.3 : 1,
        height: shape === "underline" ? "2px" : undefined,
        top: shape === "underline" ? "auto" : undefined,
        animation: isTyping
          ? cosmeticAnimation ? `${cosmeticAnimation} 2s ease-in-out infinite` : "none"
          : blinkAnim,
      }}
      aria-hidden
    />
  );
}

export const Cursor = React.memo(CursorInner);
