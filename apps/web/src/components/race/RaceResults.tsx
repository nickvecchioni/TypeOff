"use client";

import React from "react";
import Link from "next/link";
import type { RaceResult } from "@/hooks/useRace";
import { getRankTier } from "@typeoff/shared";
import { RankBadge } from "@/components/RankBadge";

interface RaceResultsProps {
  results: RaceResult[];
  myPlayerId: string | null;
  onRaceAgain: () => void;
}

export function RaceResults({ results, myPlayerId, onRaceAgain }: RaceResultsProps) {
  return (
    <div className="flex flex-col items-center gap-8 animate-fade-in w-full">
      <h2 className="text-2xl font-bold text-accent">Race Results</h2>

      <div className="w-full max-w-lg">
        <table className="w-full text-left table-fixed">
          <thead>
            <tr className="text-muted text-sm border-b border-surface">
              <th className="pb-2 w-10">#</th>
              <th className="pb-2">Player</th>
              <th className="pb-2 text-right w-16">WPM</th>
              <th className="pb-2 text-right w-20 pl-3">Acc</th>
              <th className="pb-2 text-right w-16 pl-3">ELO</th>
            </tr>
          </thead>
          <tbody>
            {results.map((result) => {
              const isMe = result.playerId === myPlayerId;
              const isGuest = result.playerId.startsWith("guest_") || result.playerId.startsWith("bot_");
              const tier = getRankTier(result.elo ?? 1000);

              const displayName = result.username ?? result.name;
              const nameContent = (
                <span className="flex items-center gap-2 truncate">
                  {!isGuest && <RankBadge tier={tier} />}
                  <span className="truncate">
                    {displayName}
                    {isMe && " (you)"}
                  </span>
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
                  <td className="py-2 text-right tabular-nums whitespace-nowrap pl-3">
                    {Math.round(result.accuracy)}%
                  </td>
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
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <button
        onClick={onRaceAgain}
        className="rounded-lg bg-accent/20 text-accent px-6 py-2 hover:bg-accent/30 transition-colors"
      >
        Race again
      </button>
    </div>
  );
}
