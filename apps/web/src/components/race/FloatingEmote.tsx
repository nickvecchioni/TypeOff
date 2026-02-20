"use client";

import React, { useEffect, useState } from "react";
import type { EmoteKey } from "@typeoff/shared";

export interface EmoteEvent {
  id: string;
  playerId: string;
  playerName: string;
  emote: EmoteKey;
  receivedAt: number;
}

interface FloatingEmoteProps {
  event: EmoteEvent;
}

export function FloatingEmote({ event }: FloatingEmoteProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 2500);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <span
      className="absolute right-0 -top-5 text-xs font-bold text-accent bg-surface/80 ring-1 ring-accent/20 rounded px-1.5 py-0.5 pointer-events-none select-none"
      style={{ animation: "emote-float 2.5s ease-out forwards" }}
    >
      {event.emote}
    </span>
  );
}
