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

/** Renders a floating emote pill that animates up then disappears.
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
      className="absolute right-2 top-0 z-20 pointer-events-none select-none flex items-center gap-1 text-[11px] font-bold text-accent whitespace-nowrap"
      style={{
        animation: "emote-float 2.5s ease-out forwards",
        background: "rgba(13,13,22,0.92)",
        border: "1px solid rgba(77,158,255,0.25)",
        borderRadius: "99px",
        padding: "1px 8px",
      }}
    >
      <span className="text-muted/65 font-normal text-[10px]">{event.playerName}</span>
      <span>{event.emote}</span>
    </span>
  );
}
