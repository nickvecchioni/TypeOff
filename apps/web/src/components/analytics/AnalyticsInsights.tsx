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
    <div className="space-y-0 divide-y divide-white/[0.04]">
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
            className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0 group transition-colors hover:bg-white/[0.02] -mx-1 px-1 rounded"
          >
            {/* Bigram / key value */}
            <span className="text-accent font-bold text-sm w-7 shrink-0 text-center tracking-wide">
              {insight.value}
            </span>

            {/* Cost bar — visual weight proportional to WPM impact */}
            <div className="flex-1 h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
              <div
                className="h-full rounded-full bg-error/40 group-hover:bg-error/55 transition-colors"
                style={{ width: `${costBarPct}%` }}
              />
            </div>

            {/* Accuracy */}
            <span className="text-xs text-muted/50 tabular-nums w-9 text-right">{accPct}%</span>

            {/* WPM cost — hero number */}
            <span className="text-sm font-bold text-error/80 tabular-nums w-16 text-right">
              -{cost} wpm
            </span>
          </Link>
        );
      })}
    </div>
  );
}
