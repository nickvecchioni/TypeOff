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

interface PlayerEmotePillProps {
  event: EmoteEvent;
}

/** Renders an emote pill that slides out to the left then fades.
 *  Must be placed inside a `relative` container. */
export function PlayerEmotePill({ event }: PlayerEmotePillProps) {
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setGone(true), 2500);
    return () => clearTimeout(t);
  }, []);

  if (gone) return null;

  return (
    <span
      className="absolute z-20 pointer-events-none select-none text-xs font-bold text-accent whitespace-nowrap"
      style={{
        left: "6px",
        top: "50%",
        animation: "emote-slide-left 2.5s ease-out forwards",
        background: "rgba(13,13,22,0.92)",
        border: "1px solid rgba(77,158,255,0.25)",
        borderRadius: "99px",
        padding: "2px 8px",
      }}
    >
      {event.emote}
    </span>
  );
}
