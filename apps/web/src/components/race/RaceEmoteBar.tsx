"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import { EMOTE_KEYS, type EmoteKey } from "@typeoff/shared";
import { useSocket } from "@/hooks/useSocket";

interface RaceEmoteBarProps {
  disabled?: boolean;
}

export function RaceEmoteBar({ disabled }: RaceEmoteBarProps) {
  const { emit } = useSocket();
  const [cooldown, setCooldown] = useState(false);
  const cooldownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current);
    };
  }, []);

  const sendEmote = useCallback(async (emote: EmoteKey) => {
    if (cooldown || disabled) return;
    setCooldown(true);

    try {
      const res = await fetch("/api/ws-token");
      if (res.ok) {
        const { token } = await res.json();
        emit("sendRaceEmote", { emote, token });
      }
    } catch { /* ignore */ }

    cooldownTimerRef.current = setTimeout(() => setCooldown(false), 2000);
  }, [cooldown, disabled, emit]);

  // Number key shortcuts: 1–6 map to emotes in order
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      const idx = parseInt(e.key) - 1;
      if (!isNaN(idx) && idx >= 0 && idx < EMOTE_KEYS.length) {
        sendEmote(EMOTE_KEYS[idx]);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [sendEmote]);

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {EMOTE_KEYS.map((emote, idx) => (
        <button
          key={emote}
          onClick={() => sendEmote(emote)}
          disabled={cooldown || disabled}
          className="text-xs px-2 py-1 rounded bg-surface/60 ring-1 ring-white/[0.06] text-muted hover:text-text hover:ring-accent/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
        >
          <span className="text-[8px] text-muted/40 tabular-nums">{idx + 1}</span>
          {emote}
        </button>
      ))}
    </div>
  );
}
