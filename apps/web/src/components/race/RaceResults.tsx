"use client";

import React from "react";
import Link from "next/link";
import type { RaceResult } from "@/hooks/useRace";
import { getRankTier } from "@typeoff/shared";
import { RankBadge } from "@/components/RankBadge";
import { WpmChart } from "@/components/typing/WpmChart";

interface RaceResultsProps {
  results: RaceResult[];
  myPlayerId: string | null;
  onRaceAgain: () => void;
  placementRace?: number;
  placementTotal?: number;
}

export function RaceResults({ results, myPlayerId, onRaceAgain, placementRace, placementTotal }: RaceResultsProps) {
  const isPlacement = placementRace != null && placementTotal != null;

  return (
    <div className="flex flex-col items-center gap-8 w-full">
      {isPlacement ? (
        <div className="flex flex-col items-center gap-1 animate-slide-up">
          <h2 className="text-2xl font-black text-accent">Placement {placementRace} of {placementTotal}</h2>
          {/* Progress dots */}
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
        <h2 className="text-2xl font-black text-accent animate-slide-up">Race Results</h2>
      )}

      <div className="w-full max-w-lg">
        <table className="w-full text-left table-fixed">
          <thead>
            <tr className="text-muted text-sm border-b border-surface">
              <th className="pb-2 w-10">#</th>
              <th className="pb-2">Player</th>
              <th className="pb-2 text-right w-16">WPM</th>
              {!isPlacement && (
                <th className="pb-2 text-right w-16 pl-3">ELO</th>
              )}
            </tr>
          </thead>
          <tbody>
            {results.map((result) => {
              const isMe = result.playerId === myPlayerId;
              const isBot = result.playerId.startsWith("bot_");
              const isGuest = result.playerId.startsWith("guest_") || isBot;
              const tier = getRankTier(result.elo ?? 1000);

              const displayName = result.username ?? result.name;
              const showStreak = result.placement === 1 && result.streak != null && result.streak >= 3;
              const nameContent = (
                <span className="flex items-center gap-2 truncate">
                  {!isGuest && !isPlacement && <RankBadge tier={tier} />}
                  <span className="truncate">
                    {displayName}
                    {isMe && " (you)"}
                  </span>
                  {isBot && <span className="text-xs text-muted bg-surface rounded px-1.5 py-0.5 shrink-0">BOT</span>}
                  {showStreak && (
                    <span className="text-orange-400 flex items-center gap-0.5 shrink-0" title={`${result.streak} win streak`}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="shrink-0">
                        <path d="M12 23c-3.866 0-7-2.686-7-6 0-1.665.753-3.488 2.127-5.244.883-1.128 1.873-2.1 2.873-3.006V2l4.386 4.506c.953.979 1.893 2.09 2.614 3.25C18.36 11.715 19 13.578 19 15.5 19 19.642 16.09 23 12 23z" />
                      </svg>
                      <span className="text-xs font-bold tabular-nums">{result.streak}</span>
                    </span>
                  )}
                </span>
              );

              return (
                <tr
                  key={result.playerId}
                  className={`border-b border-surface/50 ${
                    isMe ? "text-accent" : "text-text"
                  }`}
                >
                  <td className="py-2 font-bold">{result.placement}</td>
                  <td className="py-2 overflow-hidden">
                    {result.username && !isGuest ? (
                      <Link
                        href={`/profile/${result.username}`}
                        className="hover:text-accent transition-colors"
                      >
                        {nameContent}
                      </Link>
                    ) : (
                      nameContent
                    )}
                  </td>
                  <td className="py-2 text-right tabular-nums whitespace-nowrap">
                    {Math.round(result.wpm)}
                  </td>
                  {!isPlacement && (
                    <td className="py-2 text-right tabular-nums whitespace-nowrap pl-3">
                      {result.eloChange != null ? (
                        <span
                          className={
                            result.eloChange > 0
                              ? "text-correct"
                              : result.eloChange < 0
                              ? "text-error"
                              : "text-muted"
                          }
                        >
                          {result.eloChange > 0 ? "+" : ""}
                          {result.eloChange}
                        </span>
                      ) : (
                        <span className="text-muted">-</span>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Own performance details */}
      {(() => {
        const myResult = results.find((r) => r.playerId === myPlayerId);
        if (!myResult) return null;
        return (
          <div className="flex flex-col items-center gap-4 w-full max-w-lg">
            <div className="text-center">
              <div className="text-2xl font-bold text-accent tabular-nums">
                {Math.round(myResult.wpm)}
              </div>
              <div className="text-xs text-muted">wpm</div>
            </div>
            {myResult.wpmHistory && myResult.wpmHistory.length >= 2 && (
              <WpmChart samples={myResult.wpmHistory} />
            )}
          </div>
        );
      })()}

      <button
        onClick={() => onRaceAgain()}
        className="rounded-lg border border-accent/30 bg-accent/15 text-accent px-8 py-3 font-bold hover:bg-accent/25 hover:border-accent/50 transition-colors"
      >
        {isPlacement ? "Next Placement" : "Race again"}
      </button>
    </div>
  );
}
