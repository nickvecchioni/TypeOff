"use client";

import Link from "next/link";
import { rankWeaknesses, estimateWpmImpact } from "@typeoff/shared";
import type { WpmInsight } from "@typeoff/shared";

interface AnalyticsInsightsProps {
  weakKeys: { key: string; accuracy: number; total: number }[];
  weakBigrams: { bigram: string; accuracy: number; total: number }[];
  avgWpm: number;
}

export function AnalyticsInsights({ weakKeys, weakBigrams, avgWpm }: AnalyticsInsightsProps) {
  const ranked = rankWeaknesses(weakKeys, weakBigrams);
  const insights = estimateWpmImpact(avgWpm, ranked);

  const topInsights = insights.slice(0, 5);

  if (topInsights.length === 0) {
    return (
      <div className="py-6 text-center">
        <p className="text-xs text-muted/50">Not enough data yet. Keep practicing to unlock insights.</p>
      </div>
    );
  }

  const maxCost = Math.max(...topInsights.map((i) => i.estimatedWpmCost), 1);

  return (
    <div className="flex flex-col gap-2">
      {topInsights.map((insight) => {
        const accPct = Math.round(insight.accuracy * 100);
        const cost = Math.max(1, Math.round(insight.estimatedWpmCost));
        const costBarPct = (insight.estimatedWpmCost / maxCost) * 100;
        const practiceUrl = insight.type === "bigram"
          ? `/solo?bigrams=${insight.value}`
          : `/solo?drill=true`;

        return (
          <Link
            key={`${insight.type}-${insight.value}`}
            href={practiceUrl}
            className="group flex items-center gap-2.5 rounded-lg px-2.5 py-2 transition-colors hover:bg-white/[0.03]"
          >
            {/* Bigram / key pill */}
            <span className="text-sm font-bold text-accent bg-accent/[0.08] rounded px-1.5 py-0.5 min-w-[28px] text-center tracking-wide shrink-0">
              {insight.value}
            </span>

            {/* Cost bar */}
            <div className="flex-1 h-1 rounded-full bg-white/[0.04] overflow-hidden">
              <div
                className="h-full rounded-full bg-error/35 group-hover:bg-error/50 transition-colors"
                style={{ width: `${costBarPct}%` }}
              />
            </div>

            {/* Accuracy + WPM cost */}
            <span className="text-[11px] text-muted/45 tabular-nums shrink-0">{accPct}%</span>
            <span className="text-xs font-bold text-error/75 tabular-nums shrink-0 w-14 text-right">
              -{cost} wpm
            </span>
          </Link>
        );
      })}
    </div>
  );
}
