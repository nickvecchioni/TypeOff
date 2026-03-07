"use client";

import React, { useRef } from "react";
import { useActiveCosmetics } from "@/contexts/CosmeticContext";
import { CURSOR_STYLES } from "@typeoff/shared";

export interface SmoothCursorPos {
  x: number;
  y: number;
  lineH: number;
  charW: number;
}

export interface CursorHandle {
  moveTo: (pos: SmoothCursorPos, typing: boolean) => void;
}

interface CursorProps {
  charIndex: number;
  isTyping: boolean;
  smooth?: boolean;
}

export const Cursor = React.memo(
  React.forwardRef<CursorHandle, CursorProps>(function CursorInner(props, ref) {
    const { activeCursorStyle } = useActiveCosmetics();
    const style = activeCursorStyle ? CURSOR_STYLES[activeCursorStyle] : null;
    const outerRef = useRef<HTMLSpanElement>(null);
    const prevIsTyping = useRef(props.isTyping);

    const bgColor = style ? style.color : "rgba(77,158,255,1)";
    const shadow = style?.glowColor
      ? `0 0 8px ${style.glowColor}, 0 0 2px ${style.glowColor}`
      : "0 0 8px rgba(96, 165, 250, 0.5), 0 0 2px rgba(96, 165, 250, 0.8)";
    const cosmeticAnimation = style?.animation;
    const shape = style?.shape ?? "line";

    React.useImperativeHandle(ref, () => ({
      moveTo(pos: SmoothCursorPos, typing: boolean) {
        const el = outerRef.current;
        if (!el) return;

        let w: string;
        let h: string;
        let ty = pos.y;

        switch (shape) {
          case "block":
            w = `${pos.charW}px`;
            h = `${pos.lineH}px`;
            break;
          case "underline":
            w = `${pos.charW}px`;
            h = "2px";
            ty = pos.y + pos.lineH - 2;
            break;
          default:
            w = "2px";
            h = `${pos.lineH}px`;
        }

        el.style.width = w;
        el.style.height = h;
        const wasTyping = prevIsTyping.current;
        if (typing !== wasTyping) {
          el.style.transition = typing ? "transform 100ms ease-out" : "none";
          prevIsTyping.current = typing;
        }
        el.style.transform = `translate(${pos.x}px, ${ty}px)`;
      },
    }), [shape]);

    if (!props.smooth) {
      const positionClass = shape === "underline" ? "absolute bottom-0 left-0" : "absolute top-0 bottom-0";
      const width = shape === "block" || shape === "underline" ? "w-[1ch]" : "w-[2px]";
      const blinkAnim = shape === "block" ? "blink-block 1s step-end infinite" : "blink 1s step-end infinite";

      return (
        <span
          className={`${positionClass} ${width} transition-[left] duration-50`}
          style={{
            left: `${props.charIndex}ch`,
            backgroundColor: bgColor,
            boxShadow: shadow,
            opacity: shape === "block" ? 0.3 : 1,
            height: shape === "underline" ? "2px" : undefined,
            top: shape === "underline" ? "auto" : undefined,
            animation: props.isTyping
              ? cosmeticAnimation ? `${cosmeticAnimation} 2s ease-in-out infinite` : "none"
              : blinkAnim,
          }}
          aria-hidden
        />
      );
    }

    return (
      <span
        ref={outerRef}
        className="absolute pointer-events-none select-none z-10"
        style={{
          left: 0,
          top: 0,
          width: "2px",
          height: "32px",
          transform: "translate(0px, 0px)",
          transition: "transform 100ms ease-out",
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
            animation: props.isTyping
              ? cosmeticAnimation ? `${cosmeticAnimation} 2s ease-in-out infinite` : "none"
              : shape === "block" ? "blink-block 1s step-end infinite" : "blink 1s step-end infinite",
          }}
        />
      </span>
    );
  })
);
