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

  // Show top 5 highest-impact insights
  const topInsights = insights.slice(0, 5);

  if (topInsights.length === 0) {
    return (
      <div className="rounded-xl bg-surface/40 ring-1 ring-white/[0.04] px-4 py-4 text-center">
        <p className="text-xs text-muted/60">Not enough data yet. Keep practicing to unlock insights.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {topInsights.map((insight) => (
        <InsightCard key={`${insight.type}-${insight.value}`} insight={insight} />
      ))}
    </div>
  );
}

function InsightCard({ insight }: { insight: WpmInsight }) {
  const severity = insight.accuracy < 0.7 ? "high" : insight.accuracy < 0.85 ? "medium" : "low";
  const severityColors = {
    high: "text-error/80 bg-error/10 ring-error/15",
    medium: "text-amber-400/80 bg-amber-400/10 ring-amber-400/15",
    low: "text-correct/80 bg-correct/10 ring-correct/15",
  };
  const dotColors = {
    high: "bg-error/70",
    medium: "bg-amber-400/70",
    low: "bg-correct/70",
  };

  const practiceUrl = insight.type === "bigram"
    ? `/solo?bigrams=${insight.value}`
    : `/solo?drill=true`;

  return (
    <div className="rounded-lg bg-surface/40 ring-1 ring-white/[0.04] px-4 py-3 flex items-start gap-3">
      <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${dotColors[severity]}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={`text-xs font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ring-1 ${severityColors[severity]}`}>
            ~{Math.max(1, Math.round(insight.estimatedWpmCost))} wpm cost
          </span>
          <span className="text-xs text-muted/50">
            {insight.type === "bigram" ? "bigram" : "key"}: <span className="text-accent font-bold">{insight.value}</span>
          </span>
        </div>
        <p className="text-xs text-muted/70 leading-relaxed">{insight.insight}</p>
      </div>
      <Link
        href={practiceUrl}
        className="shrink-0 text-xs font-semibold text-accent hover:text-accent/80 transition-colors mt-1"
      >
        Practice →
      </Link>
    </div>
  );
}
