"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import type { RaceResult } from "@/hooks/useRace";
import type { RankTier, WpmSample } from "@typeoff/shared";
import { getRankInfo, ACHIEVEMENT_MAP, CHALLENGE_MAP, getCurrentSeason, getXpLevel } from "@typeoff/shared";
import { WpmChart } from "@/components/typing/WpmChart";
import type { AchievementRarity } from "@typeoff/shared";
import { RankBadge } from "@/components/RankBadge";
import { useSession } from "next-auth/react";

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
}

const RARITY_RING: Record<AchievementRarity, string> = {
  common: "ring-white/[0.08]",
  rare: "ring-sky-400/30",
  epic: "ring-purple-400/40",
  legendary: "ring-yellow-400/50",
};

const PLACEMENT_STYLE: Record<number, { bar: string; text: string }> = {
  1: { bar: "bg-rank-gold", text: "text-rank-gold" },
  2: { bar: "bg-rank-silver", text: "text-rank-silver" },
  3: { bar: "bg-rank-bronze", text: "text-rank-bronze" },
};

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/* ── Animated ELO counter (fits inside a stats-bar cell) ── */

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
          <RankBadge
            tier={rankInfo.tier}
            elo={displayElo}
            showElo={false}
            size="xs"
          />
        </span>
      </div>
    </div>
  );
}

/* ── Main component ──────────────────────────────────────── */

