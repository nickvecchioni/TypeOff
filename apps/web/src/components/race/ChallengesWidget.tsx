"use client";

import React, { useEffect, useMemo, useState } from "react";
import { getActiveChallenges, type ChallengeDefinition } from "@typeoff/shared";

interface ProgressEntry {
  progress: number;
  completed: boolean;
}

function useCountdown(type: "daily" | "weekly") {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    function calc() {
      const now = new Date();
      let target: Date;
      if (type === "daily") {
        target = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
      } else {
        const dayOfWeek = now.getUTCDay();
        const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
        target = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + daysUntilMonday));
      }

      const diff = target.getTime() - now.getTime();
      if (diff <= 0) return "Resetting...";

      const hours = Math.floor(diff / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      if (hours > 0) return `${hours}h ${minutes}m`;
      const seconds = Math.floor((diff % 60000) / 1000);
      return `${minutes}m ${seconds}s`;
    }

    setTimeLeft(calc());
    const timer = setInterval(() => setTimeLeft(calc()), 1000);
    return () => clearInterval(timer);
  }, [type]);

  return timeLeft;
}

export function ChallengesWidget() {
  // Challenge definitions are deterministic — render immediately, no flash
  const challenges = useMemo(() => getActiveChallenges(), []);
  const dailies = challenges.filter((c) => c.type === "daily");
  const weeklies = challenges.filter((c) => c.type === "weekly");

  // Only the progress values come from the API
  const [progressMap, setProgressMap] = useState<Map<string, ProgressEntry> | null>(null);
  const dailyCountdown = useCountdown("daily");
  const weeklyCountdown = useCountdown("weekly");

  useEffect(() => {
    fetch("/api/challenges")
      .then((r) => r.json())
      .then((data) => {
        const map = new Map<string, ProgressEntry>(
          (data.challenges ?? []).map((c: { id: string; progress: number; completed: boolean }) => [
            c.id,
            { progress: c.progress, completed: c.completed },
          ]),
        );
        setProgressMap(map);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="w-full rounded-xl bg-surface/50 ring-1 ring-white/[0.04] overflow-hidden">
      <div className="h-px bg-gradient-to-r from-transparent via-accent/20 to-transparent" />
      <div className="p-5 space-y-4">
        {/* Daily Challenges */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted/60 uppercase tracking-wider">
              Daily Challenges
            </span>
            <span className="text-xs text-muted tabular-nums">{dailyCountdown}</span>
          </div>
          {dailies.map((c) => (
            <ChallengeRow
              key={c.id}
              challenge={c}
              progress={progressMap?.get(c.id)?.progress ?? 0}
              completed={progressMap?.get(c.id)?.completed ?? false}
              loading={progressMap === null}
            />
          ))}
        </div>

        {/* Weekly Challenge */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted/60 uppercase tracking-wider">
              Weekly Challenge
            </span>
            <span className="text-xs text-muted tabular-nums">{weeklyCountdown}</span>
          </div>
          {weeklies.map((c) => (
            <ChallengeRow
              key={c.id}
              challenge={c}
              progress={progressMap?.get(c.id)?.progress ?? 0}
              completed={progressMap?.get(c.id)?.completed ?? false}
              loading={progressMap === null}
              accent
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function ChallengeRow({
  challenge,
  progress,
  completed,
  loading,
  accent,
}: {
  challenge: ChallengeDefinition;
  progress: number;
  completed: boolean;
  loading: boolean;
  accent?: boolean;
}) {
  const clamped = Math.min(progress, challenge.target);
  const pct = challenge.target > 0 ? (clamped / challenge.target) * 100 : 0;

  return (
    <div className="flex items-center gap-3 group">
      <span className="text-lg shrink-0 w-6 text-center">{challenge.icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <span className="text-xs font-medium text-text truncate">
            {challenge.name}
            {completed && (
              <span className="text-correct ml-1.5">&#10003;</span>
            )}
          </span>
          <span className={`text-xs tabular-nums shrink-0 ml-2 ${loading ? "text-transparent" : "text-muted"}`}>
            {clamped}/{challenge.target}
          </span>
        </div>
        <p className="text-[10px] text-muted/50 truncate mb-1">{challenge.description}</p>
        <div className="h-1 rounded-full bg-surface overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              loading
                ? "animate-pulse bg-surface-bright/20 w-full"
                : completed
                ? "bg-correct"
                : accent
                ? "bg-purple-400"
                : "bg-accent"
            }`}
            style={loading ? undefined : { width: `${Math.round(pct)}%` }}
          />
        </div>
      </div>
      <span
        className={`text-[10px] font-bold shrink-0 rounded px-1.5 py-0.5 tabular-nums ${
          completed
            ? "bg-correct/10 text-correct"
            : "bg-white/[0.04] text-muted"
        }`}
      >
        {challenge.xpReward} XP
      </span>
    </div>
  );
}
