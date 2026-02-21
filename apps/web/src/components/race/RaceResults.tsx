"use client";

import React, { useState, useEffect, useRef } from "react";
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
} from "@typeoff/shared";
import { WpmChart } from "@/components/typing/WpmChart";
import type { AchievementRarity, PartyState } from "@typeoff/shared";
import { RankBadge } from "@/components/RankBadge";
import { CosmeticName } from "@/components/CosmeticName";
import { CosmeticBadge } from "@/components/CosmeticBadge";
import { TextLeaderboard } from "@/components/leaderboard/TextLeaderboard";

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
  seed?: number | null;
  mode?: string | null;
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
  common: "text-muted/35",
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
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-black text-text tabular-nums">
          {displayElo}
        </span>
        <span
          className={`text-sm font-bold tabular-nums transition-opacity duration-300 ${
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
            if (phaseRef.current < 3) phaseRef.current = 3;
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

  return (
    <div className="rounded-xl bg-surface/30 ring-1 ring-white/[0.04] overflow-hidden px-3 py-2 sm:px-4 sm:py-2.5">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-xs font-bold text-accent/80 uppercase tracking-wider">Level</h3>
        <span
          className={`text-sm font-black tabular-nums transition-all duration-500 ${
            animStarted ? "opacity-100 text-accent scale-100" : "opacity-0 text-accent scale-75"
          }`}
        >
          +{displayXp} XP
        </span>
      </div>
      <div
        className={`rounded-lg bg-surface/60 px-3 py-2 ring-1 transition-all duration-500 ${
          levelUpGlow ? "ring-accent/40" : "ring-accent/10"
        }`}
      >
        <div className="flex items-center justify-between mb-0.5">
          <span className="text-xs font-bold text-accent">
            Level {displayLevel}
            {levelUpVisible && (
              <span className="text-correct ml-1.5 font-bold" style={{ animation: "fade-in 0.3s ease-out" }}>
                ▲ Level Up!
              </span>
            )}
          </span>
          <span className="text-[11px] text-muted tabular-nums">
            {curInfo.currentXp} / {curInfo.nextLevelXp}
          </span>
        </div>
        <div
          className={`h-1.5 rounded-full bg-surface overflow-hidden transition-shadow duration-500 ${
            levelUpGlow ? "shadow-[0_0_8px_rgba(77,158,255,0.4)]" : ""
          }`}
        >
          <div
            className={`h-full rounded-full bg-accent ${levelUpGlow ? "shadow-[0_0_6px_rgba(77,158,255,0.6)]" : ""}`}
            style={{ width: `${barPct}%` }}
          />
        </div>
        {showRewards && xp.newRewards.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5" style={{ animation: "slide-up 0.4s ease-out" }}>
            {xp.newRewards.map((r) => (
              <span key={r.id} className="text-[10px] font-bold rounded px-2 py-1 bg-accent/[0.08] ring-1 ring-accent/20 text-accent">
                {r.type === "badge" ? r.value : ""} {r.name}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Next Pro-locked reward teaser */}
      {nextProReward && (
        <div className="mt-2 flex items-center justify-between px-0.5">
          <span className="text-[10px] text-muted/40 leading-none">
            🔒 <span className="text-amber-400/60 font-medium">{nextProReward.name}</span>
            {" "}at Level {nextProReward.level} is Pro-locked
          </span>
          <Link
            href="/pro"
            className="text-[9px] font-black tracking-wider text-amber-400 bg-amber-400/10 ring-1 ring-amber-400/20 rounded px-1.5 py-0.5 hover:bg-amber-400/15 transition-colors shrink-0 ml-2"
          >
            PRO
          </Link>
        </div>
      )}
    </div>
  );
}

/* ── Pro upsell panel ─────────────────────────────────────── */

function ProPanel({ level }: { level: number }) {
  const nextProReward = COSMETIC_REWARDS.find((r) => r.level > level && r.proOnly === true);

  return (
    <div className="rounded-xl overflow-hidden ring-1 ring-amber-400/15 bg-amber-400/[0.02]">
      <div className="h-px bg-gradient-to-r from-transparent via-amber-400/30 to-transparent" />
      <div className="px-4 py-3 flex items-start gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2.5">
            <span className="text-[9px] font-black tracking-[0.15em] text-amber-400 bg-amber-400/10 ring-1 ring-amber-400/25 rounded px-1.5 py-0.5 leading-none">
              PRO
            </span>
            <span className="text-xs font-semibold text-text/60">
              Unlock more from every race
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 sm:gap-x-4">
            {[
              { icon: "📊", label: "Key accuracy heatmap", sub: "See every mistype by key" },
              { icon: "🎨", label: "Pro cosmetics & themes", sub: "Exclusive rewards unlocked" },
              { icon: "⚡", label: "Bigram analytics", sub: "Find your slowest sequences" },
            ].map(({ icon, label, sub }) => (
              <div key={label} className="flex items-start gap-1.5">
                <span className="text-sm mt-0.5 shrink-0">{icon}</span>
                <div>
                  <div className="text-[11px] font-medium text-text/65">{label}</div>
                  <div className="text-[10px] text-muted/40 leading-snug">{sub}</div>
                </div>
              </div>
            ))}
          </div>
          {nextProReward && (
            <div className="mt-2 text-[10px] text-muted/40 leading-none">
              🔒 Your next Pro reward:{" "}
              <span className="text-amber-400/65 font-semibold">{nextProReward.name}</span>
              {" "}at Level {nextProReward.level}
            </div>
          )}
        </div>
        <Link
          href="/pro"
          className="shrink-0 rounded-lg bg-amber-400/10 ring-1 ring-amber-400/30 text-amber-400 text-xs font-bold px-3 py-2 hover:bg-amber-400/20 transition-colors whitespace-nowrap leading-none"
        >
          Upgrade →
        </Link>
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
  seed,
  mode,
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

  // Enter key shortcut
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Enter" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || tag === "BUTTON" || tag === "A") return;
        e.preventDefault();
        if (inParty && !isLeader) {
          if (!amReady) onMarkReady?.();
        } else if (allMembersReady) {
          onRaceAgain();
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onRaceAgain, inParty, isLeader, amReady, allMembersReady, onMarkReady]);

  const mobileCols = isPlacement
    ? "grid-cols-[2.5rem_1fr_5rem]"
    : "grid-cols-[2rem_1fr_4rem_3.5rem]";
  const desktopCols = isPlacement
    ? ""
    : "sm:grid-cols-[2.5rem_1fr_7rem_5rem_4rem_4rem]";
  const tableCols = `${mobileCols} ${desktopCols}`;

  const hasAchievements = myResult?.newAchievements && myResult.newAchievements.length > 0;
  const hasChallenges =
    myResult?.challengeProgress && myResult.challengeProgress.some((c) => c.progress > 0);
  const hasXpProgress = myResult?.xpProgress != null;
  const hasProgress = hasChallenges || hasXpProgress;

  const hasElo = !isPlacement && myResult?.eloChange != null && myResult?.elo != null;
  const statCols = isPlacement
    ? "grid-cols-2 sm:grid-cols-3"
    : hasElo
    ? "grid-cols-2 sm:grid-cols-4"
    : "grid-cols-2 sm:grid-cols-3";

  const pStyle = myResult
    ? PLACEMENT_STYLE[myResult.placement] ?? { bar: "bg-muted/30", text: "text-muted", leftBorder: "" }
    : null;

  const currentLevel = myResult?.xpProgress?.level ?? 0;
  const showProPanel = !isPro && !isPlacement && myResult != null && session?.user != null;

  return (
    <div className="flex flex-col gap-2 w-full">

      {/* ── Hero stats ─────────────────────────────────────── */}
      {myResult ? (
        <div
          className="rounded-xl overflow-hidden ring-1 ring-white/[0.04] animate-slide-up"
          style={{ animationFillMode: "both" }}
        >
          {/* Placement-colored top bar */}
          <div className={`h-0.5 ${pStyle!.bar} opacity-60`} />
          <div className={`grid gap-px ${statCols}`}>

            {/* Placement */}
            <div className="bg-surface/40 px-4 py-3">
              <div className={`text-3xl sm:text-4xl font-black tabular-nums leading-none ${pStyle!.text}`}>
                {ordinal(myResult.placement)}
              </div>
              <div className="text-[10px] text-muted/50 mt-1 uppercase tracking-wide">
                of {results.length}
              </div>
            </div>

            {/* WPM */}
            <div className="bg-surface/40 px-3 py-3 sm:px-4">
              <div className="text-2xl font-black text-text tabular-nums leading-none">
                {Math.floor(myResult.wpm)}
                <span className="text-base opacity-50">
                  .{(myResult.wpm % 1).toFixed(2).slice(2)}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <div className="text-[10px] text-muted/60 uppercase tracking-wide">wpm</div>
                {myResult.rawWpm > 0 && Math.floor(myResult.rawWpm) !== Math.floor(myResult.wpm) && (
                  <div className="text-[10px] text-muted/30 tabular-nums">
                    {Math.floor(myResult.rawWpm)} raw
                  </div>
                )}
              </div>
            </div>

            {/* Accuracy */}
            {!isPlacement && (
              <div className="bg-surface/40 px-3 py-3 sm:px-4">
                <div className="text-2xl font-black text-text tabular-nums leading-none">
                  {Math.floor(myResult.accuracy)}
                  <span className="text-base opacity-50">
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
              hasElo && (
                <div className="bg-surface/40 px-3 py-2 sm:px-4 sm:py-2.5">
                  <AnimatedElo
                    oldElo={myResult.elo! - myResult.eloChange!}
                    newElo={myResult.elo!}
                    change={myResult.eloChange!}
                    rankChange={rankChange}
                  />
                </div>
              )
            )}
          </div>
        </div>
      ) : (
        <h2 className="text-lg font-bold text-text animate-slide-up">Results</h2>
      )}

      {/* ── Standings + WPM Chart ──────────────────────────── */}
      <div
        className={`grid gap-2 w-full ${
          myWpmHistory && myWpmHistory.length >= 2 ? "sm:grid-cols-[3fr_2fr]" : ""
        }`}
        style={{ animation: "slide-up 0.5s ease-out 0.08s both" }}
      >
        {/* Standings table */}
        <div className="rounded-xl bg-surface/30 ring-1 ring-white/[0.04] overflow-hidden">
          {/* Header */}
          <div
            className={`grid text-muted/40 text-[10px] uppercase tracking-widest px-3 sm:px-4 py-1.5 border-b border-white/[0.05] ${tableCols}`}
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
                className={`grid items-center px-3 sm:px-4 py-1.5 border-b border-white/[0.03] last:border-0 transition-colors border-l-2 ${tableCols} ${
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
                      {isMe ? (
                        <CosmeticName nameColor={null} nameEffect={result.activeNameEffect}>
                          {displayName}
                          <span className="text-muted text-xs ml-1">(you)</span>
                        </CosmeticName>
                      ) : (
                        <CosmeticName nameColor={result.activeNameColor} nameEffect={result.activeNameEffect}>
                          {displayName}
                        </CosmeticName>
                      )}
                    </Link>
                  ) : (
                    <span className="truncate">
                      {displayName}
                      {isMe && <span className="text-muted text-xs ml-1">(you)</span>}
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
                      <span className="text-muted/40 text-sm">—</span>
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
                      <span className="text-muted/40">—</span>
                    )}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* WPM Chart */}
        {myWpmHistory && myWpmHistory.length >= 2 && (
          <div className="rounded-xl bg-surface/30 ring-1 ring-white/[0.04] p-2 sm:p-3 flex items-center min-h-0">
            <WpmChart samples={myWpmHistory} />
          </div>
        )}
      </div>

      {/* ── Achievements ──────────────────────────────────── */}
      {hasAchievements && (
        <div
          className="flex flex-col gap-1 w-full"
          style={{ animation: "slide-up 0.5s ease-out 0.14s both" }}
        >
          <h3 className="text-[10px] font-bold text-muted/50 uppercase tracking-widest px-0.5">
            Achievements Unlocked
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {myResult!.newAchievements!.map((id) => {
              const def = ACHIEVEMENT_MAP.get(id);
              if (!def) return null;
              return (
                <div
                  key={id}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 ring-1 animate-slide-up ${RARITY_BG[def.rarity]} ${RARITY_RING[def.rarity]} ${RARITY_GLOW[def.rarity]}`}
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

      {/* ── Challenges + Level XP ─────────────────────────── */}
      {hasProgress && (
        <div
          className={`grid gap-2 w-full ${hasChallenges && hasXpProgress ? "sm:grid-cols-[3fr_2fr]" : ""}`}
          style={{ animation: "slide-up 0.5s ease-out 0.18s both" }}
        >
          {hasChallenges && (
            <div className="rounded-xl bg-surface/30 ring-1 ring-white/[0.04] overflow-hidden px-3 py-2 sm:px-4 sm:py-2.5">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-[10px] font-bold text-muted/50 uppercase tracking-widest">
                  Challenges
                </h3>
                {myResult!.xpEarned != null && myResult!.xpEarned > 0 && (
                  <span className="text-xs font-bold text-accent tabular-nums">
                    +{myResult!.xpEarned} XP
                  </span>
                )}
              </div>
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
                        <span className="text-[10px] text-muted/50 truncate block">{def.description}</span>
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
            </div>
          )}

          {hasXpProgress && (
            <AnimatedXpPanel xp={myResult!.xpProgress!} isPro={isPro} />
          )}
        </div>
      )}

      {/* ── Text Leaderboard ──────────────────────────────── */}
      {seed != null && mode && (
        <div
          className="w-full"
          style={{ animation: "slide-up 0.5s ease-out 0.20s both" }}
        >
          <TextLeaderboard seed={seed} mode={mode} limit={10} />
        </div>
      )}

      {/* ── Pro panel (non-Pro users only) ────────────────── */}
      {showProPanel && (
        <div style={{ animation: "slide-up 0.5s ease-out 0.22s both" }}>
          <ProPanel level={currentLevel} />
        </div>
      )}

      {/* ── Party ready state ─────────────────────────────── */}
      {inParty && !isPlacement && (
        <div
          className="flex items-center justify-center gap-3 flex-wrap"
          style={{ animation: "slide-up 0.5s ease-out 0.24s both" }}
        >
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

      {/* ── Actions ───────────────────────────────────────── */}
      <div
        className="flex flex-col items-center gap-1.5 w-full max-w-xs mx-auto"
        style={{ animation: "slide-up 0.5s ease-out 0.26s both" }}
      >
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
              className="w-full rounded-lg bg-accent/[0.06] ring-1 ring-accent/20 text-accent py-2.5 text-sm font-medium hover:bg-accent hover:text-bg hover:ring-accent transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-accent/[0.06] disabled:hover:text-accent disabled:hover:ring-accent/20"
            >
              {isPlacement ? "Next Placement" : "Race Again"}
              <span className="inline-block w-[2px] h-[1em] bg-current animate-blink ml-0.5 translate-y-px" />
            </button>
            {inParty && !allMembersReady && (
              <span className="text-[10px] text-muted/40">
                waiting for party to ready up...
              </span>
            )}
          </>
        )}

        {/* Secondary actions row */}
        <div className="flex items-center gap-3 mt-0.5">
          <button
            onClick={onGoHome}
            className="text-xs text-muted/40 hover:text-muted transition-colors"
          >
            go home
          </button>
          {raceId && (
            <Link
              href={`/races/${raceId}`}
              className="text-xs text-muted/40 hover:text-muted transition-colors"
            >
              watch replay
            </Link>
          )}
          {raceId && (
            <Link
              href="/ghost"
              className="text-xs text-muted/40 hover:text-muted transition-colors"
            >
              ghost race
            </Link>
          )}
          {!isPlacement && (
            <Link
              href="/analytics"
              className="text-xs text-muted/40 hover:text-muted transition-colors"
            >
              analytics
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
