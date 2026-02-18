"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import type { RaceResult } from "@/hooks/useRace";
import type { RankTier } from "@typeoff/shared";
import { getRankInfo, ACHIEVEMENT_MAP, CHALLENGE_MAP } from "@typeoff/shared";
import type { AchievementRarity } from "@typeoff/shared";
import { WpmChart } from "@/components/typing/WpmChart";
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

  const rankInfo = getRankInfo(displayElo);

  return (
    <div className="flex flex-col items-center gap-3">
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
          className="transition-all duration-500"
          style={
            rankPulse
              ? {
                  filter: `drop-shadow(0 0 6px currentColor)`,
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
        <span className="text-3xl font-black text-text tabular-nums">
          {displayElo}
        </span>
        <span
          className={`text-lg font-bold tabular-nums transition-opacity duration-300 ${
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
  placementRace,
  placementTotal,
  rankChange,
}: RaceResultsProps) {
  const isPlacement = placementRace != null && placementTotal != null;
  const myResult = results.find((r) => r.playerId === myPlayerId);

  return (
    <div className="flex flex-col items-center gap-8 w-full">
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

      {/* Results table — grid for reliable column sizing */}
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div
          className={`grid text-muted text-xs uppercase tracking-wider border-b border-white/[0.06] pb-2.5 ${
            isPlacement
              ? "grid-cols-[2.5rem_1fr_5rem]"
              : "grid-cols-[2rem_1fr_4rem_3.5rem] sm:grid-cols-[2.5rem_1fr_8rem_5rem_4rem]"
          }`}
        >
          <span className="font-semibold">#</span>
          <span className="font-semibold">Name</span>
          {!isPlacement && <span className="font-semibold hidden sm:block">Rank</span>}
          <span className="font-semibold text-right">WPM</span>
          {!isPlacement && <span className="font-semibold text-right">ELO</span>}
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
              className={`grid items-center border-b border-white/[0.04] py-3 ${
                isPlacement
                  ? "grid-cols-[2.5rem_1fr_5rem]"
                  : "grid-cols-[2rem_1fr_4rem_3.5rem] sm:grid-cols-[2.5rem_1fr_8rem_5rem_4rem]"
              } ${isMe ? "text-accent" : "text-text"}`}
            >
              {/* Placement */}
              <span className="font-bold tabular-nums">{result.placement}</span>

              {/* Name */}
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

              {/* Rank */}
              {!isPlacement && (
                <span className="pr-2 hidden sm:block">
                  {rankInfo ? (
                    <RankBadge tier={rankInfo.tier} elo={result.elo!} showElo={false} />
                  ) : (
                    <span className="text-muted/40 text-sm">—</span>
                  )}
                </span>
              )}

              {/* WPM */}
              <span className="text-right tabular-nums whitespace-nowrap">
                {Math.floor(result.wpm)}
                <span className="text-[0.7em] opacity-50">
                  .{(result.wpm % 1).toFixed(2).slice(2)}
                </span>
              </span>

              {/* ELO change */}
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

      {/* Animated ELO + rank transition */}
      {myResult && myResult.eloChange != null && myResult.elo != null && !isPlacement && (
        <AnimatedElo
          oldElo={myResult.elo - myResult.eloChange}
          newElo={myResult.elo}
          change={myResult.eloChange}
          rankChange={rankChange}
        />
      )}

      {/* Own WPM details + chart */}
      {myResult && (
        <div className="flex flex-col items-center gap-2 w-full max-w-2xl">
          <div className="flex items-end justify-center gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-accent tabular-nums">
                {Math.floor(myResult.wpm)}
                <span className="text-[0.65em] opacity-60">
                  .{(myResult.wpm % 1).toFixed(2).slice(2)}
                </span>
              </div>
              <div className="text-xs text-muted">wpm</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-text tabular-nums">
                {Math.round(myResult.accuracy)}%
              </div>
              <div className="text-xs text-muted">accuracy</div>
            </div>
            {myResult.misstypedChars != null && (
              <div className="text-center">
                <div className="text-lg font-bold text-text tabular-nums">
                  {myResult.misstypedChars}
                </div>
                <div className="text-xs text-muted">errors</div>
              </div>
            )}
          </div>
          {myResult.wpmHistory && myResult.wpmHistory.length >= 2 && (
            <WpmChart samples={myResult.wpmHistory} />
          )}
        </div>
      )}

      {/* Achievement unlocks */}
      {myResult?.newAchievements && myResult.newAchievements.length > 0 && (
        <div className="flex flex-col items-center gap-3 w-full max-w-md">
          <h3 className="text-xs font-bold text-muted/60 uppercase tracking-wider">
            Achievements Unlocked
          </h3>
          <div className="flex flex-col gap-2 w-full">
            {myResult.newAchievements.map((id) => {
              const def = ACHIEVEMENT_MAP.get(id);
              if (!def) return null;
              return (
                <div
                  key={id}
                  className={`flex items-center gap-3 rounded-lg bg-surface/60 px-4 py-3 ring-1 animate-slide-up ${RARITY_RING[def.rarity]}`}
                >
                  <span className="text-2xl shrink-0">{def.icon}</span>
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-text">{def.name}</div>
                    <div className="text-xs text-muted truncate">{def.description}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Challenge Progress */}
      {myResult?.challengeProgress && myResult.challengeProgress.some((c) => c.progress > 0) && (
        <div className="flex flex-col items-center gap-3 w-full max-w-md animate-slide-up">
          <h3 className="text-xs font-bold text-muted/60 uppercase tracking-wider">
            Challenge Progress
          </h3>
          {myResult.xpEarned != null && myResult.xpEarned > 0 && (
            <div className="text-sm font-bold text-accent">
              +{myResult.xpEarned} XP earned
            </div>
          )}
          <div className="flex flex-col gap-2 w-full">
            {myResult.challengeProgress
              .filter((c) => c.progress > 0)
              .map((cp) => {
                const def = CHALLENGE_MAP.get(cp.challengeId);
                if (!def) return null;
                const progress = Math.min(cp.progress, cp.target);
                const pct = cp.target > 0 ? (progress / cp.target) * 100 : 0;
                return (
                  <div
                    key={cp.challengeId}
                    className={`flex items-center gap-3 rounded-lg bg-surface/60 px-4 py-3 ring-1 ${
                      cp.justCompleted ? "ring-correct/30" : "ring-white/[0.06]"
                    }`}
                  >
                    <span className="text-lg shrink-0">{def.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs font-medium text-text truncate">
                          {def.name}
                          {cp.completed && (
                            <span className="text-correct ml-1.5">&#10003;</span>
                          )}
                        </span>
                        <span className="text-xs text-muted tabular-nums shrink-0 ml-2">
                          {progress}/{cp.target}
                        </span>
                      </div>
                      <div className="h-1 rounded-full bg-surface overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            cp.completed ? "bg-correct" : "bg-accent"
                          }`}
                          style={{ width: `${Math.round(pct)}%` }}
                        />
                      </div>
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

      <button
        onClick={() => onRaceAgain()}
        className="rounded-lg bg-accent text-bg px-10 py-3.5 text-sm font-bold tracking-wide uppercase hover:bg-accent/90 transition-colors glow-accent-strong w-full sm:w-auto"
      >
        {isPlacement ? "Next Placement" : "Race again"}
      </button>
    </div>
  );
}
