"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import type { RaceResult } from "@/hooks/useRace";
import type { RankTier } from "@typeoff/shared";
import { getRankInfo } from "@typeoff/shared";
import { WpmChart } from "@/components/typing/WpmChart";

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

const TIER_CLASSES: Record<RankTier, string> = {
  bronze: "text-rank-bronze",
  silver: "text-rank-silver",
  gold: "text-rank-gold",
  platinum: "text-rank-platinum",
  diamond: "text-rank-diamond",
  master: "text-rank-master",
  grandmaster: "text-rank-grandmaster",
};

function AnimatedElo({
  oldElo,
  newElo,
  change,
}: {
  oldElo: number;
  newElo: number;
  change: number;
}) {
  const [displayElo, setDisplayElo] = useState(oldElo);
  const [showChange, setShowChange] = useState(false);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    // Start animating after a brief delay
    const delay = setTimeout(() => {
      setShowChange(true);
      const startTime = performance.now();
      const duration = 1200;

      const animate = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // Ease-out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        setDisplayElo(Math.round(oldElo + (newElo - oldElo) * eased));
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
    <div className="flex flex-col items-center gap-2">
      <div className={`text-sm font-bold ${TIER_CLASSES[rankInfo.tier]}`}>
        {rankInfo.label}
      </div>
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
    <div className="flex flex-col items-center gap-6 w-full">
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

      {/* Results table */}
      <div className="w-full max-w-2xl">
        <table className="w-full text-left">
          <thead>
            <tr className="text-muted text-xs uppercase tracking-wider border-b border-white/[0.06]">
              <th className="pb-2.5 w-10 font-semibold">#</th>
              <th className="pb-2.5 font-semibold">Name</th>
              {!isPlacement && (
                <th className="pb-2.5 font-semibold">Rank</th>
              )}
              <th className="pb-2.5 text-right font-semibold">WPM</th>
              {!isPlacement && (
                <th className="pb-2.5 text-right font-semibold w-20">ELO</th>
              )}
            </tr>
          </thead>
          <tbody>
            {results.map((result) => {
              const isMe = result.playerId === myPlayerId;
              const isBot = result.playerId.startsWith("bot_");
              const isGuest =
                result.playerId.startsWith("guest_") || isBot;

              const displayName = result.username ?? result.name;
              const showStreak =
                result.placement === 1 &&
                result.streak != null &&
                result.streak >= 3;

              const rankInfo =
                !isGuest && result.elo != null
                  ? getRankInfo(result.elo)
                  : null;

              return (
                <tr
                  key={result.playerId}
                  className={`border-b border-white/[0.04] ${
                    isMe ? "text-accent" : "text-text"
                  }`}
                >
                  {/* Placement */}
                  <td className="py-3 font-bold tabular-nums">
                    {result.placement}
                  </td>

                  {/* Name */}
                  <td className="py-3 overflow-hidden">
                    <span className="flex items-center gap-2 truncate">
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
                  </td>

                  {/* Rank */}
                  {!isPlacement && (
                    <td className="py-3">
                      {rankInfo ? (
                        <span
                          className={`text-sm font-semibold ${TIER_CLASSES[rankInfo.tier]}`}
                        >
                          {rankInfo.label}
                        </span>
                      ) : (
                        <span className="text-muted/40 text-sm">—</span>
                      )}
                    </td>
                  )}

                  {/* WPM */}
                  <td className="py-3 text-right tabular-nums whitespace-nowrap">
                    {Math.floor(result.wpm)}
                    <span className="text-[0.7em] opacity-50">
                      .{(result.wpm % 1).toFixed(2).slice(2)}
                    </span>
                  </td>

                  {/* ELO change */}
                  {!isPlacement && (
                    <td className="py-3 text-right tabular-nums whitespace-nowrap">
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
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Animated ELO + rank section for the current user */}
      {myResult && myResult.eloChange != null && myResult.elo != null && !isPlacement && (
        <div className="flex flex-col items-center gap-4 mt-2">
          <AnimatedElo
            oldElo={myResult.elo - myResult.eloChange}
            newElo={myResult.elo}
            change={myResult.eloChange}
          />

          {/* Rank change banner */}
          {rankChange && (
            <div
              className={`flex items-center gap-3 rounded-lg px-5 py-3 text-sm font-bold animate-slide-up ${
                rankChange.direction === "up"
                  ? `bg-rank-${rankChange.newTier}/10 ring-1 ring-rank-${rankChange.newTier}/20 text-rank-${rankChange.newTier}`
                  : "bg-error/10 ring-1 ring-error/20 text-error"
              }`}
            >
              <span className="text-lg">
                {rankChange.direction === "up" ? "▲" : "▼"}
              </span>
              <span>
                {rankChange.direction === "up" ? "Promoted to" : "Demoted to"}{" "}
                {rankChange.newLabel}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Own WPM details + chart */}
      {myResult && (
        <div className="flex flex-col items-center gap-2 w-full max-w-2xl">
          <div className="text-center">
            <div className="text-2xl font-bold text-accent tabular-nums">
              {Math.floor(myResult.wpm)}
              <span className="text-[0.65em] opacity-60">
                .{(myResult.wpm % 1).toFixed(2).slice(2)}
              </span>
            </div>
            <div className="text-xs text-muted">wpm</div>
          </div>
          {myResult.wpmHistory && myResult.wpmHistory.length >= 2 && (
            <WpmChart samples={myResult.wpmHistory} />
          )}
        </div>
      )}

      <button
        onClick={() => onRaceAgain()}
        className="rounded-lg bg-accent text-bg px-10 py-3.5 text-sm font-bold tracking-wide uppercase hover:bg-accent/90 transition-colors glow-accent-strong"
      >
        {isPlacement ? "Next Placement" : "Race again"}
      </button>
    </div>
  );
}
