"use client";

import React from "react";
import type { RacePlayer, RaceStatus } from "@typeoff/shared";
import { getRankTier } from "@typeoff/shared";
import { RankBadge } from "@/components/RankBadge";
import { CosmeticBadge } from "@/components/CosmeticBadge";
import { CosmeticName } from "@/components/CosmeticName";

interface ActiveRaceEntry {
  raceId: string;
  players: RacePlayer[];
  status: RaceStatus;
  spectatorCount: number;
}

interface ActiveRacesListProps {
  races: ActiveRaceEntry[];
  onWatch: (raceId: string) => void;
  onRefresh: () => void;
  loading: boolean;
}

function StatusBadge({ status }: { status: RaceStatus }) {
  if (status === "racing") {
    return (
      <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-correct/80">
        <span className="w-1.5 h-1.5 rounded-full bg-correct animate-pulse" />
        Racing
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-accent/70">
      <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
      Starting
    </span>
  );
}

function PlayerRow({ player }: { player: RacePlayer }) {
  const isBot = player.id.startsWith("bot_");
  return (
    <div className="flex items-center gap-1.5 text-sm min-w-0">
      {!isBot && <RankBadge tier={getRankTier(player.elo)} />}
      {!isBot && <CosmeticBadge badge={player.activeBadge} />}
      <span className="truncate">
        {isBot ? (
          <span className="text-muted/50">{player.name}</span>
        ) : (
          <CosmeticName nameColor={player.activeNameColor} nameEffect={player.activeNameEffect}>
            {player.name}
          </CosmeticName>
        )}
      </span>
      {isBot && (
        <span className="text-[9px] text-muted/30 bg-white/[0.04] rounded px-1 py-px font-medium uppercase">
          Bot
        </span>
      )}
    </div>
  );
}

export function ActiveRacesList({ races, onWatch, onRefresh, loading }: ActiveRacesListProps) {
  if (races.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="text-muted/20">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </div>
        <p className="text-sm text-muted/30">No active races right now</p>
        <button
          onClick={onRefresh}
          className="text-xs text-accent/60 hover:text-accent transition-colors flex items-center gap-1.5"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 4 23 10 17 10" />
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
          </svg>
          Refresh
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {races.map((race, i) => {
        const realPlayers = race.players.filter((p) => !p.id.startsWith("bot_"));
        const botCount = race.players.length - realPlayers.length;

        return (
          <div
            key={race.raceId}
            className="group rounded-xl bg-surface/50 ring-1 ring-white/[0.06] hover:ring-accent/20 transition-all overflow-hidden opacity-0 animate-fade-in"
            style={{ animationDelay: `${i * 60}ms`, animationFillMode: "both" }}
          >
            {/* Top accent line */}
            <div className={`h-px ${race.status === "racing" ? "bg-gradient-to-r from-transparent via-correct/30 to-transparent" : "bg-gradient-to-r from-transparent via-accent/20 to-transparent"}`} />

            <div className="p-4">
              {/* Header: status + spectator count */}
              <div className="flex items-center justify-between mb-3">
                <StatusBadge status={race.status} />
                {race.spectatorCount > 0 && (
                  <span className="flex items-center gap-1 text-[10px] text-muted/30">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                    <span className="tabular-nums">{race.spectatorCount}</span>
                  </span>
                )}
              </div>

              {/* Players */}
              <div className="space-y-1.5 mb-4">
                {realPlayers.map((player) => (
                  <PlayerRow key={player.id} player={player} />
                ))}
                {botCount > 0 && (
                  <div className="text-[10px] text-muted/25">
                    +{botCount} bot{botCount > 1 ? "s" : ""}
                  </div>
                )}
              </div>

              {/* Watch button */}
              <button
                onClick={() => onWatch(race.raceId)}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold text-accent/80 bg-accent/[0.06] ring-1 ring-accent/15 hover:bg-accent/[0.12] hover:ring-accent/30 hover:text-accent transition-all disabled:opacity-40"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                Watch
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