export function RaceResults({
  results,
  myPlayerId,
  onRaceAgain,
  onGoHome,
  placementRace,
  placementTotal,
  rankChange,
  myWpmHistory,
}: RaceResultsProps) {
  const { data: session } = useSession();
  const isPlacement = placementRace != null && placementTotal != null;
  const myResult = results.find((r) => r.playerId === myPlayerId);

  // Enter key shortcut to race again
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Enter" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || tag === "BUTTON" || tag === "A") return;
        e.preventDefault();
        onRaceAgain();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onRaceAgain]);

  const mobileCols = isPlacement
    ? "grid-cols-[2.5rem_1fr_5rem]"
    : "grid-cols-[2rem_1fr_4rem_3.5rem]";
  const desktopCols = isPlacement
    ? ""
    : "sm:grid-cols-[2.5rem_1fr_7rem_5rem_4rem_4rem]";
  const tableCols = `${mobileCols} ${desktopCols}`;

  const hasAchievements =
    myResult?.newAchievements && myResult.newAchievements.length > 0;
  const hasChallenges =
    myResult?.challengeProgress &&
    myResult.challengeProgress.some((c) => c.progress > 0);
  const hasTypePass = myResult?.typePassProgress != null;
  const season = getCurrentSeason();
  const hasProgress = hasChallenges || (hasTypePass && season);

  const hasElo =
    !isPlacement && myResult?.eloChange != null && myResult?.elo != null;
  const statCols = isPlacement
    ? "grid-cols-2 sm:grid-cols-3"
    : hasElo
    ? "grid-cols-2 sm:grid-cols-4"
    : "grid-cols-2 sm:grid-cols-3";

  const pStyle = myResult
    ? PLACEMENT_STYLE[myResult.placement] ?? { bar: "bg-muted/30", text: "text-muted" }
    : null;

  return (
    <div className="flex flex-col gap-3 w-full pt-4">
      {/* ── Stats summary ──────────────────────────────────── */}
      {myResult ? (
        <div className="rounded-xl overflow-hidden ring-1 ring-white/[0.04] animate-slide-up">
          {/* Placement-colored accent bar */}
          <div className={`h-0.5 ${pStyle!.bar} opacity-50`} />
          <div className={`grid gap-px ${statCols}`}>
            {/* Position */}
            <div className="bg-surface/40 p-3 sm:p-4">
              <div className={`text-2xl font-black tabular-nums ${pStyle!.text}`}>
                {ordinal(myResult.placement)}
              </div>
              <div className="text-[11px] text-muted/60 mt-0.5">
                of {results.length}
              </div>
            </div>

            {/* WPM */}
            <div className="bg-surface/40 p-3 sm:p-4">
              <div className="text-2xl font-black text-text tabular-nums">
                {Math.floor(myResult.wpm)}
                <span className="text-base opacity-50">
                  .{(myResult.wpm % 1).toFixed(2).slice(2)}
                </span>
              </div>
              <div className="text-[11px] text-muted/60 mt-0.5">wpm</div>
            </div>

            {/* Accuracy (ranked only) */}
            {!isPlacement && (
              <div className="bg-surface/40 p-3 sm:p-4">
                <div className="text-2xl font-black text-text tabular-nums">
                  {Math.floor(myResult.accuracy)}
                  <span className="text-base opacity-50">
                    .{((myResult.accuracy % 1) * 10).toFixed(0)}%
                  </span>
                </div>
                <div className="text-[11px] text-muted/60 mt-0.5">accuracy</div>
              </div>
            )}

            {/* ELO cell (ranked) or Placement progress */}
            {isPlacement ? (
              <div className="bg-surface/40 p-3 sm:p-4 col-span-2 sm:col-span-1">
                <div className="text-sm font-bold text-accent">
                  Race {placementRace} / {placementTotal}
                </div>
                <div className="flex items-center gap-1.5 mt-2">
                  {Array.from({ length: placementTotal! }, (_, i) => (
                    <div
                      key={i}
                      className={`w-2 h-2 rounded-full ${
                        i < placementRace! ? "bg-accent" : "bg-surface-bright"
                      }`}
                    />
                  ))}
                </div>
              </div>
            ) : (
              hasElo && (
                <div className="bg-surface/40 p-3 sm:p-4">
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
        <h2 className="text-lg font-bold text-text animate-slide-up">
          Results
        </h2>
      )}

      {/* ── Standings ──────────────────────────────────────── */}
      <div
        className="rounded-xl bg-surface/30 ring-1 ring-white/[0.04] overflow-hidden w-full"
        style={{ animation: "slide-up 0.5s ease-out 0.08s both" }}
      >
        {/* Header */}
        <div
          className={`grid text-muted/50 text-xs uppercase tracking-wider px-3 sm:px-4 py-2 border-b border-white/[0.06] ${tableCols}`}
        >
          <span className="font-medium">#</span>
          <span className="font-medium">Name</span>
          {!isPlacement && (
            <span className="font-medium hidden sm:block">Rank</span>
          )}
          <span className="font-medium text-right">WPM</span>
          {!isPlacement && (
            <span className="font-medium text-right hidden sm:block">
              Acc
            </span>
          )}
          {!isPlacement && (
            <span className="font-medium text-right">ELO</span>
          )}
        </div>

        {/* Rows */}
        {results.map((result) => {
          const isMe = result.playerId === myPlayerId;
          const isBot = result.playerId.startsWith("bot_");
          const isGuest = result.playerId.startsWith("guest_") || isBot;
          const displayName = result.username ?? result.name;
          const showStreak =
            result.placement === 1 &&
            result.streak != null &&
            result.streak >= 3;
          const rInfo =
            !isGuest && result.elo != null ? getRankInfo(result.elo) : null;

          return (
            <div
              key={result.playerId}
              className={`grid items-center px-3 sm:px-4 py-2 border-b border-white/[0.03] last:border-0 transition-colors ${tableCols} ${
                isMe
                  ? "bg-accent/[0.05] text-accent"
                  : isBot
                  ? "text-text/60"
                  : "text-text hover:bg-white/[0.015]"
              }`}
            >
              <span className="font-bold tabular-nums">
                {result.placement}
              </span>

              <span className="flex items-center gap-2 min-w-0 pr-3">
                {result.username && !isGuest ? (
                  <Link
                    href={`/profile/${result.username}`}
                    className="hover:text-accent transition-colors truncate"
                  >
                    {displayName}
                    {isMe && (
                      <span className="text-muted text-xs ml-1">(you)</span>
                    )}
                  </Link>
                ) : (
                  <span className="truncate">
                    {displayName}
                    {isMe && (
                      <span className="text-muted text-xs ml-1">(you)</span>
                    )}
                  </span>
                )}
                {isBot && (
                  <span className="text-[10px] text-muted/70 bg-white/[0.06] rounded px-1.5 py-0.5 shrink-0 uppercase tracking-wider font-semibold">
                    Bot
                  </span>
                )}
                {showStreak && (
                  <span
                    className="text-orange-400 flex items-center gap-0.5 shrink-0"
                    title={`${result.streak} win streak`}
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      className="shrink-0"
                    >
                      <path d="M12 23c-3.866 0-7-2.686-7-6 0-1.665.753-3.488 2.127-5.244.883-1.128 1.873-2.1 2.873-3.006V2l4.386 4.506c.953.979 1.893 2.09 2.614 3.25C18.36 11.715 19 13.578 19 15.5 19 19.642 16.09 23 12 23z" />
                    </svg>
                    <span className="text-xs font-bold tabular-nums">
                      {result.streak}
                    </span>
                  </span>
                )}
              </span>

              {!isPlacement && (
                <span className="hidden sm:block">
                  {rInfo ? (
                    <RankBadge
                      tier={rInfo.tier}
                      elo={result.elo!}
                      showElo={false}
                      size="xs"
                    />
                  ) : (
                    <span className="text-muted/40 text-sm">—</span>
                  )}
                </span>
              )}

              <span className="text-right tabular-nums whitespace-nowrap">
                {Math.floor(result.wpm)}
                <span className="text-[0.7em] opacity-50">
                  .{(result.wpm % 1).toFixed(2).slice(2)}
                </span>
              </span>

              {!isPlacement && (
                <span className="text-right tabular-nums whitespace-nowrap hidden sm:block">
                  {Math.floor(result.accuracy)}
                  <span className="text-[0.7em] opacity-50">
                    .{((result.accuracy % 1) * 10).toFixed(0)}%
                  </span>
                </span>
              )}

              {!isPlacement && (
                <span className="text-right tabular-nums whitespace-nowrap">
                  {result.eloChange != null ? (
                    <span
                      className={`font-semibold ${
                        result.eloChange > 0
                          ? "text-correct"
                          : result.eloChange < 0
                          ? "text-error"
                          : "text-muted"
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

      {/* ── WPM Chart ──────────────────────────────────── */}
      {myWpmHistory && myWpmHistory.length >= 2 && (
        <div
          className="w-full flex justify-center"
          style={{ animation: "slide-up 0.5s ease-out 0.12s both" }}
        >
          <WpmChart samples={myWpmHistory} />
        </div>
      )}

      {/* ── Achievements ─────────────────────────────────── */}
      {hasAchievements && (
        <div
          className="flex flex-col gap-1.5 w-full"
          style={{ animation: "slide-up 0.5s ease-out 0.14s both" }}
        >
          <h3 className="text-xs font-bold text-muted/60 uppercase tracking-wider">
            Achievements Unlocked
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {myResult!.newAchievements!.map((id) => {
              const def = ACHIEVEMENT_MAP.get(id);
              if (!def) return null;
              return (
                <div
                  key={id}
                  className={`flex items-center gap-2.5 rounded-lg bg-surface/60 px-3 py-2 ring-1 animate-slide-up ${RARITY_RING[def.rarity]}`}
                >
                  <span className="text-lg shrink-0">{def.icon}</span>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-text">
                      {def.name}
                    </div>
                    <div className="text-[11px] text-muted truncate">
                      {def.description}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Progress: Challenges + TypePass ───────────────── */}
      {hasProgress && (
        <div
          className="rounded-xl bg-surface/30 ring-1 ring-white/[0.04] overflow-hidden w-full"
          style={{ animation: "slide-up 0.5s ease-out 0.18s both" }}
        >
          <div className="flex flex-col sm:flex-row divide-y sm:divide-y-0 sm:divide-x divide-white/[0.04]">
            {/* Challenges */}
            {hasChallenges && (
              <div className="flex-1 p-3 sm:p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-bold text-muted/60 uppercase tracking-wider">
                    Challenges
                  </h3>
                  {myResult!.xpEarned != null && myResult!.xpEarned > 0 && (
                    <span className="text-xs font-bold text-accent tabular-nums">
                      +{myResult!.xpEarned} XP
                    </span>
                  )}
                </div>
                <div className="space-y-0.5">
                  {myResult!
                    .challengeProgress!.filter((c) => c.progress > 0)
                    .map((cp) => {
                      const def = CHALLENGE_MAP.get(cp.challengeId);
                      if (!def) return null;
                      const progress = Math.min(cp.progress, cp.target);
                      const pct =
                        cp.target > 0 ? (progress / cp.target) * 100 : 0;
                      return (
                        <div
                          key={cp.challengeId}
                          className="flex items-center gap-2.5 py-1.5"
                        >
                          <span className="text-sm shrink-0">{def.icon}</span>
                          <div className="min-w-0 flex-1">
                            <span className="text-xs font-medium text-text truncate block">
                              {def.name}
                              {cp.completed && (
                                <span className="text-correct ml-1.5">
                                  &#10003;
                                </span>
                              )}
                            </span>
                            <span className="text-[10px] text-muted/50 truncate block">
                              {def.description}
                            </span>
                          </div>
                          <span className="text-[11px] text-muted tabular-nums shrink-0">
                            {progress}/{cp.target}
                          </span>
                          <div className="w-16 h-1 rounded-full bg-surface overflow-hidden shrink-0">
                            <div
                              className={`h-full rounded-full transition-all ${
                                cp.completed ? "bg-correct" : "bg-accent"
                              }`}
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

            {/* TypePass + Level */}
            {hasTypePass &&
              season &&
              (() => {
                const kp = myResult!.typePassProgress!;
                const xpInTier = kp.seasonalXp % season.xpPerTier;
                const tierPct =
                  kp.currentTier >= season.maxTier
                    ? 100
                    : (xpInTier / season.xpPerTier) * 100;
                const totalXp = session?.user?.totalXp ?? 0;
                const xpInfo = totalXp > 0 ? getXpLevel(totalXp) : null;

                return (
                  <div className="sm:w-64 p-3 sm:p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xs font-bold text-amber-400/80 uppercase tracking-wider">
                        Season XP
                      </h3>
                      <span className="text-xs font-bold text-amber-400 tabular-nums">
                        +{kp.xpEarned} XP
                      </span>
                    </div>
                    <div className="rounded-lg bg-surface/60 px-3 py-2.5 ring-1 ring-amber-400/10">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-text">
                          Tier {kp.currentTier}
                          {kp.tierUp && (
                            <span className="text-amber-400 ml-1.5 font-bold">
                              &#9650; Tier Up!
                            </span>
                          )}
                        </span>
                        <span className="text-[11px] text-muted tabular-nums">
                          {xpInTier} / {season.xpPerTier}
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-surface overflow-hidden">
                        <div
                          className="h-full rounded-full bg-amber-400 transition-all"
                          style={{ width: `${Math.round(tierPct)}%` }}
                        />
                      </div>
                      {kp.newRewards.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {kp.newRewards.map((r) => (
                            <span
                              key={r.id}
                              className={`text-[10px] font-bold rounded px-2 py-1 ${
                                r.premium
                                  ? "bg-amber-400/10 text-amber-400"
                                  : "bg-white/[0.06] text-text"
                              }`}
                            >
                              {r.type === "badge" ? r.value : ""} {r.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    {xpInfo && (
                      <div className="mt-3 rounded-lg bg-surface/60 px-3 py-2.5 ring-1 ring-accent/10">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold text-accent">
                            Level {xpInfo.level}
                          </span>
                          <span className="text-[11px] text-muted tabular-nums">
                            {xpInfo.currentXp} / {xpInfo.nextLevelXp}
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-surface overflow-hidden">
                          <div
                            className="h-full rounded-full bg-accent transition-all"
                            style={{ width: `${Math.round((xpInfo.currentXp / xpInfo.nextLevelXp) * 100)}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
          </div>
        </div>
      )}

      {/* ── Actions ──────────────────────────────────────── */}
      <div
        className="flex flex-col items-center gap-1.5 w-full max-w-xs mx-auto"
        style={{ animation: "slide-up 0.5s ease-out 0.22s both" }}
      >
        <button
          onClick={() => onRaceAgain()}
          className="w-full rounded-lg bg-accent/[0.06] ring-1 ring-accent/20 text-accent py-2.5 text-sm font-medium hover:bg-accent hover:text-bg hover:ring-accent transition-all"
        >
          {isPlacement ? "Next Placement" : "Race Again"}
          <span className="inline-block w-[2px] h-[1em] bg-current animate-blink ml-0.5 translate-y-px" />
        </button>
        <button
          onClick={onGoHome}
          className="text-xs text-muted/40 hover:text-muted transition-colors"
        >
          go home
        </button>
      </div>
    </div>
  );
}
