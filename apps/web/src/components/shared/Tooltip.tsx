"use client";

import React, { useState, useRef } from "react";

interface TooltipProps {
  label: string;
  children: React.ReactNode;
  /** Delay in ms before showing (default 300) */
  delay?: number;
}

export function Tooltip({ label, children, delay = 300 }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = () => {
    timeoutRef.current = setTimeout(() => setVisible(true), delay);
  };

  const hide = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setVisible(false);
  };

  return (
    <span className="relative inline-flex" onMouseEnter={show} onMouseLeave={hide}>
      {children}
      {visible && (
        <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 px-2 py-1 rounded bg-surface ring-1 ring-white/10 text-xs text-muted whitespace-nowrap pointer-events-none z-50 animate-fade-in" style={{ animationDuration: "100ms" }}>
          {label}
        </span>
      )}
    </span>
  );
}
