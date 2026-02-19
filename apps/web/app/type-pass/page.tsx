"use client";

import React, { useEffect, useState } from "react";
import type { SeasonDefinition, TypePassReward } from "@typeoff/shared";
import {
  CURSOR_STYLES,
  NAME_COLORS,
  PROFILE_BORDERS,
  TYPING_THEMES,
} from "@typeoff/shared";

interface TypePassData {
  season: SeasonDefinition | null;
  userState: {
    seasonalXp: number;
    currentTier: number;
    isPremium: boolean;
  } | null;
  cosmetics: string[];
}

export default function TypePassPage() {
  const [data, setData] = useState<TypePassData | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/type-pass")
      .then((r) => r.json())
      .then(setData)
      .catch(() => {});
  }, []);

  if (!data) {
    return (
      <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-8">
        <div className="max-w-3xl mx-auto">
          <div className="h-96 rounded-xl bg-surface/40 animate-pulse" />
        </div>
      </main>
    );
  }

  const season = data.season;

  if (!season) {
    return (
      <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-8">
        <div className="max-w-3xl mx-auto text-center py-16">
          <p className="text-muted text-sm">No active season.</p>
        </div>
      </main>
    );
  }

  const tier = data.userState?.currentTier ?? 0;
  const xp = data.userState?.seasonalXp ?? 0;
  const isPremium = data.userState?.isPremium ?? false;
  const ownedSet = new Set(data.cosmetics);
  const xpInTier = xp % season.xpPerTier;
  const xpPct =
    tier >= season.maxTier ? 100 : (xpInTier / season.xpPerTier) * 100;

  async function handlePurchase() {
    setPurchasing(true);
    setPurchaseError(null);
    try {
      const res = await fetch("/api/type-pass/checkout", { method: "POST" });
      const body = await res.json();
      if (body.url) {
        window.location.href = body.url;
      } else {
        setPurchaseError(body.error ?? "Checkout failed");
        setPurchasing(false);
      }
    } catch {
      setPurchaseError("Network error");
      setPurchasing(false);
    }
  }

  const rewardByTier = new Map<number, TypePassReward>();
  for (const r of season.rewards) rewardByTier.set(r.tier, r);

  return (
    <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-8">
      <div className="max-w-3xl mx-auto animate-fade-in space-y-5">
        {/* ── Header ───────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-sm font-bold text-text uppercase tracking-wider">
              {season.name}
            </h1>
            <Countdown endDate={season.endDate} />
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            {isPremium ? (
              <span className="text-xs font-bold text-amber-400/80 uppercase tracking-wider">
                Premium
              </span>
            ) : (
              <button
                onClick={handlePurchase}
                disabled={purchasing}
                className="text-xs font-bold text-bg bg-amber-400 hover:bg-amber-300 px-3 py-1.5 rounded-md transition-colors disabled:opacity-50 uppercase tracking-wider"
              >
                {purchasing ? "..." : `Upgrade $${season.priceUsd}`}
              </button>
            )}
            {purchaseError && (
              <p className="text-[10px] text-error max-w-48 text-right">
                {purchaseError}
              </p>
            )}
          </div>
        </div>

        {/* ── Segmented progress ───────────────────────── */}
        <div className="space-y-1.5">
          <div className="flex gap-px">
            {Array.from({ length: season.maxTier }, (_, i) => {
              const t = i + 1;
              const filled = t <= tier;
              const partial = t === tier + 1 && tier < season.maxTier;
              return (
                <div
                  key={t}
                  className="flex-1 h-1.5 rounded-[1px] bg-white/[0.06] overflow-hidden"
                >
                  {filled && <div className="h-full w-full bg-amber-400" />}
                  {partial && (
                    <div
                      className="h-full bg-amber-400/50"
                      style={{ width: `${Math.round(xpPct)}%` }}
                    />
                  )}
                </div>
              );
            })}
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-xs font-bold text-text tabular-nums">
              Tier {tier}
              <span className="text-muted/40 font-normal">
                {" "}/ {season.maxTier}
              </span>
            </span>
            <span className="text-[11px] text-muted/50 tabular-nums">
              {tier >= season.maxTier
                ? "Max tier"
                : `${xpInTier} / ${season.xpPerTier} XP`}
              <span className="text-muted/30 ml-2">
                {xp.toLocaleString()} total
              </span>
            </span>
          </div>
        </div>

        {/* ── Tier grid ────────────────────────────────── */}
        <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 gap-1">
          {Array.from({ length: season.maxTier }, (_, i) => {
            const t = i + 1;
            const reward = rewardByTier.get(t);
            const reached = t <= tier;
            const current = t === tier + 1;
            const owned = reward ? ownedSet.has(reward.id) : false;
            const premLocked = !!reward?.premium && !isPremium;

            return (
              <div
                key={t}
                className={`relative flex flex-col items-center gap-1 rounded-lg px-2 py-2.5 transition-colors ${
                  current
                    ? "ring-1 ring-amber-400/40 bg-amber-400/[0.05]"
                    : reached
                    ? "bg-white/[0.02] hover:bg-white/[0.05]"
                    : "opacity-[0.25]"
                }`}
              >
                {/* Tier label */}
                <span
                  className={`text-[10px] font-bold tabular-nums leading-none ${
                    current
                      ? "text-amber-400"
                      : reached
                      ? "text-muted/40"
                      : "text-muted/25"
                  }`}
                >
                  {t}
                </span>

                {/* Reward icon */}
                <div className="h-6 flex items-center justify-center">
                  {reward && <RewardIcon reward={reward} />}
                </div>

                {/* Name */}
                <span
                  className={`text-[10px] leading-tight text-center truncate w-full ${
                    reached ? "text-text/70" : "text-muted/40"
                  }`}
                >
                  {reward?.name ?? ""}
                </span>

                {/* Premium gold dot */}
                {reward?.premium && (
                  <span
                    className={`absolute top-1.5 right-1.5 w-1 h-1 rounded-full ${
                      premLocked ? "bg-amber-400/30" : "bg-amber-400"
                    }`}
                  />
                )}

                {/* Owned check */}
                {owned && (
                  <span className="absolute top-1 left-1.5 text-correct text-[8px] leading-none">
                    &#10003;
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}

/* ── Countdown ─────────────────────────────────────────── */

function Countdown({ endDate }: { endDate: string }) {
  const [text, setText] = useState("");

  useEffect(() => {
    function calc() {
      const diff = new Date(endDate + "T23:59:59Z").getTime() - Date.now();
      if (diff <= 0) return "Ended";
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      if (d > 0) return `${d}d ${h}h left`;
      const m = Math.floor((diff % 3600000) / 60000);
      return h > 0 ? `${h}h ${m}m` : `${m}m`;
    }
    setText(calc());
    const id = setInterval(() => setText(calc()), 60000);
    return () => clearInterval(id);
  }, [endDate]);

  return (
    <p className="text-[11px] text-muted/40 mt-0.5 tabular-nums">{text}</p>
  );
}

/* ── Reward Icon ───────────────────────────────────────── */

function RewardIcon({ reward }: { reward: TypePassReward }) {
  switch (reward.type) {
    case "badge":
      return <span className="text-base leading-none">{reward.value}</span>;

    case "title":
      return (
        <span className="text-[10px] text-amber-400/70 font-medium leading-none">
          {reward.value.length > 8
            ? reward.value.slice(0, 8) + "\u2026"
            : reward.value}
        </span>
      );

    case "nameColor": {
      const hex = NAME_COLORS[reward.id] ?? reward.value;
      return (
        <span
          className="w-4 h-4 rounded-full ring-1 ring-white/10 inline-block"
          style={{ backgroundColor: hex }}
        />
      );
    }

    case "nameEffect":
      return (
        <span className="text-xs text-text/50 italic leading-none">fx</span>
      );

    case "cursorStyle": {
      const def = CURSOR_STYLES[reward.id];
      if (!def) return null;
      return (
        <span
          className="inline-block rounded-[1px]"
          style={{
            width:
              def.shape === "block"
                ? "0.7ch"
                : def.shape === "underline"
                ? "0.7ch"
                : 2,
            height: def.shape === "underline" ? 2 : 14,
            backgroundColor: def.color,
            boxShadow: def.glowColor
              ? `0 0 4px ${def.glowColor}`
              : undefined,
          }}
        />
      );
    }

    case "profileBorder": {
      const def = PROFILE_BORDERS[reward.id];
      return (
        <span
          className={`inline-block w-5 h-3.5 rounded-sm bg-surface ring-1 ring-white/10 ${
            def?.className ?? ""
          }`}
        />
      );
    }

    case "typingTheme": {
      const def = TYPING_THEMES[reward.id];
      if (!def) return null;
      return (
        <span className="flex gap-[2px]">
          {def.palette.map((c, i) => (
            <span
              key={i}
              className="w-2 h-2 rounded-full inline-block"
              style={{ backgroundColor: c }}
            />
          ))}
        </span>
      );
    }

    default:
      return null;
  }
}
