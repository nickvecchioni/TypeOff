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

  return (
    <div className="space-y-0 divide-y divide-white/[0.04]">
      {topInsights.map((insight) => (
        <InsightRow key={`${insight.type}-${insight.value}`} insight={insight} />
      ))}
    </div>
  );
}

function InsightRow({ insight }: { insight: WpmInsight }) {
  const accPct = Math.round(insight.accuracy * 100);
  const costColor =
    insight.accuracy < 0.7 ? "text-error/80" : insight.accuracy < 0.85 ? "text-amber-400/80" : "text-correct/70";
  const accColor =
    insight.accuracy < 0.7 ? "text-error/60" : insight.accuracy < 0.85 ? "text-amber-400/60" : "text-correct/50";
  const barColor =
    insight.accuracy < 0.7 ? "bg-error/30" : insight.accuracy < 0.85 ? "bg-amber-400/25" : "bg-correct/25";

  const practiceUrl = insight.type === "bigram"
    ? `/solo?bigrams=${insight.value}`
    : `/solo?drill=true`;

  return (
    <div className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0 group">
      <span className="text-accent font-bold text-sm w-8 shrink-0 text-center">{insight.value}</span>
      <span className="text-[11px] text-muted/40 uppercase w-10 shrink-0">{insight.type === "bigram" ? "bigram" : "key"}</span>
      <div className="flex-1 flex items-center gap-2 min-w-0">
        <div className="flex-1 h-1 rounded-full bg-white/[0.04] overflow-hidden max-w-32">
          <div className={`h-full rounded-full ${barColor}`} style={{ width: `${accPct}%` }} />
        </div>
        <span className={`text-xs tabular-nums w-9 text-right ${accColor}`}>{accPct}%</span>
      </div>
      <span className={`text-xs font-bold tabular-nums w-16 text-right ${costColor}`}>
        -{Math.max(1, Math.round(insight.estimatedWpmCost))} wpm
      </span>
      <Link
        href={practiceUrl}
        className="shrink-0 text-xs text-muted/40 hover:text-accent transition-colors opacity-0 group-hover:opacity-100"
      >
        practice
      </Link>
    </div>
  );
}
