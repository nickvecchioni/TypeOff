"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import type { RaceResult } from "@/hooks/useRace";
import type { RankTier, WpmSample } from "@typeoff/shared";
import {
  getRankInfo,
  ACHIEVEMENT_MAP,
  CHALLENGE_MAP,
  getXpLevel,
  COSMETIC_REWARDS,
  BADGE_EMOJIS,
  TITLE_TEXTS,
  NAME_COLORS,
  NAME_EFFECT_CLASSES,
  TYPING_THEMES,
  CURSOR_STYLES,
  EMOTE_KEYS,
} from "@typeoff/shared";
import type { EmoteKey } from "@typeoff/shared";
import { WpmChart } from "@/components/typing/WpmChart";
import type { AchievementRarity, PartyState } from "@typeoff/shared";
import { RankBadge } from "@/components/RankBadge";
import { CosmeticName } from "@/components/CosmeticName";
import { CosmeticBadge } from "@/components/CosmeticBadge";
import type { EmoteEvent } from "./FloatingEmote";
import { useSocket } from "@/hooks/useSocket";
import { ShareResultCard } from "@/components/shared/ShareResultCard";

interface RankChange {
  direction: "up" | "down";
  newLabel: string;
  newTier: RankTier;
}

interface RaceResultsProps {
  results: RaceResult[];
  myPlayerId: string | null;
  onRaceAgain: () => void;
  onGoHome: () => void;
  placementRace?: number;
  placementTotal?: number;
  rankChange?: RankChange | null;
  myWpmHistory?: WpmSample[];
  party?: PartyState | null;
  onMarkReady?: () => void;
  raceId?: string | null;
  emotes?: EmoteEvent[];
}

const RARITY_RING: Record<AchievementRarity, string> = {
  common: "ring-white/[0.08]",
  rare: "ring-sky-400/30",
  epic: "ring-purple-400/40",
  legendary: "ring-yellow-400/50",
};

const RARITY_BG: Record<AchievementRarity, string> = {
  common: "bg-surface/50",
  rare: "bg-sky-400/[0.03]",
  epic: "bg-purple-400/[0.03]",
  legendary: "bg-yellow-400/[0.05]",
};

const RARITY_GLOW: Record<AchievementRarity, string> = {
  common: "",
  rare: "shadow-[0_0_16px_rgba(56,189,248,0.10)]",
  epic: "shadow-[0_0_16px_rgba(192,132,252,0.10)]",
  legendary: "shadow-[0_0_22px_rgba(250,204,21,0.14)]",
};

const RARITY_LABEL: Record<AchievementRarity, string> = {
  common: "text-muted/55",
  rare: "text-sky-400/70",
  epic: "text-purple-400/70",
  legendary: "text-yellow-400/80",
};

const PLACEMENT_STYLE: Record<number, { bar: string; text: string; leftBorder: string }> = {
  1: { bar: "bg-rank-gold", text: "text-rank-gold", leftBorder: "border-l-rank-gold/40" },
  2: { bar: "bg-rank-silver", text: "text-rank-silver", leftBorder: "border-l-rank-silver/30" },
  3: { bar: "bg-rank-bronze", text: "text-rank-bronze", leftBorder: "border-l-rank-bronze/30" },
};

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/* ── Animated ELO counter ─────────────────────────────────── */

function AnimatedElo({
  oldElo,
  newElo,
  change,
  rankChange,
}: {
  oldElo: number;
  newElo: number;
  change: number;
  rankChange?: RankChange | null;
}) {
  const [displayElo, setDisplayElo] = useState(oldElo);
  const [showChange, setShowChange] = useState(false);
  const [rankPulse, setRankPulse] = useState(false);
  const [glowVisible, setGlowVisible] = useState(false);
  const rafRef = useRef<number>(0);
  const prevLabelRef = useRef(getRankInfo(oldElo).label);

  useEffect(() => {
    const delay = setTimeout(() => {
      setShowChange(true);
      const startTime = performance.now();
      const duration = 1400;

      const animate = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const currentElo = Math.round(oldElo + (newElo - oldElo) * eased);

        const currentLabel = getRankInfo(currentElo).label;
        if (currentLabel !== prevLabelRef.current) {
          prevLabelRef.current = currentLabel;
          setRankPulse(true);
          setGlowVisible(true);
        }

        setDisplayElo(currentElo);
        if (progress < 1) {
          rafRef.current = requestAnimationFrame(animate);
        }
      };

      rafRef.current = requestAnimationFrame(animate);
    }, 500);

    return () => {
      clearTimeout(delay);
      cancelAnimationFrame(rafRef.current);
    };
  }, [oldElo, newElo]);

  useEffect(() => {
    if (!glowVisible) return;
    const timer = setTimeout(() => setGlowVisible(false), 500);
    return () => clearTimeout(timer);
  }, [glowVisible]);

  const rankInfo = getRankInfo(displayElo);

  return (
    <div>
      <div className="flex items-baseline gap-2.5">
        <span className="text-3xl sm:text-4xl font-black text-text tabular-nums leading-none">
          {displayElo}
        </span>
        <span
          className={`text-xl font-black tabular-nums transition-opacity duration-300 leading-none ${
            showChange ? "opacity-100" : "opacity-0"
          } ${change > 0 ? "text-correct" : change < 0 ? "text-error" : "text-muted"}`}
        >
          {change > 0 ? "+" : ""}
          {change}
        </span>
      </div>
      <div className="flex items-center gap-1.5 mt-1">
        {rankPulse && rankChange && (
          <span
            className={`text-[10px] font-bold ${
              rankChange.direction === "up" ? "text-correct" : "text-error"
            }`}
            style={{ animation: "fade-in 0.3s ease-out" }}
          >
            {rankChange.direction === "up" ? "▲" : "▼"}
          </span>
        )}
        <span
          className="transition-[filter] duration-1000"
          style={
            rankPulse
              ? {
                  filter: glowVisible
                    ? `drop-shadow(0 0 6px currentColor)`
                    : "drop-shadow(0 0 0px transparent)",
                  animation: "rank-pulse 0.6s ease-out",
                }
              : {}
          }
        >
          <RankBadge tier={rankInfo.tier} elo={displayElo} showElo={false} size="xs" />
        </span>
      </div>
    </div>
  );
}

