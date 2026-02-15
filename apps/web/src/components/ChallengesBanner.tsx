"use client";

import React, { useState, useEffect } from "react";

interface Challenge {
  id: string;
  type: string;
  title: string;
  description: string;
  target: number;
  currentValue: number;
  completed: boolean;
}

export function ChallengesBanner() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/challenges")
      .then((res) => res.json())
      .then((data) => {
        setChallenges(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading || challenges.length === 0) return null;

  const daily = challenges.filter((c) => c.type === "daily");
  const weekly = challenges.filter((c) => c.type === "weekly");

  return (
    <div className="w-full max-w-3xl mx-auto flex flex-col sm:flex-row gap-3">
      {daily.map((c) => (
        <ChallengeCard key={c.id} challenge={c} label="Daily" />
      ))}
      {weekly.map((c) => (
        <ChallengeCard key={c.id} challenge={c} label="Weekly" />
      ))}
    </div>
  );
}

function ChallengeCard({ challenge, label }: { challenge: Challenge; label: string }) {
  const progress = Math.min(1, challenge.currentValue / challenge.target);
  const pct = Math.round(progress * 100);

  return (
    <div className="flex-1 rounded-lg bg-surface px-4 py-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-accent font-bold uppercase tracking-wider">
          {label}
        </span>
        {challenge.completed && (
          <span className="text-xs text-correct font-bold">Done</span>
        )}
      </div>
      <div className="text-sm font-bold text-text">{challenge.title}</div>
      <div className="text-xs text-muted mb-2">{challenge.description}</div>
      <div className="h-1.5 rounded-full bg-bg overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            challenge.completed ? "bg-correct" : "bg-accent"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="text-xs text-muted mt-1 tabular-nums text-right">
        {challenge.currentValue}/{challenge.target}
      </div>
    </div>
  );
}
