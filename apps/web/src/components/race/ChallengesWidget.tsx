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

      const totalHours = Math.floor(diff / 3600000);
      const days = Math.floor(totalHours / 24);
      const hours = totalHours % 24;
      const minutes = Math.floor((diff % 3600000) / 60000);
      if (days > 0) return `${days}d ${hours}h`;
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
    <div className="w-full h-full rounded-xl bg-surface/50 ring-1 ring-white/[0.04] overflow-hidden flex flex-col">
      <div className="h-px bg-gradient-to-r from-transparent via-accent/20 to-transparent shrink-0" />
      <div className="px-4 py-3 flex flex-col flex-1 justify-between gap-3">
        {/* Daily Challenges */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-muted/60 uppercase tracking-wider">
              Daily Challenges
            </span>
            <span className="text-sm text-muted tabular-nums">{dailyCountdown}</span>
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
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-amber-400/70 uppercase tracking-wider">
              Weekly Challenge
            </span>
            <span className="text-sm text-muted tabular-nums">{weeklyCountdown}</span>
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
    <div
      className={`flex items-center gap-2.5 rounded-lg px-2 py-1.5 -mx-2 transition-colors ${
        completed
          ? "bg-correct/[0.04] ring-1 ring-correct/[0.10]"
          : "ring-1 ring-transparent"
      }`}
    >
      <span className="text-base shrink-0 w-6 text-center">{challenge.icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <span className="flex items-center gap-1.5 min-w-0">
            <span className={`text-sm font-medium truncate ${completed ? "text-text/70" : "text-text"}`}>
              {challenge.name}
            </span>
            {completed && (
              <span className="shrink-0 text-xs font-black text-correct bg-correct/15 ring-1 ring-correct/25 px-1 py-[2px] rounded leading-none">
                ✓
              </span>
            )}
          </span>
          <span className={`text-sm tabular-nums shrink-0 ml-2 ${loading ? "text-transparent" : "text-muted"}`}>
            {clamped}/{challenge.target}
          </span>
        </div>
        <p className="text-xs text-muted/65 truncate mb-1">{challenge.description}</p>
        <div className="h-1 rounded-full bg-surface overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              loading
                ? "animate-pulse bg-surface-bright/20 w-full"
                : completed
                ? "bg-correct"
                : accent
                ? "bg-amber-400"
                : "bg-accent"
            }`}
            style={
              loading
                ? undefined
                : {
                    width: `${Math.round(pct)}%`,
                    boxShadow: completed
                      ? "0 0 6px rgba(34,197,94,0.55)"
                      : undefined,
                  }
            }
          />
        </div>
      </div>
      <span
        className={`text-sm font-bold shrink-0 rounded px-1.5 py-0.5 tabular-nums transition-all ${
          completed
            ? "bg-correct/15 text-correct ring-1 ring-correct/25 [box-shadow:0_0_8px_rgba(34,197,94,0.3)]"
            : "bg-white/[0.04] text-muted"
        }`}
      >
        {challenge.xpReward} XP
      </span>
    </div>
  );
}