/* ── Animated XP panel ────────────────────────────────────── */

function AnimatedXpPanel({
  xp,
  isPro = false,
}: {
  xp: {
    xpEarned: number;
    totalXp: number;
    level: number;
    levelUp: boolean;
    newRewards: Array<{ level: number; type: string; id: string; name: string; value: string }>;
  };
  isPro?: boolean;
}) {
  const [displayXp, setDisplayXp] = useState(0);
  const [barPct, setBarPct] = useState(0);
  const [levelUpVisible, setLevelUpVisible] = useState(false);
  const [levelUpGlow, setLevelUpGlow] = useState(false);
  const [showRewards, setShowRewards] = useState(false);
  const [animStarted, setAnimStarted] = useState(false);
  const [isPhase3, setIsPhase3] = useState(false);
  const rafRef = useRef<number>(0);
  const phaseRef = useRef(0);

  const prevTotalXp = xp.totalXp - xp.xpEarned;
  const prevInfo = getXpLevel(prevTotalXp);
  const curInfo = getXpLevel(xp.totalXp);
  const prevPct = (prevInfo.currentXp / prevInfo.nextLevelXp) * 100;
  const finalPct = (curInfo.currentXp / curInfo.nextLevelXp) * 100;

  const nextProReward = !isPro
    ? COSMETIC_REWARDS.find((r) => r.level > xp.level && r.proOnly === true)
    : undefined;

  useEffect(() => {
    setBarPct(prevPct);

    const delay = setTimeout(() => {
      setAnimStarted(true);
      const startTime = performance.now();
      const duration = xp.levelUp ? 1800 : 1200;

      const animate = (now: number) => {
        const elapsed = now - startTime;
        const t = Math.min(elapsed / duration, 1);
        const ease = 1 - Math.pow(1 - t, 3);

        setDisplayXp(Math.round(xp.xpEarned * ease));

        if (xp.levelUp) {
          if (t < 0.45) {
            const p = t / 0.45;
            const pe = 1 - Math.pow(1 - p, 3);
            setBarPct(prevPct + (100 - prevPct) * pe);
          } else if (t < 0.55) {
            setBarPct(100);
            if (phaseRef.current < 2) {
              phaseRef.current = 2;
              setLevelUpVisible(true);
              setLevelUpGlow(true);
            }
          } else {
            if (phaseRef.current < 3) {
              phaseRef.current = 3;
              setIsPhase3(true);
            }
            const p = (t - 0.55) / 0.45;
            const pe = 1 - Math.pow(1 - p, 3);
            setBarPct(finalPct * pe);
          }
        } else {
          setBarPct(prevPct + (finalPct - prevPct) * ease);
        }

        if (t < 1) {
          rafRef.current = requestAnimationFrame(animate);
        } else if (xp.newRewards.length > 0) {
          setTimeout(() => setShowRewards(true), 200);
        }
      };

      rafRef.current = requestAnimationFrame(animate);
    }, 400);

    return () => {
      clearTimeout(delay);
      cancelAnimationFrame(rafRef.current);
    };
  }, [prevPct, finalPct, xp.levelUp, xp.xpEarned, xp.newRewards.length]);

  useEffect(() => {
    if (!levelUpGlow) return;
    const t = setTimeout(() => setLevelUpGlow(false), 800);
    return () => clearTimeout(t);
  }, [levelUpGlow]);

  const displayLevel = xp.levelUp && !levelUpVisible ? xp.level - 1 : xp.level;

  const nextReward = COSMETIC_REWARDS.find((r) => r.level === xp.level + 1);
  const proLocked = nextReward?.proOnly && !isPro;

  const rewardIcon = (() => {
    if (!nextReward) return "✨";
    switch (nextReward.type) {
      case "badge": return nextReward.value;
      case "nameColor": return "🎨";
      case "title": return "🏷️";
      case "cursorStyle": return "🔲";
      case "profileBorder": return "🖼️";
      case "typingTheme": return "🎨";
      default: return "✨";
    }
  })();

  return (
    <div className="rounded-xl bg-surface/30 ring-1 ring-white/[0.04] overflow-hidden">
      <div className="h-px bg-gradient-to-r from-transparent via-accent/20 to-transparent" />
      <div className="px-3 py-2.5 sm:px-4 sm:py-3 flex flex-col gap-2.5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-[10px] font-bold text-accent/80 uppercase tracking-wider">Level</h3>
          <span
            className={`text-sm font-black tabular-nums transition-all duration-500 ${
              animStarted ? "opacity-100 text-accent" : "opacity-0"
            }`}
          >
            +{displayXp} XP
          </span>
        </div>

        {/* Level number + XP bar */}
        <div
          className={`rounded-lg px-3 py-2 ring-1 transition-all duration-500 flex items-center gap-4 ${
            levelUpGlow ? "ring-accent/40 bg-surface/60" : "ring-accent/10 bg-surface/40"
          }`}
        >
          {/* Big level number */}
          <div className="shrink-0 w-10 text-center">
            <div className="text-[9px] font-black text-muted/60 uppercase tracking-widest leading-none mb-0.5">LV.</div>
            <div
              className={`text-3xl font-black tabular-nums leading-none transition-colors duration-300 ${
                levelUpGlow ? "text-accent" : "text-text"
              }`}
            >
              {displayLevel}
            </div>
            {levelUpVisible && (
              <div className="text-correct text-[9px] font-black mt-0.5" style={{ animation: "fade-in 0.3s ease-out" }}>
                ▲ UP!
              </div>
            )}
          </div>

          {/* XP bar + text */}
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline justify-between mb-1.5">
              <span className="text-[11px] font-bold text-accent tabular-nums">
                {curInfo.currentXp.toLocaleString()}
                <span className="text-muted/60 font-normal"> / {curInfo.nextLevelXp.toLocaleString()} XP</span>
              </span>
            </div>
            <div
              className={`h-1.5 rounded-full bg-surface overflow-hidden transition-shadow duration-500 ${
                levelUpGlow ? "shadow-[0_0_8px_rgba(77,158,255,0.4)]" : ""
              }`}
            >
              {isPhase3 ? (
                <div
                  className={`h-full rounded-full bg-accent ${levelUpGlow ? "shadow-[0_0_6px_rgba(77,158,255,0.6)]" : ""}`}
                  style={{ width: `${barPct}%` }}
                />
              ) : (
                <div className="h-full flex">
                  {/* Previous XP (dim) */}
                  <div className="h-full bg-accent/35 shrink-0" style={{ width: `${prevPct}%` }} />
                  {/* Gained XP (bright, animates) */}
                  <div
                    className={`h-full bg-accent shrink-0 ${levelUpGlow ? "shadow-[0_0_6px_rgba(77,158,255,0.6)]" : ""}`}
                    style={{ width: `${Math.max(0, barPct - prevPct)}%` }}
                  />
                </div>
              )}
            </div>
            <div className="text-[10px] text-muted/55 mt-1 tabular-nums">
              {(curInfo.nextLevelXp - curInfo.currentXp).toLocaleString()} XP to level {xp.level + 1}
            </div>
          </div>
        </div>

        {/* New rewards */}
        {showRewards && xp.newRewards.length > 0 && (
          <div style={{ animation: "slide-up 0.4s ease-out" }}>
            <p className="text-[9px] font-bold text-accent/55 uppercase tracking-widest mb-1.5">
              {xp.newRewards.length === 1 ? "Cosmetic Unlocked" : `${xp.newRewards.length} Cosmetics Unlocked`}
            </p>
            <div className={`grid gap-1.5 ${xp.newRewards.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
              {xp.newRewards.map((r, i) => (
                <RewardUnlockCard key={r.id} reward={r} delay={i * 80} />
              ))}
            </div>
            <Link
              href="/cosmetics"
              className="text-[9px] text-accent/40 hover:text-accent/70 transition-colors mt-2 block text-right"
            >
              Equip in Items →
            </Link>
          </div>
        )}

        {/* Next unlock teaser */}
        {(nextReward || nextProReward) && (
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-white/[0.02] ring-1 ring-white/[0.04]">
            <span className={`text-base shrink-0 leading-none ${proLocked ? "opacity-30" : ""}`}>
              {nextReward ? rewardIcon : "🔒"}
            </span>
            <div className="min-w-0 flex-1">
              {nextReward ? (
                <>
                  <div className="text-[11px] font-semibold text-text/80 truncate leading-none mb-0.5">
                    {nextReward.name}
                  </div>
                  <div className="text-[10px] text-muted/60 leading-none">
                    unlocks at level {nextReward.level}
                  </div>
                </>
              ) : nextProReward ? (
                <>
                  <div className="text-[11px] font-semibold text-accent/70 truncate leading-none mb-0.5">
                    {nextProReward.name}
                  </div>
                  <div className="text-[10px] text-muted/60 leading-none">
                    Pro-locked · level {nextProReward.level}
                  </div>
                </>
              ) : null}
            </div>
            {proLocked && (
              <Link
                href="/pro"
                className="text-[8px] font-black tracking-wider text-accent bg-accent/10 ring-1 ring-accent/30 px-1.5 py-0.5 rounded shrink-0 leading-none hover:bg-accent/20 transition-colors"
              >
                PRO
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Reward unlock cards ──────────────────────────────────── */

type RawReward = { level: number; type: string; id: string; name: string; value: string };

function RewardUnlockCard({ reward, delay }: { reward: RawReward; delay: number }) {
  const fullReward = COSMETIC_REWARDS.find((r) => r.id === reward.id);
  return (
    <div
      className="flex items-center gap-2.5 rounded-lg px-3 py-2 bg-accent/[0.06] ring-1 ring-accent/20"
      style={{ animation: `slide-up 0.35s ease-out ${delay}ms both` }}
    >
      <div className="shrink-0 w-8 h-8 flex items-center justify-center bg-surface/50 rounded-md">
        <RewardVisual reward={reward} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-bold text-text leading-tight truncate">{reward.name}</span>
          {fullReward?.proOnly && (
            <span className="text-[8px] font-black text-accent bg-accent/[0.08] ring-1 ring-accent/20 px-1 py-px rounded uppercase tracking-wider leading-none shrink-0">
              PRO
            </span>
          )}
        </div>
        <span className="text-[9px] text-correct/70 font-bold uppercase tracking-wider">✦ Unlocked</span>
      </div>
    </div>
  );
}

function RewardVisual({ reward }: { reward: RawReward }) {
  switch (reward.type) {
    case "badge":
      return <span className="text-xl leading-none">{BADGE_EMOJIS[reward.id] ?? reward.value}</span>;
    case "title":
      return <span className="text-[10px] text-accent/80 font-bold leading-none">{TITLE_TEXTS[reward.id] ?? reward.value}</span>;
    case "nameColor": {
      const hex = NAME_COLORS[reward.id] ?? reward.value;
      return <span className="w-4 h-4 rounded-full ring-1 ring-white/10" style={{ backgroundColor: hex }} />;
    }
    case "nameEffect": {
      const cls = NAME_EFFECT_CLASSES[reward.id] ?? "";
      return <span className={`text-xs font-bold ${cls || "text-text"}`}>Aa</span>;
    }
    case "typingTheme": {
      const def = TYPING_THEMES[reward.id];
      if (!def) return <span className="text-base">🎨</span>;
      return (
        <span className="flex flex-wrap gap-0.5 w-6">
          {def.palette.slice(0, 4).map((c, i) => (
            <span key={i} className="w-2 h-2 rounded-full" style={{ backgroundColor: c }} />
          ))}
        </span>
      );
    }
    case "cursorStyle": {
      const def = CURSOR_STYLES[reward.id];
      if (!def) return <span className="text-base">🔲</span>;
      return (
        <span
          className="rounded-sm"
          style={{
            width: 2,
            height: 16,
            backgroundColor: def.color,
            boxShadow: def.glowColor ? `0 0 8px ${def.glowColor}` : undefined,
          }}
        />
      );
    }
    case "profileBorder":
      return <span className="text-base">🖼️</span>;
    default:
      return <span className="text-base">✨</span>;
  }
}

/* ── Preset chat feed ─────────────────────────────────────── */

interface ChatMessage {
  id: string;
  playerName: string;
  emote: EmoteKey;
  timestamp: number;
}

function PresetChatFeed({ emotes }: { emotes: EmoteEvent[] }) {
  const { emit } = useSocket();
  const [cooldown, setCooldown] = useState(false);
  const cooldownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const feedRef = useRef<HTMLDivElement>(null);

  const messages: ChatMessage[] = emotes.map((e) => ({
    id: e.id,
    playerName: e.playerName,
    emote: e.emote,
    timestamp: e.receivedAt,
  }));

  useEffect(() => {
    return () => {
      if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current);
    };
  }, []);

  const sendEmote = useCallback(async (emote: EmoteKey) => {
    if (cooldown) return;
    setCooldown(true);

    try {
      const res = await fetch("/api/ws-token");
      if (res.ok) {
        const { token } = await res.json();
        emit("sendRaceEmote", { emote, token });
      }
    } catch { /* ignore */ }

    cooldownTimerRef.current = setTimeout(() => setCooldown(false), 2000);
  }, [cooldown, emit]);

  // Number key shortcuts: 1–6 map to emotes
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
    <div className="border-t border-white/[0.04]">
      {/* Chat feed */}
      <div
        ref={feedRef}
        className="h-[5.5rem] overflow-y-auto px-3 sm:px-4 py-1.5 space-y-0.5 scrollbar-thin"
      >
        {messages.length === 0 ? (
          <p className="text-[10px] text-muted/40 italic py-1">No messages yet</p>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className="text-xs flex items-baseline gap-1.5 leading-relaxed">
              <span className="font-semibold text-text/70 shrink-0">{msg.playerName}</span>
              <span className="text-muted/50">:</span>
              <span className="text-text/90">{msg.emote}</span>
            </div>
          ))
        )}
      </div>

      {/* Preset buttons */}
      <div className="flex items-center gap-1 px-3 sm:px-4 py-1.5 border-t border-white/[0.03] flex-wrap">
        {EMOTE_KEYS.map((emote, idx) => (
          <button
            key={emote}
            onClick={() => sendEmote(emote)}
            disabled={cooldown}
            className="text-xs px-2 py-1 rounded bg-surface/60 ring-1 ring-white/[0.06] text-muted hover:text-text hover:ring-accent/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
          >
            <span className="text-[8px] text-muted/40 tabular-nums">{idx + 1}</span>
            {emote}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── Pro upsell panel ─────────────────────────────────────── */

function ProPanel({ level, xpEarned }: { level: number; xpEarned: number }) {
  const proCosmetics = COSMETIC_REWARDS.filter((r) => r.proOnly === true).length;
  const missedXp = Math.floor(xpEarned * 0.5);

  return (
    <div className="rounded-xl overflow-hidden ring-1 ring-accent/15 bg-accent/[0.02]">
      <div className="h-1 bg-gradient-to-r from-accent/40 via-accent/60 to-accent/40" />
      <div className="px-3 py-3 sm:px-4 sm:py-3.5 flex flex-col gap-2.5">
        {/* Header */}
        <span className="text-[9px] font-black tracking-[0.15em] text-accent bg-accent/10 ring-1 ring-accent/25 rounded px-1.5 py-0.5 leading-none self-start">
          PRO
        </span>

        {/* Missed XP callout */}
        {missedXp > 0 && (
          <div className="rounded-lg bg-accent/[0.06] ring-1 ring-accent/15 px-3 py-2">
            <div className="text-xs text-text/80">
              You missed out on{" "}
              <span className="font-bold text-accent tabular-nums">+{missedXp} bonus XP</span>
              <span className="text-muted/60 ml-1">(1.5x multiplier)</span>
            </div>
          </div>
        )}

        {/* Feature list */}
        <div className="space-y-1.5">
          {[
            { icon: "🎯", label: "Smart Practice for weak keys" },
            { icon: "📊", label: "Advanced analytics & ELO trends" },
            { icon: "🔄", label: "Unlimited race replays" },
            { icon: "🎨", label: `${proCosmetics} exclusive cosmetics` },
          ].map(({ icon, label }) => (
            <div key={label} className="flex items-center gap-2 text-[11px] text-text/55">
              <span className="shrink-0">{icon}</span>
              <span>{label}</span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <Link
          href="/pro"
          className="w-full rounded-lg bg-accent/10 ring-1 ring-accent/30 text-accent text-xs font-bold px-3 py-2 hover:bg-accent/20 transition-colors text-center leading-none"
        >
          Upgrade to Pro — $4.99/mo
        </Link>
        <p className="text-[9px] text-muted/40 text-center -mt-1">cancel anytime</p>
      </div>
    </div>
  );
}

/* ── Main component ───────────────────────────────────────── */

export function RaceResults({
  results,
  myPlayerId,
  onRaceAgain,
  onGoHome,
  placementRace,
  placementTotal,
  rankChange,
  myWpmHistory,
  party,
  onMarkReady,
  raceId,
  emotes = [],
}: RaceResultsProps) {
  const { data: session } = useSession();
  const isPro = session?.user?.isPro ?? false;

  const isPlacement = placementRace != null && placementTotal != null;
  const myResult = results.find((r) => r.playerId === myPlayerId);

  const inParty = party != null && party.members.length >= 2;
  const isLeader = party?.leaderId === myPlayerId;
  const amReady = myPlayerId ? party?.readyState[myPlayerId] ?? false : false;
  const allMembersReady =
    inParty && isLeader
      ? party!.members.filter((m) => m.userId !== myPlayerId).every((m) => party!.readyState[m.userId])
      : true;

  const tabPressedRef = useRef(false);

  // Tab+Enter shortcut (race again / mark ready)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || tag === "BUTTON" || tag === "A") return;

      if (e.key === "Tab") {
        e.preventDefault();
        tabPressedRef.current = true;
        return;
      }
      if (e.key === "Enter" && tabPressedRef.current) {
        e.preventDefault();
        tabPressedRef.current = false;
        if (inParty && !isLeader) {
          if (!amReady) onMarkReady?.();
        } else if (allMembersReady) {
          onRaceAgain();
        }
        return;
      }
      tabPressedRef.current = false;
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onRaceAgain, inParty, isLeader, amReady, allMembersReady, onMarkReady]);

  const mobileCols = isPlacement
    ? "grid-cols-[2rem_1fr_5rem]"
    : "grid-cols-[2rem_1fr_4rem_3.5rem]";
  const desktopCols = isPlacement
    ? ""
    : "sm:grid-cols-[2rem_1fr_auto_4rem_3.5rem_3.5rem]";
  const tableCols = `${mobileCols} ${desktopCols}`;

  const hasAchievements = myResult?.newAchievements && myResult.newAchievements.length > 0;
  const hasChallenges =
    myResult?.challengeProgress && myResult.challengeProgress.some((c) => c.progress > 0);
  const hasXpProgress = myResult?.xpProgress != null;
  const hasProgress = hasChallenges || hasXpProgress;

  const hasElo = !isPlacement && myResult?.eloChange != null && myResult?.elo != null;
  // Always reserve 4 columns for non-placement races to prevent layout shift when ELO arrives
  const statCols = isPlacement
    ? "grid-cols-2 sm:grid-cols-3"
    : "grid-cols-2 sm:grid-cols-4";

  const pStyle = myResult
    ? PLACEMENT_STYLE[myResult.placement] ?? { bar: "bg-muted/30", text: "text-muted", leftBorder: "" }
    : null;

  const currentLevel = myResult?.xpProgress?.level ?? 0;
  const showProPanel = !isPro && !isPlacement && myResult != null && session?.user != null;

  return (
    <div className="flex flex-col gap-1.5 w-full flex-1 min-h-0">

      {/* ── Hero stats ─────────────────────────────────────── */}
      {myResult ? (
        <div
          className="shrink-0 rounded-xl overflow-hidden ring-1 ring-white/[0.04] animate-fade-in"
        >
          {/* Placement-colored top bar */}
          <div className={`h-0.5 ${pStyle!.bar} opacity-60`} />
          <div className={`grid gap-px ${statCols}`}>

            {/* Placement */}
            <div className="bg-surface/40 px-4 py-2.5">
              <div className={`text-3xl sm:text-4xl font-black tabular-nums leading-none ${pStyle!.text}`}>
                {ordinal(myResult.placement)}
              </div>
              <div className="text-[10px] text-muted/65 mt-1 uppercase tracking-wide">
                of {results.length}
              </div>
            </div>

            {/* WPM */}
            <div className="bg-surface/40 px-3 py-2.5 sm:px-4 flex flex-col justify-end">
              <div className="text-3xl sm:text-4xl font-black text-text tabular-nums leading-none">
                {Math.floor(myResult.wpm)}
                <span className="text-lg opacity-50">
                  .{(myResult.wpm % 1).toFixed(2).slice(2)}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <div className="text-[10px] text-muted/60 uppercase tracking-wide">wpm</div>
                {myResult.rawWpm > 0 && Math.floor(myResult.rawWpm) !== Math.floor(myResult.wpm) && (
                  <div className="text-[10px] text-muted/65 tabular-nums">
                    {Math.floor(myResult.rawWpm)} raw
                  </div>
                )}
              </div>
            </div>

            {/* Accuracy */}
            {!isPlacement && (
              <div className="bg-surface/40 px-3 py-2.5 sm:px-4 flex flex-col justify-end">
                <div className="text-3xl sm:text-4xl font-black text-text tabular-nums leading-none">
                  {Math.floor(myResult.accuracy)}
                  <span className="text-lg opacity-50">
                    .{((myResult.accuracy % 1) * 10).toFixed(0)}%
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <div className="text-[10px] text-muted/60 uppercase tracking-wide">accuracy</div>
                  {myResult.misstypedChars != null && myResult.misstypedChars > 0 && (
                    <div className="text-[10px] text-error/50 tabular-nums">
                      {myResult.misstypedChars} mistakes
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Placement progress dots */}
            {isPlacement ? (
              <div className="bg-surface/40 p-3 sm:p-4 col-span-2 sm:col-span-1">
                <div className="text-sm font-bold text-accent">
                  Race {placementRace} / {placementTotal}
                </div>
                <div className="flex items-center gap-1.5 mt-2">
                  {Array.from({ length: placementTotal! }, (_, i) => (
                    <div
                      key={i}
                      className={`w-2 h-2 rounded-full ${i < placementRace! ? "bg-accent" : "bg-surface-bright"}`}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-surface/40 px-3 py-2.5 sm:px-4">
                {hasElo ? (
                  <AnimatedElo
                    oldElo={myResult.elo! - myResult.eloChange!}
                    newElo={myResult.elo!}
                    change={myResult.eloChange!}
                    rankChange={rankChange}
                  />
                ) : !isPlacement && myResult?.elo != null ? (
                  /* Show static ELO + rank badge while waiting for enriched data
                     (same visual structure as AnimatedElo to prevent layout shift) */
                  <div>
                    <div className="flex items-baseline gap-2.5">
                      <span className="text-3xl sm:text-4xl font-black text-text tabular-nums leading-none">
                        {myResult.elo}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1">
                      <RankBadge tier={getRankInfo(myResult.elo).tier} elo={myResult.elo} showElo={false} size="xs" />
                    </div>
                  </div>
                ) : (
                  <div className="h-[52px]" />
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        <h2 className="text-lg font-bold text-text animate-fade-in">Results</h2>
      )}

      {/* ── TWO-COLUMN GRID ─────────────────────────────── */}
      <div
        className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 w-full flex-1 min-h-0 overflow-hidden"
        style={{ animation: "fade-in 0.3s ease-out 0.05s both" }}
      >
        {/* ── LEFT COLUMN: Standings + Chat + Actions + Achievements ── */}
        <div className="flex flex-col gap-1.5 min-h-0">
          {/* Standings table + chat feed */}
          <div className="rounded-xl bg-surface/30 ring-1 ring-white/[0.04] overflow-hidden">
            {/* Header */}
            <div
              className={`grid text-muted/60 text-[10px] uppercase tracking-widest px-3 sm:px-4 py-1.5 border-b border-white/[0.05] ${tableCols}`}
            >
              <span className="font-medium">#</span>
              <span className="font-medium">Name</span>
              {!isPlacement && <span className="font-medium hidden sm:block">Rank</span>}
              <span className="font-medium text-right">WPM</span>
              {!isPlacement && <span className="font-medium text-right hidden sm:block">Acc</span>}
              {!isPlacement && <span className="font-medium text-right">ELO</span>}
            </div>

            {/* Rows */}
            {results.map((result) => {
              const isMe = result.playerId === myPlayerId;
              const isBot = result.playerId.startsWith("bot_");
              const isGuest = result.playerId.startsWith("guest_") || isBot;
              const displayName = result.username ?? result.name;
              const showStreak =
                result.placement === 1 && result.streak != null && result.streak >= 3;
              const rInfo = !isGuest && result.elo != null ? getRankInfo(result.elo) : null;
              const rowPlacementStyle = PLACEMENT_STYLE[result.placement];

              return (
                <div
                  key={result.playerId}
                  className={`relative grid items-center px-3 sm:px-4 py-1.5 border-b border-white/[0.03] last:border-0 transition-colors border-l-2 text-sm ${tableCols} ${
                    rowPlacementStyle ? rowPlacementStyle.leftBorder : "border-l-transparent"
                  } ${
                    isMe
                      ? "bg-accent/[0.05] text-accent"
                      : isBot
                      ? "text-text/60"
                      : "text-text hover:bg-white/[0.015]"
                  }`}
                >
                  <span className="font-bold tabular-nums">{result.placement}</span>

                  <span className="flex items-center gap-2 min-w-0 pr-3">
                    {!isBot && <CosmeticBadge badge={result.activeBadge} />}
                    {result.username && !isGuest ? (
                      <Link
                        href={`/profile/${result.username}`}
                        className="hover:text-accent transition-colors truncate"
                      >
                        <CosmeticName nameColor={result.activeNameColor} nameEffect={result.activeNameEffect}>
                          {displayName}
                        </CosmeticName>
                      </Link>
                    ) : (
                      <span className="truncate">{displayName}</span>
                    )}
                    {result.level != null && !isBot && (
                      <span className="text-[10px] font-bold text-accent/70 tabular-nums bg-accent/[0.08] px-1.5 py-px rounded shrink-0">
                        {result.level}
                      </span>
                    )}
                    {isBot && (
                      <span className="text-[10px] text-muted/70 bg-white/[0.06] rounded px-1.5 py-0.5 shrink-0 uppercase tracking-wider font-semibold">
                        Bot
                      </span>
                    )}
                    {showStreak && (
                      <span className="text-orange-400 flex items-center gap-0.5 shrink-0" title={`${result.streak} win streak`}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="shrink-0">
                          <path d="M12 23c-3.866 0-7-2.686-7-6 0-1.665.753-3.488 2.127-5.244.883-1.128 1.873-2.1 2.873-3.006V2l4.386 4.506c.953.979 1.893 2.09 2.614 3.25C18.36 11.715 19 13.578 19 15.5 19 19.642 16.09 23 12 23z" />
                        </svg>
                        <span className="text-xs font-bold tabular-nums">{result.streak}</span>
                      </span>
                    )}
                  </span>

                  {!isPlacement && (
                    <span className="hidden sm:block">
                      {rInfo ? (
                        <RankBadge tier={rInfo.tier} elo={result.elo!} showElo={false} size="xs" />
                      ) : (
                        <span className="text-muted/60 text-sm">—</span>
                      )}
                    </span>
                  )}

                  <span className="text-right tabular-nums whitespace-nowrap">
                    {Math.floor(result.wpm)}
                    <span className="text-[0.7em] opacity-50">.{(result.wpm % 1).toFixed(2).slice(2)}</span>
                  </span>

                  {!isPlacement && (
                    <span className="text-right tabular-nums whitespace-nowrap hidden sm:block">
                      {Math.floor(result.accuracy)}
                      <span className="text-[0.7em] opacity-50">.{((result.accuracy % 1) * 10).toFixed(0)}%</span>
                    </span>
                  )}

                  {!isPlacement && (
                    <span className="text-right tabular-nums whitespace-nowrap">
                      {result.eloChange != null ? (
                        <span
                          className={`font-semibold ${
                            result.eloChange > 0 ? "text-correct" : result.eloChange < 0 ? "text-error" : "text-muted"
                          }`}
                        >
                          {result.eloChange > 0 ? "+" : ""}
                          {result.eloChange}
                        </span>
                      ) : (
                        <span className="text-muted/60">—</span>
                      )}
                    </span>
                  )}
                </div>
              );
            })}

            {/* Preset chat feed (replaces emote bar) */}
            {!isPlacement && <PresetChatFeed emotes={emotes} />}
          </div>

          {/* WPM Chart — flex-1 so action buttons align with right column bottom */}
          {myWpmHistory && myWpmHistory.length >= 2 && (
            <div className="flex-1 min-h-[160px] rounded-xl bg-surface/30 ring-1 ring-white/[0.04] px-3 pt-2.5 pb-1.5 flex flex-col">
              <div className="text-[10px] font-bold text-muted/50 uppercase tracking-widest mb-1.5">WPM over time</div>
              <div className="flex-1 min-h-0">
                <WpmChart samples={myWpmHistory} />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col items-center gap-1.5 w-full min-w-0 px-px">
            {/* Party ready state */}
            {inParty && !isPlacement && (
              <div className="flex items-center justify-center gap-3 flex-wrap">
                {party!.members.map((m) => {
                  const ready = party!.readyState[m.userId] ?? false;
                  const isMe = m.userId === myPlayerId;
                  return (
                    <div key={m.userId} className="flex items-center gap-1.5 text-xs">
                      <span className={`w-2 h-2 rounded-full transition-colors ${ready ? "bg-correct" : "bg-white/[0.12]"}`} />
                      <span className={isMe ? "text-accent" : "text-muted"}>{m.name}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {inParty && !isLeader && !isPlacement ? (
              <button
                onClick={() => !amReady && onMarkReady?.()}
                disabled={amReady}
                className={`w-full rounded-lg py-2.5 text-sm font-medium transition-all ${
                  amReady
                    ? "bg-correct/[0.08] ring-1 ring-correct/20 text-correct cursor-default"
                    : "bg-accent/[0.06] ring-1 ring-accent/20 text-accent hover:bg-accent hover:text-bg hover:ring-accent"
                }`}
              >
                {amReady ? "Ready!" : "Ready"}
              </button>
            ) : (
              <>
                <button
                  onClick={() => onRaceAgain()}
                  disabled={inParty && !allMembersReady}
                  className="w-full rounded-lg bg-accent/[0.06] ring-1 ring-accent/20 text-accent py-2.5 text-sm font-medium hover:bg-accent hover:text-bg hover:ring-accent transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-accent/[0.06] disabled:hover:text-accent disabled:hover:ring-accent/20 flex flex-col items-center gap-1"
                >
                  <span>
                    {isPlacement ? "Next Placement" : "Race Again"}
                    <span className="inline-block w-[2px] h-[1em] bg-current animate-blink ml-0.5 translate-y-px" />
                  </span>
                  {!inParty && (
                    <span className="text-[9px] font-normal text-accent/40 flex items-center gap-1 group-hover:text-bg/40">
                      <kbd className="inline-flex items-center px-1 py-px rounded bg-white/[0.04] ring-1 ring-white/[0.07] text-[9px] font-medium">Tab</kbd>
                      {" + "}
                      <kbd className="inline-flex items-center px-1 py-px rounded bg-white/[0.04] ring-1 ring-white/[0.07] text-[9px] font-medium">Enter ↵</kbd>
                    </span>
                  )}
                </button>
                {inParty && !allMembersReady && (
                  <span className="text-[10px] text-muted/60">
                    waiting for party to ready up...
                  </span>
                )}
              </>
            )}

            {/* Secondary actions row — icon buttons with tooltips */}
            <div className="flex items-center gap-1">
              {/* Go Home */}
              <div className="relative group/tt">
                <button
                  onClick={onGoHome}
                  className="p-2 text-muted/50 hover:text-muted transition-colors rounded"
                  aria-label="Go Home"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                    <polyline points="9 22 9 12 15 12 15 22" />
                  </svg>
                </button>
                <span className="absolute top-full left-1/2 -translate-x-1/2 mt-1 px-2 py-0.5 rounded bg-surface ring-1 ring-white/[0.08] text-[9px] text-muted/70 whitespace-nowrap opacity-0 group-hover/tt:opacity-100 pointer-events-none transition-opacity duration-150 z-50">
                  Go Home
                </span>
              </div>

              {/* Watch Replay */}
              {raceId && (
                <div className="relative group/tt">
                  <Link
                    href={`/races/${raceId}`}
                    className="p-2 text-muted/50 hover:text-muted transition-colors rounded block"
                    aria-label="Watch Replay"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                  </Link>
                  <span className="absolute top-full left-1/2 -translate-x-1/2 mt-1 px-2 py-0.5 rounded bg-surface ring-1 ring-white/[0.08] text-[9px] text-muted/70 whitespace-nowrap opacity-0 group-hover/tt:opacity-100 pointer-events-none transition-opacity duration-150 z-50">
                    Watch Replay
                  </span>
                </div>
              )}

              {/* Analytics */}
              {!isPlacement && (
                <div className="relative group/tt">
                  <Link
                    href="/analytics"
                    className="p-2 text-muted/50 hover:text-muted transition-colors rounded block"
                    aria-label="Analytics"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="20" x2="18" y2="10" />
                      <line x1="12" y1="20" x2="12" y2="4" />
                      <line x1="6" y1="20" x2="6" y2="14" />
                    </svg>
                  </Link>
                  <span className="absolute top-full left-1/2 -translate-x-1/2 mt-1 px-2 py-0.5 rounded bg-surface ring-1 ring-white/[0.08] text-[9px] text-muted/70 whitespace-nowrap opacity-0 group-hover/tt:opacity-100 pointer-events-none transition-opacity duration-150 z-50">
                    Analytics
                  </span>
                </div>
              )}

              {/* Share */}
              {!isPlacement &&
                myResult != null &&
                myResult.elo != null &&
                myResult.eloChange != null &&
                session?.user?.username && (
                  <ShareResultCard
                    data={{
                      variant: "ranked",
                      wpm: myResult.wpm,
                      accuracy: myResult.accuracy,
                      placement: myResult.placement,
                      totalPlayers: results.length,
                      elo: myResult.elo,
                      eloChange: myResult.eloChange,
                      rankLabel: getRankInfo(myResult.elo).label,
                      rankTier: getRankInfo(myResult.elo).tier,
                      username: session.user.username,
                      date: new Date().toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      }),
                    }}
                  />
                )}
            </div>
          </div>

          {/* Achievements (left column) */}
          {hasAchievements && (
            <div className="flex flex-col gap-1 w-full">
              <h3 className="text-[10px] font-bold text-muted/65 uppercase tracking-widest px-0.5">
                Achievements Unlocked
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {myResult!.newAchievements!.map((id) => {
                  const def = ACHIEVEMENT_MAP.get(id);
                  if (!def) return null;
                  return (
                    <div
                      key={id}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 ring-1 animate-fade-in ${RARITY_BG[def.rarity]} ${RARITY_RING[def.rarity]} ${RARITY_GLOW[def.rarity]}`}
                    >
                      <span className="text-xl shrink-0">{def.icon}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <div className="text-sm font-bold text-text">{def.name}</div>
                          {def.rarity !== "common" && (
                            <span className={`text-[9px] font-black uppercase tracking-wider ${RARITY_LABEL[def.rarity]}`}>
                              {def.rarity}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted/60 truncate mt-0.5">{def.description}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT COLUMN: XP + Challenges + Pro ── */}
        <div className="flex flex-col gap-1.5 min-h-0 overflow-y-auto">
          {/* XP Progress — always reserve space to prevent jitter */}
          {!isPlacement && (
            hasXpProgress ? (
              <AnimatedXpPanel xp={myResult!.xpProgress!} isPro={isPro} />
            ) : (
              /* Skeleton placeholder for XP panel */
              <div className="rounded-xl bg-surface/30 ring-1 ring-white/[0.04] overflow-hidden">
                <div className="h-px bg-gradient-to-r from-transparent via-accent/20 to-transparent" />
                <div className="px-3 py-2.5 sm:px-4 sm:py-3 flex flex-col gap-2.5">
                  <div className="h-3 w-12 rounded bg-white/[0.03] animate-pulse" />
                  <div className="rounded-lg px-3 py-2 ring-1 ring-accent/10 bg-surface/40 flex items-center gap-4">
                    <div className="w-10 h-10 rounded bg-white/[0.03] animate-pulse" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-24 rounded bg-white/[0.03] animate-pulse" />
                      <div className="h-1.5 w-full rounded-full bg-surface" />
                      <div className="h-2 w-20 rounded bg-white/[0.03] animate-pulse" />
                    </div>
                  </div>
                </div>
              </div>
            )
          )}

          {/* Challenges — always reserve space to prevent jitter */}
          {!isPlacement && (
            <div className="rounded-xl bg-surface/30 ring-1 ring-white/[0.04] overflow-hidden px-3 py-2 sm:px-4 sm:py-2.5">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-[10px] font-bold text-muted/65 uppercase tracking-widest">
                  Challenges
                </h3>
                {myResult?.xpEarned != null && myResult.xpEarned > 0 && (
                  <span className="text-xs font-bold text-accent tabular-nums">
                    +{myResult.xpEarned} XP
                  </span>
                )}
              </div>
              {hasChallenges ? (
                <div className="space-y-0.5">
                  {myResult!.challengeProgress!.filter((c) => c.progress > 0).map((cp) => {
                    const def = CHALLENGE_MAP.get(cp.challengeId);
                    if (!def) return null;
                    const progress = Math.min(cp.progress, cp.target);
                    const pct = cp.target > 0 ? (progress / cp.target) * 100 : 0;
                    return (
                      <div key={cp.challengeId} className="flex items-center gap-2 py-1">
                        <span className="text-sm shrink-0">{def.icon}</span>
                        <div className="min-w-0 flex-1">
                          <span className="text-xs font-medium text-text truncate block">
                            {def.name}
                            {cp.completed && <span className="text-correct ml-1.5">✓</span>}
                          </span>
                          <span className="text-[10px] text-muted/65 truncate block">{def.description}</span>
                        </div>
                        <span className="text-[11px] text-muted tabular-nums shrink-0">
                          {progress}/{cp.target}
                        </span>
                        <div className="w-16 h-1 rounded-full bg-surface overflow-hidden shrink-0">
                          <div
                            className={`h-full rounded-full transition-all ${cp.completed ? "bg-correct" : "bg-accent"}`}
                            style={{ width: `${Math.round(pct)}%` }}
                          />
                        </div>
                        {cp.justCompleted && (
                          <span className="text-[10px] font-bold text-correct bg-correct/10 rounded px-1.5 py-0.5 tabular-nums shrink-0">
                            +{cp.xpAwarded} XP
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Skeleton placeholder — reserves space while data loads */
                <div className="space-y-1.5 py-1">
                  <div className="h-3 w-3/4 rounded bg-white/[0.03] animate-pulse" />
                  <div className="h-3 w-1/2 rounded bg-white/[0.03] animate-pulse" />
                </div>
              )}
            </div>
          )}

          {/* Pro upsell card (non-Pro only) */}
          {showProPanel && (
            <ProPanel level={currentLevel} xpEarned={myResult?.xpProgress?.xpEarned ?? 0} />
          )}
        </div>
      </div>


    </div>
  );
}
