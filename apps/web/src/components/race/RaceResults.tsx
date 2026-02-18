"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import type { RaceResult } from "@/hooks/useRace";
import type { RankTier } from "@typeoff/shared";
import { getRankInfo, ACHIEVEMENT_MAP, CHALLENGE_MAP, getCurrentSeason } from "@typeoff/shared";
import type { AchievementRarity } from "@typeoff/shared";
import { RankBadge } from "@/components/RankBadge";

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
}

const RARITY_RING: Record<AchievementRarity, string> = {
  common: "ring-white/[0.08]",
  rare: "ring-sky-400/30",
  epic: "ring-purple-400/40",
  legendary: "ring-yellow-400/50",
};

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

        // Detect rank boundary crossing
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

  /* Fade glow out after 2s */
  useEffect(() => {
    if (!glowVisible) return;
    const timer = setTimeout(() => setGlowVisible(false), 500);
    return () => clearTimeout(timer);
  }, [glowVisible]);

  const rankInfo = getRankInfo(displayElo);

  return (
    <div className="flex flex-col items-center gap-1.5">
      {/* Rank label — pulses when it changes */}
      <div className="relative flex items-center justify-center gap-2">
        {rankPulse && rankChange && (
          <span
            className={`text-sm font-bold ${
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
          <RankBadge tier={rankInfo.tier} elo={displayElo} showElo={false} size={rankPulse ? "md" : "sm"} />
        </span>
      </div>

      {/* ELO counter */}
      <div className="flex items-baseline gap-3">
        <span className="text-2xl font-black text-text tabular-nums">
          {displayElo}
        </span>
        <span
          className={`text-base font-bold tabular-nums transition-opacity duration-300 ${
            showChange ? "opacity-100" : "opacity-0"
          } ${change > 0 ? "text-correct" : change < 0 ? "text-error" : "text-muted"}`}
        >
          {change > 0 ? "+" : ""}
          {change}
        </span>
      </div>
    </div>
  );
}

export function RaceResults({
  results,
  myPlayerId,
  onRaceAgain,
  onGoHome,
  placementRace,
  placementTotal,
  rankChange,
}: RaceResultsProps) {
  const isPlacement = placementRace != null && placementTotal != null;
  const myResult = results.find((r) => r.playerId === myPlayerId);

  /* Table column templates — 6 columns on desktop (adds Accuracy) */
  const mobileCols = isPlacement
    ? "grid-cols-[2.5rem_1fr_5rem]"
    : "grid-cols-[2rem_1fr_4rem_3.5rem]";
  const desktopCols = isPlacement
    ? ""
    : "sm:grid-cols-[2rem_1fr_6rem_4rem_3.5rem_3.5rem]";
  const tableCols = `${mobileCols} ${desktopCols}`;

  const hasAchievements =
    myResult?.newAchievements && myResult.newAchievements.length > 0;
  const hasChallenges =
    myResult?.challengeProgress &&
    myResult.challengeProgress.some((c) => c.progress > 0);
  const hasKeyPass = myResult?.keyPassProgress != null;
  const season = getCurrentSeason();

  return (
    <div className="flex flex-col items-center gap-5 w-full">
      {/* Header */}
      {isPlacement ? (
        <div className="flex flex-col items-center gap-1 animate-slide-up">
          <h2 className="text-2xl font-black text-accent">
            Placement {placementRace} of {placementTotal}
          </h2>
          <div className="flex items-center gap-2 mt-2">
            {Array.from({ length: placementTotal }, (_, i) => (
              <div
                key={i}
                className={`w-2.5 h-2.5 rounded-full transition-colors ${
                  i < placementRace ? "bg-accent" : "bg-surface"
                }`}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="animate-slide-up">
          <h2 className="text-2xl font-black text-accent">Race Results</h2>
        </div>
      )}

      {/* ── ELO animation — full width, top center ── */}
      {myResult &&
        myResult.eloChange != null &&
        myResult.elo != null &&
        !isPlacement && (
          <AnimatedElo
            oldElo={myResult.elo - myResult.eloChange}
            newElo={myResult.elo}
            change={myResult.eloChange}
            rankChange={rankChange}
          />
        )}

      {/* ── Results table — full width ── */}
      <div className="w-full">
        {/* Header */}
        <div
          className={`grid text-muted text-xs uppercase tracking-wider border-b border-white/[0.06] pb-2.5 ${tableCols}`}
        >
          <span className="font-semibold">#</span>
          <span className="font-semibold">Name</span>
          {!isPlacement && (
            <span className="font-semibold hidden sm:block">Rank</span>
          )}
          <span className="font-semibold text-right">WPM</span>
          {!isPlacement && (
            <span className="font-semibold text-right hidden sm:block">
              Acc
            </span>
          )}
          {!isPlacement && (
            <span className="font-semibold text-right">ELO</span>
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

          const rankInfo =
            !isGuest && result.elo != null ? getRankInfo(result.elo) : null;

          return (
            <div
              key={result.playerId}
              className={`grid items-center border-b border-white/[0.04] py-2 ${tableCols} ${
                isMe ? "text-accent" : "text-text"
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
                      <span className="text-muted text-xs ml-1">
                        (you)
                      </span>
                    )}
                  </Link>
                ) : (
                  <span className="truncate">
                    {displayName}
                    {isMe && (
                      <span className="text-muted text-xs ml-1">
                        (you)
                      </span>
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
                  {rankInfo ? (
                    <RankBadge
                      tier={rankInfo.tier}
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
                  {Math.floor(result.accuracy)}<span className="text-[0.7em] opacity-50">.{((result.accuracy % 1) * 10).toFixed(0)}%</span>
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

      {/* ── Full-width sections below grid ── */}

      {/* Achievement unlocks */}
      {hasAchievements && (
        <div className="flex flex-col gap-1.5 w-full">
          <h3 className="text-xs font-bold text-muted/60 uppercase tracking-wider px-1">
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

      {/* Challenge Progress */}
      {hasChallenges && (
        <div className="flex flex-col gap-1.5 w-full animate-slide-up">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-bold text-muted/60 uppercase tracking-wider">
              Challenge Progress
            </h3>
            {myResult!.xpEarned != null && myResult!.xpEarned > 0 && (
              <span className="text-xs font-bold text-accent tabular-nums">
                +{myResult!.xpEarned} XP
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
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
                    className={`flex items-start gap-2.5 rounded-lg bg-surface/60 px-3 py-2 ring-1 ${
                      cp.justCompleted
                        ? "ring-correct/30"
                        : "ring-white/[0.06]"
                    }`}
                  >
                    <span className="text-base shrink-0 mt-0.5">
                      {def.icon}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-text truncate">
                          {def.name}
                          {cp.completed && (
                            <span className="text-correct ml-1.5">
                              &#10003;
                            </span>
                          )}
                        </span>
                        <span className="text-[11px] text-muted tabular-nums shrink-0 ml-2">
                          {progress}/{cp.target}
                        </span>
                      </div>
                      <div className="h-1 rounded-full bg-surface overflow-hidden mt-1">
                        <div
                          className={`h-full rounded-full transition-all ${
                            cp.completed ? "bg-correct" : "bg-accent"
                          }`}
                          style={{ width: `${Math.round(pct)}%` }}
                        />
                      </div>
                    </div>
                    {cp.justCompleted && (
                      <span className="text-[10px] font-bold text-correct bg-correct/10 rounded px-1.5 py-0.5 tabular-nums shrink-0 mt-0.5">
                        +{cp.xpAwarded} XP
                      </span>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Key Pass Progress */}
      {hasKeyPass && season && (() => {
        const kp = myResult!.keyPassProgress!;
        const xpInTier = kp.seasonalXp % season.xpPerTier;
        const tierPct = kp.currentTier >= season.maxTier
          ? 100
          : (xpInTier / season.xpPerTier) * 100;

        return (
          <div className="flex flex-col gap-1.5 w-full animate-slide-up">
            <div className="flex items-center justify-between px-1">
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
          </div>
        );
      })()}

      {/* Actions */}
      <div className="flex flex-col items-center gap-2">
        <button
          onClick={() => onRaceAgain()}
          className="rounded-lg bg-accent text-bg px-10 py-3 text-sm font-bold tracking-wide uppercase hover:bg-accent/90 transition-colors glow-accent-strong w-full sm:w-auto"
        >
          {isPlacement ? "Next Placement" : "Race again"}
        </button>
        <button
          onClick={onGoHome}
          className="text-xs text-muted hover:text-text transition-colors"
        >
          or go home
        </button>
      </div>
    </div>
  );
}
