"use client";

import React, { useEffect, useState } from "react";
import { CHALLENGE_MAP, type ChallengeDefinition } from "@typeoff/shared";

interface ChallengeWithProgress extends ChallengeDefinition {
  progress: number;
  completed: boolean;
}

interface ChallengesData {
  challenges: ChallengeWithProgress[];
  totalXp: number;
  dailyKey: string;
  weeklyKey: string;
}

function useCountdown(targetHour: "daily" | "weekly") {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    function calc() {
      const now = new Date();
      let target: Date;

      if (targetHour === "daily") {
        // Next UTC midnight
        target = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
      } else {
        // Next Monday UTC midnight
        const dayOfWeek = now.getUTCDay(); // 0=Sun
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
  }, [targetHour]);

  return timeLeft;
}

export function ChallengesWidget() {
  const [data, setData] = useState<ChallengesData | null>(null);
  const dailyCountdown = useCountdown("daily");
  const weeklyCountdown = useCountdown("weekly");

  useEffect(() => {
    fetch("/api/challenges")
      .then((r) => r.json())
      .then(setData)
      .catch(() => {});
  }, []);

  if (!data) {
    return (
      <div className="w-full rounded-xl bg-surface/50 ring-1 ring-white/[0.04] overflow-hidden">
        <div className="h-px bg-gradient-to-r from-transparent via-accent/20 to-transparent" />
        <div className="p-5 space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="w-28 h-3 rounded bg-surface-bright/20 animate-pulse" />
              <div className="w-12 h-3 rounded bg-surface-bright/15 animate-pulse" />
            </div>
            {[0, 1].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded bg-surface-bright/15 animate-pulse shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="w-3/4 h-3 rounded bg-surface-bright/15 animate-pulse" />
                  <div className="w-1/2 h-2 rounded bg-surface-bright/10 animate-pulse" />
                  <div className="h-1 rounded-full bg-surface-bright/10 animate-pulse" />
                </div>
                <div className="w-10 h-5 rounded bg-surface-bright/10 animate-pulse shrink-0" />
              </div>
            ))}
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="w-28 h-3 rounded bg-surface-bright/20 animate-pulse" />
              <div className="w-12 h-3 rounded bg-surface-bright/15 animate-pulse" />
            </div>
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded bg-surface-bright/15 animate-pulse shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="w-3/4 h-3 rounded bg-surface-bright/15 animate-pulse" />
                <div className="w-1/2 h-2 rounded bg-surface-bright/10 animate-pulse" />
                <div className="h-1 rounded-full bg-surface-bright/10 animate-pulse" />
              </div>
              <div className="w-10 h-5 rounded bg-surface-bright/10 animate-pulse shrink-0" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const dailies = data.challenges.filter((c) => c.type === "daily");
  const weeklies = data.challenges.filter((c) => c.type === "weekly");

  return (
    <div className="w-full rounded-xl bg-surface/50 ring-1 ring-white/[0.04] overflow-hidden transition-opacity duration-300">
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
          <ChallengeRow key={c.id} challenge={c} />
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
          <ChallengeRow key={c.id} challenge={c} accent />
        ))}
      </div>
      </div>
    </div>
  );
}

function ChallengeRow({
  challenge,
  accent,
}: {
  challenge: ChallengeWithProgress;
  accent?: boolean;
}) {
  const progress = Math.min(challenge.progress, challenge.target);
  const pct = challenge.target > 0 ? (progress / challenge.target) * 100 : 0;

  return (
    <div className="flex items-center gap-3 group">
      <span className="text-lg shrink-0 w-6 text-center">{challenge.icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <span className="text-xs font-medium text-text truncate">
            {challenge.name}
            {challenge.completed && (
              <span className="text-correct ml-1.5">&#10003;</span>
            )}
          </span>
          <span className="text-xs text-muted tabular-nums shrink-0 ml-2">
            {progress}/{challenge.target}
          </span>
        </div>
        <p className="text-[10px] text-muted/50 truncate mb-1">{challenge.description}</p>
        <div className="h-1 rounded-full bg-surface overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              challenge.completed ? "bg-correct" : accent ? "bg-purple-400" : "bg-accent"
            }`}
            style={{ width: `${Math.round(pct)}%` }}
          />
        </div>
      </div>
      <span
        className={`text-[10px] font-bold shrink-0 rounded px-1.5 py-0.5 tabular-nums ${
          challenge.completed
            ? "bg-correct/10 text-correct"
            : "bg-white/[0.04] text-muted"
        }`}
      >
        {challenge.xpReward} XP
      </span>
    </div>
  );
}
