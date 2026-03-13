"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { SignInPrompt } from "@/components/auth/SignInPrompt";
import Link from "next/link";
import { BigramAnalysis } from "@/components/practice/BigramAnalysis";
import { BigramHeatmap } from "@/components/practice/BigramHeatmap";
import { KeyboardHeatmap } from "@/components/typing/KeyboardHeatmap";
import type { KeyStatsMap } from "@typeoff/shared";
import { estimateWpmImpact, rankWeaknesses } from "@typeoff/shared";
import { AnalyticsInsights } from "@/components/analytics/AnalyticsInsights";
import { PracticeProgress } from "@/components/practice/PracticeProgress";
import { ActivityCalendar } from "@/components/profile/ActivityCalendar";

interface ModeStat {
  modeCategory: string;
  racesPlayed: number;
  racesWon: number;
  avgWpm: number;
  bestWpm: number;
  avgAccuracy: number;
}

interface AnalyticsData {
  wpmTrend: Array<{ date: string; wpm: number; accuracy: number }>;
  personalRecords: {
    bestWpm: { wpm: number; date: string } | null;
    bestAccuracy: { accuracy: number; date: string } | null;
    maxStreak?: number;
    maxRankedDayStreak?: number;
  };
  modeStats?: ModeStat[];
  totalRaces?: number;
  consistencyScore?: number | null;
  avgAccuracy?: number | null;
  winRate?: number | null;
  eloTrend?: Array<{ date: string; elo: number }>;
  speedByPlacement?: Array<{ placement: number; avgWpm: number; count: number }>;
  placementDistribution?: { first: number; second: number; third: number; other: number; total: number };
  racesPerDay?: Record<string, number>;
  wordCountStats?: Array<{ wordCount: number; bestWpm: number; avgWpm: number; count: number }>;
  soloVsRanked?: {
    solo: { count: number; bestWpm: number; avgWpm: number; avgAccuracy: number } | null;
    ranked: { count: number; bestWpm: number; avgWpm: number; avgAccuracy: number } | null;
  };
}

const MODE_FILTERS = [
  { value: "all", label: "All" },
  { value: "solo", label: "Solo" },
  { value: "words", label: "Words" },
  { value: "quotes", label: "Quotes" },
  { value: "code", label: "Code" },
  { value: "special", label: "Mixed" },
] as const;

const RANGE_FILTERS = [
  { value: "7d", label: "7d" },
  { value: "30d", label: "30d" },
  { value: "3m", label: "3mo" },
  { value: "all", label: "All" },
] as const;

const MODE_LABELS: Record<string, string> = {
  words: "Words",
  quotes: "Quotes",
  code: "Code",
  special: "Mixed",
};

type Tab = "overview" | "accuracy" | "progress";

export default function AnalyticsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bigrams, setBigrams] = useState<Array<{ bigram: string; correct: number; total: number; accuracy: number }>>([]);
  const [keyStats, setKeyStats] = useState<KeyStatsMap | null>(null);
  const [modeFilter, setModeFilter] = useState<string>("all");
  const [rangeFilter, setRangeFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [exporting, setExporting] = useState(false);
  const [breakdownView, setBreakdownView] = useState<"mode" | "wordcount">("mode");

  const isPro = session?.user?.isPro ?? false;

  const handleExport = async (format: "json" | "csv") => {
    setExporting(true);
    try {
      const res = await fetch(`/api/export?type=all&format=${format}`);
      if (!res.ok) return;

      if (format === "csv") {
        const text = await res.text();
        const blob = new Blob([text], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `typeoff-data-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        const json = await res.json();
        const blob = new Blob([JSON.stringify(json, null, 2)], {
          type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `typeoff-data-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } finally {
      setExporting(false);
    }
  };

  if (status === "unauthenticated") {
    return (
      <SignInPrompt
        title="Sign in to view analytics"
        message="Sign in to see your per-key heatmaps, bigram accuracy, and WPM trends."
      />
    );
  }

  useEffect(() => {
    if (!session?.user?.id) return;
    setLoading(true);
    const params = new URLSearchParams();
    if (modeFilter !== "all") params.set("mode", modeFilter);
    if (rangeFilter !== "all") params.set("range", rangeFilter);
    const qs = params.toString();
    const url = `/api/analytics${qs ? `?${qs}` : ""}`;
    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load analytics");
        return r.json();
      })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [session?.user?.id, modeFilter, rangeFilter]);

  useEffect(() => {
    if (!session?.user?.id) return;
    fetch("/api/bigram-accuracy")
      .then((r) => r.json())
      .then((d) => { if (d.bigrams) setBigrams(d.bigrams); })
      .catch(() => {});
    fetch("/api/key-accuracy")
      .then((r) => r.json())
      .then((d: { all: Array<{ key: string; accuracy: number; total: number }> }) => {
        if (!d.all) return;
        const map: KeyStatsMap = {};
        for (const k of d.all) {
          map[k.key] = { correct: Math.round(k.accuracy * k.total), total: k.total };
        }
        setKeyStats(map);
      })
      .catch(() => {});
  }, [session?.user?.id]);

  const recentWpms = useMemo(() => (data?.wpmTrend ?? []).slice(-50), [data]);
  const avgWpm = useMemo(
    () => recentWpms.length > 0 ? recentWpms.reduce((s, r) => s + r.wpm, 0) / recentWpms.length : 0,
    [recentWpms]
  );

  const activityData = useMemo(() => {
    if (!data?.racesPerDay) return [];
    return Object.entries(data.racesPerDay).map(([date, count]) => ({ date, count }));
  }, [data?.racesPerDay]);

  if (status === "loading" || (loading && !data)) {
    return (
      <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-6">
        <div className="max-w-7xl mx-auto space-y-4">
          {/* Hero skeleton */}
          <div className="rounded-xl overflow-hidden ring-1 ring-white/[0.06] bg-surface/20">
            <div className="h-0.5 bg-accent/20 animate-pulse" />
            <div className="p-4 sm:p-5">
              <div className="flex items-end gap-6">
                <div className="space-y-2">
                  <div className="h-2.5 w-14 rounded bg-white/[0.06] animate-pulse" />
                  <div className="h-9 w-28 rounded bg-white/[0.06] animate-pulse" />
                </div>
                <div className="flex-1 grid grid-cols-3 gap-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="space-y-1.5">
                      <div className="h-2 w-10 rounded bg-white/[0.06] animate-pulse" />
                      <div className="h-5 w-16 rounded bg-white/[0.06] animate-pulse" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          {/* Content skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="h-48 rounded-xl bg-surface/20 ring-1 ring-white/[0.04] animate-pulse" />
            <div className="h-48 rounded-xl bg-surface/20 ring-1 ring-white/[0.04] animate-pulse" />
          </div>
        </div>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-2">
          <p className="text-sm text-error">{error ?? "Failed to load analytics"}</p>
          <button onClick={() => window.location.reload()} className="text-xs text-accent hover:underline">
            Try again
          </button>
        </div>
      </main>
    );
  }

  // Trend indicator: compare last 5 vs previous 5
  const trendDelta = (() => {
    if (recentWpms.length < 10) return null;
    const recent5 = recentWpms.slice(-5).reduce((s, r) => s + r.wpm, 0) / 5;
    const prev5 = recentWpms.slice(-10, -5).reduce((s, r) => s + r.wpm, 0) / 5;
    return recent5 - prev5;
  })();

  const TABS: { id: Tab; label: string; pro?: boolean }[] = [
    { id: "overview", label: "Overview" },
    { id: "accuracy", label: "Accuracy" },
    ...(isPro ? [{ id: "progress" as Tab, label: "Progress", pro: true }] : []),
  ];

  return (
    <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-8">
      <div className="max-w-7xl mx-auto">

        {/* -- Hero Stats ------------------------------------------------- */}
        <div
          className="relative rounded-xl overflow-hidden ring-1 ring-white/[0.06] mb-5 animate-fade-in"
        >
          {/* Top accent line */}
          <div className="h-[2px] bg-gradient-to-r from-transparent via-accent to-transparent opacity-60" />

          {/* Subtle radial glow */}
          <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top_left,rgba(77,158,255,0.06),transparent_50%)]" />

          <div className="relative px-5 sm:px-6 py-5 sm:py-6">
            {/* Header row */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <h1 className="text-base font-bold text-text tracking-tight">Analytics</h1>
                {isPro && data.totalRaces != null && (
                  <span className="text-sm text-muted/60 tabular-nums">
                    {data.soloVsRanked?.ranked && data.soloVsRanked?.solo
                      ? `${data.soloVsRanked.ranked.count} races + ${data.soloVsRanked.solo.count} solo`
                      : `${data.totalRaces} races analyzed`
                    }
                  </span>
                )}
              </div>
              {/* Export + filters */}
              <div className="flex items-center gap-2">
              {isPro && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleExport("json")}
                    disabled={exporting}
                    className="text-xs text-muted/60 hover:text-accent transition-colors disabled:opacity-50 px-2 py-1"
                    title="Export all data as JSON"
                  >
                    {exporting ? "..." : "JSON"}
                  </button>
                  <button
                    onClick={() => handleExport("csv")}
                    disabled={exporting}
                    className="text-xs text-muted/60 hover:text-accent transition-colors disabled:opacity-50 px-2 py-1"
                    title="Export race data as CSV"
                  >
                    CSV
                  </button>
                </div>
              )}
              {/* Time range filter */}
              <div className="flex items-center gap-0.5 bg-white/[0.02] rounded-lg p-0.5 ring-1 ring-white/[0.04]">
                {RANGE_FILTERS.map((f) => (
                  <button
                    key={f.value}
                    onClick={() => setRangeFilter(f.value)}
                    className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                      rangeFilter === f.value
                        ? "bg-accent/15 text-accent shadow-sm shadow-accent/10"
                        : "text-muted/60 hover:text-text"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              {/* Mode filter */}
              <div className="flex items-center gap-0.5 bg-white/[0.02] rounded-lg p-0.5 ring-1 ring-white/[0.04]">
                {MODE_FILTERS.map((f) => (
                  <button
                    key={f.value}
                    onClick={() => setModeFilter(f.value)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                      modeFilter === f.value
                        ? "bg-accent/15 text-accent shadow-sm shadow-accent/10"
                        : "text-muted/60 hover:text-text"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              </div>
            </div>

            <div className={`transition-opacity duration-200 ${loading && data ? "opacity-50 pointer-events-none" : ""}`}>
              {/* Primary + secondary stats */}
              <div className="flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-8">
                {/* Primary: Best WPM */}
                <div className="shrink-0">
                  <div className="text-xs text-muted/60 uppercase tracking-widest mb-1.5 font-medium">Best WPM</div>
                  <div className="flex items-baseline gap-0.5">
                    <span className="text-4xl sm:text-5xl font-black text-accent tabular-nums leading-none tracking-tight">
                      {data.personalRecords.bestWpm ? Math.floor(data.personalRecords.bestWpm.wpm) : "\u2014"}
                    </span>
                    {data.personalRecords.bestWpm && (
                      <span className="text-xl font-bold text-accent/55 tabular-nums">
                        .{(data.personalRecords.bestWpm.wpm % 1).toFixed(2).slice(2)}
                      </span>
                    )}
                    {trendDelta !== null && (
                      <span className={`ml-2 text-sm font-bold tabular-nums ${trendDelta >= 0 ? "text-correct/80" : "text-error/80"}`}>
                        {trendDelta >= 0 ? "+" : ""}{trendDelta.toFixed(1)}
                      </span>
                    )}
                  </div>
                  {data.personalRecords.bestWpm && (
                    <div className="text-xs text-muted/50 mt-1 tabular-nums">
                      {new Date(data.personalRecords.bestWpm.date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                    </div>
                  )}
                </div>

                {/* Divider */}
                <div className="hidden sm:block w-px h-12 bg-white/[0.08] self-center" />

                {/* Secondary stats grid */}
                <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3">
                  <StatCell
                    label="Best Accuracy"
                    value={data.personalRecords.bestAccuracy ? `${data.personalRecords.bestAccuracy.accuracy.toFixed(1)}%` : "\u2014"}
                    sub={data.personalRecords.bestAccuracy
                      ? new Date(data.personalRecords.bestAccuracy.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })
                      : undefined
                    }
                  />
                  {isPro && (
                    <>
                      <StatCell
                        label="Avg WPM"
                        value={avgWpm > 0 ? avgWpm.toFixed(1) : "\u2014"}
                        sub="last 50 races"
                      />
                      <StatCell
                        label="Consistency"
                        value={data.consistencyScore != null ? `\u00B1${data.consistencyScore.toFixed(1)}` : "\u2014"}
                        sub="std dev"
                      />
                      <StatCell
                        label="Win Rate"
                        value={data.winRate != null ? `${data.winRate}%` : "\u2014"}
                        sub="multiplayer"
                      />
                      <StatCell
                        label="Best Streak"
                        value={String(data.personalRecords.maxStreak ?? 0)}
                        sub="consecutive"
                      />
                      <StatCell
                        label="Day Streak"
                        value={String(data.personalRecords.maxRankedDayStreak ?? 0)}
                        sub="ranked days"
                      />
                    </>
                  )}
                  {!isPro && (
                    <StatCell
                      label="Avg WPM"
                      value={avgWpm > 0 ? avgWpm.toFixed(1) : "\u2014"}
                      sub={`last ${recentWpms.length} races`}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* -- Tab Navigation -------------------------------------------- */}
        <div
          className="flex items-center gap-1 mb-5 border-b border-white/[0.06] animate-fade-in"
        >
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative px-4 py-2.5 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "text-accent"
                  : "text-muted/60 hover:text-text"
              }`}
            >
              {tab.label}
              {tab.pro && (
                <span className="ml-1 text-[11px] font-black tracking-wider text-accent/60 uppercase">pro</span>
              )}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-2 right-2 h-[2px] bg-accent rounded-full" />
              )}
            </button>
          ))}
        </div>

        <div className={`transition-opacity duration-200 ${loading && data ? "opacity-50 pointer-events-none" : ""}`}>

        {/* -- Overview Tab ---------------------------------------------- */}
        {activeTab === "overview" && (
          <div className="space-y-4 animate-fade-in">
            {isPro ? (
              <>
                {/* Row 1: Insights + Activity side by side */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {(bigrams.length > 0 || (keyStats && Object.keys(keyStats).length > 0)) && (
                    <Card title="Insights" subtitle="estimated WPM cost from weak spots">
                      <AnalyticsInsights
                        weakKeys={keyStats ? Object.entries(keyStats).map(([key, stat]) => ({
                          key,
                          accuracy: stat.total > 0 ? stat.correct / stat.total : 1,
                          total: stat.total,
                        })) : []}
                        weakBigrams={bigrams.map((b) => ({ bigram: b.bigram, accuracy: b.accuracy / 100, total: b.total }))}
                        avgWpm={avgWpm}
                      />
                    </Card>
                  )}

                  {activityData.length > 0 && (
                    <Card title="Activity">
                      <ActivityCalendar activity={activityData} />
                    </Card>
                  )}
                </div>

                {/* Row 2: WPM + ELO charts side by side */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {data.wpmTrend.length >= 2 && (
                    <Card title="WPM Trend" flush>
                      <WpmTrendChart points={data.wpmTrend} />
                    </Card>
                  )}

                  {(data.eloTrend?.length ?? 0) >= 2 && (
                    <Card title="ELO Trend">
                      <div>
                        <EloMiniChart eloTrend={data.eloTrend!} color="#eab308" height={220} />
                      </div>
                    </Card>
                  )}
                </div>

                {/* Row 3: By Mode/Word Count + Speed by Placement + Solo vs Ranked */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {(() => {
                    const hasMode = modeFilter === "all" && (data.modeStats?.length ?? 0) > 0;
                    const hasWordCount = (data.wordCountStats?.length ?? 0) > 0;
                    if (!hasMode && !hasWordCount) return null;
                    return (
                      <Card
                        title={breakdownView === "mode" ? "By Mode" : "By Word Count"}
                        headerRight={hasMode && hasWordCount ? (
                          <div className="flex items-center gap-0.5 bg-white/[0.02] rounded-lg p-0.5 ring-1 ring-white/[0.04]">
                            <button
                              onClick={() => setBreakdownView("mode")}
                              className={`px-2 py-1 rounded-md text-xs font-medium transition-all ${
                                breakdownView === "mode"
                                  ? "bg-accent/15 text-accent shadow-sm shadow-accent/10"
                                  : "text-muted/60 hover:text-text"
                              }`}
                            >
                              Mode
                            </button>
                            <button
                              onClick={() => setBreakdownView("wordcount")}
                              className={`px-2 py-1 rounded-md text-xs font-medium transition-all ${
                                breakdownView === "wordcount"
                                  ? "bg-accent/15 text-accent shadow-sm shadow-accent/10"
                                  : "text-muted/60 hover:text-text"
                              }`}
                            >
                              Words
                            </button>
                          </div>
                        ) : undefined}
                      >
                        {breakdownView === "mode" && hasMode ? (
                          <div className="space-y-0 divide-y divide-white/[0.04]">
                            {(data.modeStats ?? []).map((m) => {
                              const maxBest = Math.max(...(data.modeStats ?? []).map((s) => s.bestWpm), 1);
                              const barPct = (m.bestWpm / maxBest) * 100;
                              return (
                                <button
                                  key={m.modeCategory}
                                  onClick={() => setModeFilter(m.modeCategory)}
                                  className="group w-full flex items-center gap-3 py-2.5 text-left transition-colors hover:bg-white/[0.02] -mx-1 px-1 rounded first:pt-0 last:pb-0"
                                >
                                  <span className="text-xs text-muted/55 uppercase tracking-wider w-14 shrink-0 group-hover:text-accent/70 transition-colors font-medium">
                                    {MODE_LABELS[m.modeCategory] ?? m.modeCategory}
                                  </span>
                                  <div className="flex-1 flex items-center gap-3 min-w-0">
                                    <div className="flex-1 h-1 rounded-full bg-white/[0.04] overflow-hidden">
                                      <div className="h-full rounded-full bg-accent/30 group-hover:bg-accent/45 transition-colors" style={{ width: `${barPct}%` }} />
                                    </div>
                                    <span className="text-sm font-bold text-text tabular-nums w-8 text-right">{Math.floor(m.bestWpm)}</span>
                                    <span className="text-xs text-muted/40 tabular-nums w-16 text-right">{Math.floor(m.avgWpm)} avg</span>
                                    <span className="text-xs text-muted/30 tabular-nums w-10 text-right">{m.racesPlayed}</span>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        ) : hasWordCount ? (
                          <div className="space-y-0 divide-y divide-white/[0.04]">
                            {data.wordCountStats!.map((wc) => {
                              const label = wc.wordCount >= 150 ? "150+" : String(wc.wordCount);
                              const maxBest = Math.max(...data.wordCountStats!.map((s) => s.bestWpm), 1);
                              const barPct = (wc.bestWpm / maxBest) * 100;
                              return (
                                <div key={wc.wordCount} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                                  <span className="text-xs text-muted/55 tabular-nums w-12 shrink-0 font-medium text-right">{label}</span>
                                  <div className="flex-1 h-1 rounded-full bg-white/[0.04] overflow-hidden">
                                    <div className="h-full rounded-full bg-accent/30" style={{ width: `${barPct}%` }} />
                                  </div>
                                  <span className="text-sm font-bold text-text tabular-nums w-8 text-right">{Math.floor(wc.bestWpm)}</span>
                                  <span className="text-xs text-muted/40 tabular-nums w-16 text-right">{Math.floor(wc.avgWpm)} avg</span>
                                  <span className="text-xs text-muted/30 tabular-nums w-10 text-right">{wc.count}</span>
                                </div>
                              );
                            })}
                          </div>
                        ) : null}
                      </Card>
                    );
                  })()}

                  {(data.speedByPlacement?.length ?? 0) > 0 && (
                    <Card title="Speed by Placement">
                      <div className="space-y-0 divide-y divide-white/[0.04]">
                        {data.speedByPlacement!.map((p) => {
                          const ord = p.placement === 1 ? "1st" : p.placement === 2 ? "2nd" : p.placement === 3 ? "3rd" : `${p.placement}th`;
                          const color = p.placement === 1 ? "text-rank-gold" : p.placement === 2 ? "text-rank-silver" : p.placement === 3 ? "text-rank-bronze" : "text-muted/50";
                          const barColor = p.placement === 1 ? "bg-rank-gold/40" : p.placement === 2 ? "bg-rank-silver/30" : p.placement === 3 ? "bg-rank-bronze/30" : "bg-muted/15";
                          const maxWpm = Math.max(...data.speedByPlacement!.map((s) => s.avgWpm), 1);
                          const barPct = (p.avgWpm / maxWpm) * 100;
                          return (
                            <div key={p.placement} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                              <span className={`text-xs font-bold ${color} w-7 shrink-0 uppercase tracking-wider`}>{ord}</span>
                              <div className="flex-1 h-1 rounded-full bg-white/[0.04] overflow-hidden">
                                <div className={`h-full rounded-full ${barColor}`} style={{ width: `${barPct}%` }} />
                              </div>
                              <span className="text-sm font-bold text-text tabular-nums w-8 text-right">{Math.floor(p.avgWpm)}</span>
                              <span className="text-xs text-muted/35 tabular-nums w-10 text-right">{p.count}</span>
                            </div>
                          );
                        })}
                      </div>
                      {data.placementDistribution && data.placementDistribution.total >= 5 && (
                        <div className="mt-3 pt-3 border-t border-white/[0.04]">
                          <PlacementBar dist={data.placementDistribution} />
                        </div>
                      )}
                    </Card>
                  )}

                </div>

                {/* Solo vs Ranked comparison */}
                {data.soloVsRanked?.solo && data.soloVsRanked?.ranked && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Card title="Solo vs Ranked">
                      <div className="grid grid-cols-2 gap-4">
                        {([
                          { label: "Solo", stats: data.soloVsRanked.solo, accent: "text-accent" },
                          { label: "Ranked", stats: data.soloVsRanked.ranked, accent: "text-rank-gold" },
                        ] as const).map(({ label, stats, accent }) => (
                          <div key={label}>
                            <div className={`text-xs font-bold uppercase tracking-widest mb-3 ${accent}`}>{label}</div>
                            <div className="space-y-2.5">
                              <div className="flex items-baseline justify-between">
                                <span className="text-xs text-muted/50">Played</span>
                                <span className="text-sm font-bold text-text tabular-nums">{stats.count}</span>
                              </div>
                              <div className="flex items-baseline justify-between">
                                <span className="text-xs text-muted/50">Best</span>
                                <span className="text-sm font-bold text-text tabular-nums">{Math.floor(stats.bestWpm)}</span>
                              </div>
                              <div className="flex items-baseline justify-between">
                                <span className="text-xs text-muted/50">Avg WPM</span>
                                <span className="text-sm font-bold text-text tabular-nums">{Math.floor(stats.avgWpm)}</span>
                              </div>
                              <div className="flex items-baseline justify-between">
                                <span className="text-xs text-muted/50">Accuracy</span>
                                <span className="text-sm font-bold text-text tabular-nums">{stats.avgAccuracy.toFixed(1)}%</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </Card>
                  </div>
                )}
              </>
            ) : (
              /* Free user overview */
              <div className="space-y-4">
                {/* WPM Trend Chart */}
                {data.wpmTrend.length >= 2 && (
                  <Card title="WPM Trend" subtitle="(last 20 races)" flush>
                    <WpmTrendChart points={data.wpmTrend} />
                  </Card>
                )}

                {/* By Mode */}
                {modeFilter === "all" && (data.modeStats?.length ?? 0) > 0 && (
                  <Card title="By Mode">
                    <div className="space-y-0 divide-y divide-white/[0.04]">
                      {(data.modeStats ?? []).map((m) => {
                        const maxBest = Math.max(...(data.modeStats ?? []).map((s) => s.bestWpm), 1);
                        const barPct = (m.bestWpm / maxBest) * 100;
                        return (
                          <div
                            key={m.modeCategory}
                            className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0"
                          >
                            <span className="text-xs text-muted/55 uppercase tracking-wider w-14 shrink-0 font-medium">
                              {MODE_LABELS[m.modeCategory] ?? m.modeCategory}
                            </span>
                            <div className="flex-1 h-1 rounded-full bg-white/[0.04] overflow-hidden">
                              <div className="h-full rounded-full bg-accent/30" style={{ width: `${barPct}%` }} />
                            </div>
                            <span className="text-sm font-bold text-text tabular-nums w-8 text-right">{Math.floor(m.bestWpm)}</span>
                            <span className="text-xs text-muted/30 tabular-nums w-10 text-right">{m.racesPlayed}</span>
                          </div>
                        );
                      })}
                    </div>
                  </Card>
                )}

                {/* Activity Calendar */}
                {activityData.length > 0 && (
                  <Card title="Activity">
                    <ActivityCalendar activity={activityData} />
                  </Card>
                )}

                {/* Free bigram preview */}
                {bigrams.length > 0 && <FreeBigramPreview bigrams={bigrams} keyStats={keyStats} avgWpm={avgWpm} />}

                {/* Pro upsell */}
                <ProUpsell />
              </div>
            )}
          </div>
        )}

        {/* -- Accuracy Tab (merged Keys + Bigrams) ---------------------- */}
        {activeTab === "accuracy" && (
          <div className="space-y-4 animate-fade-in">
            {/* Row 1: Keyboard Heatmap + Bigram Heatmap side by side */}
            {(keyStats && Object.keys(keyStats).length > 0) || bigrams.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {keyStats && Object.keys(keyStats).length > 0 && (
                  <Card
                    title="Keyboard Heatmap"
                    headerRight={
                      isPro ? (
                        <Link
                          href="/solo?drill=true"
                          className="px-3.5 py-1.5 rounded-lg bg-accent/10 ring-1 ring-accent/20 text-sm font-semibold text-accent hover:bg-accent/15 transition-colors"
                        >
                          Start Practice
                        </Link>
                      ) : undefined
                    }
                  >
                    <KeyboardHeatmap keyStats={keyStats} />
                  </Card>
                )}
                {bigrams.length > 0 && (
                  <Card title="Bigram Heatmap" subtitle="rows = first char, cols = second char">
                    <BigramHeatmap bigrams={bigrams} />
                  </Card>
                )}
              </div>
            ) : (
              <EmptyState message="Complete more typing tests to see accuracy data." />
            )}

            {/* Row 2: Weakest Bigrams list */}
            {bigrams.length > 0 ? (
              <>
                {isPro ? (
                  <Card
                    title="Weakest Bigrams"
                    headerRight={
                      <button
                        onClick={() => {
                          const worst = bigrams
                            .filter((b) => b.total >= 5)
                            .sort((a, b) => a.accuracy - b.accuracy)
                            .slice(0, 10)
                            .map((b) => b.bigram);
                          if (worst.length > 0) router.push(`/solo?bigrams=${worst.join(",")}`);
                        }}
                        className="px-3.5 py-1.5 rounded-lg bg-accent/10 ring-1 ring-accent/20 text-sm font-semibold text-accent hover:bg-accent/15 transition-colors"
                      >
                        Practice These
                      </button>
                    }
                  >
                    <BigramAnalysis bigrams={bigrams} />
                  </Card>
                ) : (
                  <>
                    <FreeBigramPreview bigrams={bigrams} keyStats={keyStats} avgWpm={avgWpm} />
                    <ProUpsell />
                  </>
                )}
              </>
            ) : null}
          </div>
        )}

        {/* -- Progress Tab (Pro) ---------------------------------------- */}
        {activeTab === "progress" && isPro && (
          <div className="space-y-4 animate-fade-in">
            <Card title="Practice Progress" subtitle="accuracy trends over time">
              <PracticeProgress />
            </Card>
          </div>
        )}

        </div>
      </div>
    </main>
  );
}

/* -- Shared Components -------------------------------------------------- */

function StatCell({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <div className="text-xs text-muted/55 uppercase tracking-widest mb-1 font-medium">{label}</div>
      <div className="text-base font-bold text-text tabular-nums leading-tight">{value}</div>
      {sub && <div className="text-xs text-muted/45 tabular-nums mt-0.5">{sub}</div>}
    </div>
  );
}

function Card({
  title,
  subtitle,
  headerRight,
  flush,
  children,
}: {
  title: string;
  subtitle?: string;
  headerRight?: React.ReactNode;
  flush?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-xl bg-surface/25 ring-1 ring-white/[0.05] overflow-hidden animate-fade-in flex flex-col"
    >
      <div className="px-4 sm:px-5 pt-4 pb-2.5 flex items-center justify-between">
        <div className="flex items-baseline gap-2.5">
          <h2 className="text-sm font-bold text-muted/70 uppercase tracking-widest">{title}</h2>
          {subtitle && <span className="text-xs text-muted/45">{subtitle}</span>}
        </div>
        {headerRight}
      </div>
      <div className={`flex-1 ${flush ? "pb-2" : "px-4 sm:px-5 pb-4"}`}>{children}</div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-xl bg-surface/20 ring-1 ring-white/[0.04] px-6 py-12 text-center animate-fade-in">
      <div className="text-muted/55 text-2xl mb-3">{"\u2328"}</div>
      <p className="text-sm text-muted/55">{message}</p>
    </div>
  );
}

function PlacementBar({ dist }: {
  dist: { first: number; second: number; third: number; other: number; total: number };
}) {
  const { first, second, third, other, total } = dist;
  if (total === 0) return null;
  const pct = (n: number) => Math.round((n / total) * 100);
  const segments = [
    { label: "1st", count: first, pct: pct(first), color: "bg-rank-gold", textColor: "text-rank-gold" },
    { label: "2nd", count: second, pct: pct(second), color: "bg-rank-silver", textColor: "text-rank-silver" },
    { label: "3rd", count: third, pct: pct(third), color: "bg-rank-bronze", textColor: "text-rank-bronze" },
    { label: "4th+", count: other, pct: pct(other), color: "bg-muted/30", textColor: "text-muted/50" },
  ];
  return (
    <div>
      <div className="flex h-1.5 rounded-full overflow-hidden gap-px">
        {segments.map((s) =>
          s.count > 0 ? (
            <div
              key={s.label}
              className={`${s.color} opacity-60`}
              style={{ width: `${s.pct}%` }}
              title={`${s.label}: ${s.count} (${s.pct}%)`}
            />
          ) : null
        )}
      </div>
      <div className="flex gap-4 mt-2">
        {segments.map((s) => (
          <div key={s.label} className="flex items-center gap-1">
            <span className={`text-xs font-bold tabular-nums ${s.textColor}`}>{s.pct}%</span>
            <span className="text-xs text-muted/50">{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function FreeBigramPreview({
  bigrams,
  keyStats,
  avgWpm,
}: {
  bigrams: Array<{ bigram: string; correct: number; total: number; accuracy: number }>;
  keyStats: KeyStatsMap | null;
  avgWpm: number;
}) {
  const meaningful = bigrams.filter((b) => b.total >= 10);
  meaningful.sort((a, b) => a.accuracy - b.accuracy);
  const worst5 = meaningful.slice(0, 5);

  const teaserInsight = worst5.length > 0
    ? (() => {
        const rawKeys = keyStats
          ? Object.entries(keyStats).map(([key, stat]) => ({
              key,
              accuracy: stat.total > 0 ? stat.correct / stat.total : 1,
              total: stat.total,
            }))
          : [];
        const ranked = rankWeaknesses(rawKeys, worst5.map((b) => ({ bigram: b.bigram, accuracy: b.accuracy / 100, total: b.total })));
        const insights = estimateWpmImpact(avgWpm || 60, ranked);
        return insights[0];
      })()
    : null;

  if (worst5.length === 0) return null;

  return (
    <>
      <Card title="Weakest Bigrams">
        <div className="space-y-0 divide-y divide-white/[0.04]">
          {worst5.map((b) => {
            const accColor = b.accuracy < 70 ? "text-error/60" : b.accuracy < 90 ? "text-amber-400/60" : "text-correct/50";
            const barColor = b.accuracy < 70 ? "bg-error/30" : b.accuracy < 90 ? "bg-amber-400/25" : "bg-correct/25";
            return (
              <div key={b.bigram} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                <span className="text-accent font-bold text-sm w-8 shrink-0 text-center">{b.bigram}</span>
                <div className="flex-1 h-1 rounded-full bg-white/[0.04] overflow-hidden max-w-32">
                  <div className={`h-full rounded-full ${barColor}`} style={{ width: `${b.accuracy}%` }} />
                </div>
                <span className={`text-xs font-bold tabular-nums ${accColor}`}>
                  {Math.round(b.accuracy)}%
                </span>
              </div>
            );
          })}
        </div>
      </Card>
      {teaserInsight && (
        <div className="rounded-xl ring-1 ring-accent/10 bg-accent/[0.03] px-4 py-3 animate-fade-in">
          <p className="text-sm text-muted/70 leading-relaxed">{teaserInsight.insight}</p>
          <p className="text-xs text-muted/50 mt-1.5">Upgrade to Pro for all insights, adaptive practice, and no ads</p>
        </div>
      )}
    </>
  );
}

function ProUpsell() {
  return (
    <div
      className="relative rounded-xl overflow-hidden ring-1 ring-accent/15 animate-fade-in"
    >
      {/* Gradient top edge */}
      <div className="h-[2px] bg-gradient-to-r from-accent/30 via-accent/60 to-accent/30" />

      {/* Subtle glow background */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,rgba(77,158,255,0.04),transparent_60%)]" />

      <div className="relative px-5 py-5">
        <div className="flex items-center gap-2.5 mb-4">
          <span className="text-xs font-black tracking-[0.15em] text-accent bg-accent/10 ring-1 ring-accent/25 rounded px-2 py-0.5 leading-none">
            PRO
          </span>
          <span className="text-sm font-bold text-text/75">Unlock Full Analytics</span>
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 mb-5">
          {[
            "Ad-free experience across the site",
            "Adaptive practice for weak keys & bigrams",
            "ELO trends & placement distribution",
            "Full bigram analysis & WPM insights",
          ].map((label) => (
            <div key={label} className="flex items-start gap-2 text-sm text-text/55">
              <span className="text-accent/60 mt-px shrink-0">+</span>
              <span>{label}</span>
            </div>
          ))}
        </div>

        <Link
          href="/pro"
          className="block w-full rounded-lg bg-accent/10 ring-1 ring-accent/30 text-accent text-sm font-bold px-4 py-2.5 hover:bg-accent/20 transition-colors text-center"
        >
          Upgrade to Pro — $4.99/mo
        </Link>
        <p className="text-xs text-muted/45 text-center mt-1.5">cancel anytime</p>
      </div>
    </div>
  );
}

/** Downsample an array using LTTB (Largest-Triangle-Three-Buckets) for visual fidelity */
function downsampleLTTB<T>(data: T[], threshold: number, getValue: (d: T) => number): T[] {
  if (data.length <= threshold) return data;
  const sampled: T[] = [data[0]];
  const bucketSize = (data.length - 2) / (threshold - 2);
  let prevIdx = 0;
  for (let i = 1; i < threshold - 1; i++) {
    const rangeStart = Math.floor((i - 1) * bucketSize) + 1;
    const rangeEnd = Math.min(Math.floor(i * bucketSize) + 1, data.length);
    const nextStart = Math.floor(i * bucketSize) + 1;
    const nextEnd = Math.min(Math.floor((i + 1) * bucketSize) + 1, data.length);
    let avgY = 0;
    for (let j = nextStart; j < nextEnd; j++) avgY += getValue(data[j]);
    avgY /= (nextEnd - nextStart) || 1;
    const avgX = (nextStart + nextEnd - 1) / 2;
    let maxArea = -1;
    let maxIdx = rangeStart;
    const ax = prevIdx, ay = getValue(data[prevIdx]);
    for (let j = rangeStart; j < rangeEnd; j++) {
      const area = Math.abs((ax - avgX) * (getValue(data[j]) - ay) - (ax - j) * (avgY - ay));
      if (area > maxArea) { maxArea = area; maxIdx = j; }
    }
    sampled.push(data[maxIdx]);
    prevIdx = maxIdx;
  }
  sampled.push(data[data.length - 1]);
  return sampled;
}

/** Compute a running average with the given window size */
function runningAverage(values: number[], window: number): number[] {
  const result: number[] = [];
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= window) sum -= values[i - window];
    const count = Math.min(i + 1, window);
    result.push(sum / count);
  }
  return result;
}

function WpmTrendChart({ points }: { points: Array<{ date: string; wpm: number; accuracy: number }> }) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [showAccuracy, setShowAccuracy] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  if (points.length < 2) return null;

  const ACC_COLOR = "#22c55e";
  const W = 600;
  const H = 220;
  const pad = { top: 16, right: showAccuracy ? 36 : 8, bottom: 24, left: 36 };
  const iW = W - pad.left - pad.right;
  const iH = H - pad.top - pad.bottom;

  // Running average (window scales with data size)
  const avgWindow = Math.max(5, Math.min(50, Math.round(points.length * 0.04)));
  const avgValues = useMemo(() => runningAverage(points.map((p) => p.wpm), avgWindow), [points, avgWindow]);

  // Accuracy running average
  const accAvgValues = useMemo(() => runningAverage(points.map((p) => p.accuracy), avgWindow), [points, avgWindow]);

  // Tight Y-axis domain fitted to data (not starting at 0)
  const allWpms = points.map((p) => p.wpm);
  const rawMin = Math.min(...allWpms);
  const rawMax = Math.max(...allWpms);
  const range = rawMax - rawMin || 10;
  const niceStep = range <= 30 ? 5 : range <= 60 ? 10 : range <= 150 ? 25 : 50;
  const yMin = Math.max(0, Math.floor((rawMin - range * 0.1) / niceStep) * niceStep);
  const yMax = Math.ceil((rawMax + range * 0.05) / niceStep) * niceStep;
  const yRange = yMax - yMin || 1;
  const yTicks = Array.from(
    { length: Math.floor((yMax - yMin) / niceStep) + 1 },
    (_, i) => yMin + i * niceStep
  );

  // Accuracy Y-axis (right side) — tight range
  const allAccs = points.map((p) => p.accuracy);
  const accMin = Math.min(...allAccs);
  const accMax = Math.max(...allAccs);
  const accRange = accMax - accMin || 5;
  const accStep = accRange <= 5 ? 1 : accRange <= 15 ? 2.5 : 5;
  const accYMin = Math.max(0, Math.floor((accMin - accRange * 0.1) / accStep) * accStep);
  const accYMax = Math.min(100, Math.ceil((accMax + accRange * 0.05) / accStep) * accStep);
  const accYRange = accYMax - accYMin || 1;
  const accYTicks = Array.from(
    { length: Math.min(6, Math.floor((accYMax - accYMin) / accStep) + 1) },
    (_, i) => accYMin + i * accStep
  ).filter((v) => v <= accYMax);

  const accSy = (v: number) => pad.top + iH - ((v - accYMin) / accYRange) * iH;

  // Downsample raw dots for rendering
  const MAX_RENDER = 300;
  const renderPoints = useMemo(
    () => downsampleLTTB(points, MAX_RENDER, (p) => p.wpm),
    [points]
  );
  // Map renderPoints back to their original indices for correct X positioning
  const renderIndices = useMemo(() => {
    if (points.length <= MAX_RENDER) return points.map((_, i) => i);
    const indices: number[] = [];
    let searchFrom = 0;
    for (const rp of renderPoints) {
      const idx = points.indexOf(rp, searchFrom);
      indices.push(idx >= 0 ? idx : searchFrom);
      if (idx >= 0) searchFrom = idx + 1;
    }
    return indices;
  }, [points, renderPoints]);

  // Downsample running average line
  const avgWithIndex = useMemo(() => avgValues.map((v, i) => ({ v, i })), [avgValues]);
  const renderAvg = useMemo(
    () => downsampleLTTB(avgWithIndex, MAX_RENDER, (d) => d.v),
    [avgWithIndex]
  );

  // Downsample accuracy average line
  const accAvgWithIndex = useMemo(() => accAvgValues.map((v, i) => ({ v, i })), [accAvgValues]);
  const renderAccAvg = useMemo(
    () => downsampleLTTB(accAvgWithIndex, MAX_RENDER, (d) => d.v),
    [accAvgWithIndex]
  );

  const sx = (i: number) => pad.left + (i / (points.length - 1)) * iW;
  const sy = (v: number) => pad.top + iH - ((v - yMin) / yRange) * iH;

  // Average line path
  const avgLinePath = renderAvg.map((d, j) => `${j === 0 ? "M" : "L"} ${sx(d.i)} ${sy(d.v)}`).join(" ");
  // Average area fill
  const avgAreaPath = avgLinePath +
    ` L ${sx(renderAvg[renderAvg.length - 1].i)} ${pad.top + iH}` +
    ` L ${sx(renderAvg[0].i)} ${pad.top + iH} Z`;

  // Accuracy average line path
  const accAvgLinePath = renderAccAvg.map((d, j) => `${j === 0 ? "M" : "L"} ${sx(d.i)} ${accSy(d.v)}`).join(" ");

  function handleMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * W;
    const normalizedX = (mouseX - pad.left) / iW;
    const idx = Math.round(normalizedX * (points.length - 1));
    setHoveredIdx(Math.max(0, Math.min(points.length - 1, idx)));
  }

  const hovered = hoveredIdx !== null ? points[hoveredIdx] : null;

  return (
    <div className="relative">
      {/* Accuracy toggle */}
      <button
        onClick={() => setShowAccuracy((v) => !v)}
        className={`absolute top-1 right-2 z-10 px-2 py-1 rounded text-xs font-medium transition-all ${
          showAccuracy
            ? "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/20"
            : "text-muted/50 hover:text-muted/70"
        }`}
      >
        Accuracy
      </button>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ height: 220, cursor: "crosshair" }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoveredIdx(null)}
      >
        <defs>
          <linearGradient id="wpmAvgGrad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.15" />
            <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0.01" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {yTicks.map((t) => (
          <g key={t}>
            <line x1={pad.left} x2={W - pad.right} y1={sy(t)} y2={sy(t)} stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
            <text x={pad.left - 6} y={sy(t)} fill="var(--color-muted)" fontSize={10} textAnchor="end" dominantBaseline="middle" fillOpacity={0.55}>
              {t}
            </text>
          </g>
        ))}

        {/* Right Y-axis labels (accuracy) */}
        {showAccuracy && accYTicks.map((t) => (
          <text key={`acc-${t}`} x={W - pad.right + 6} y={accSy(t)} fill={ACC_COLOR} fontSize={9} textAnchor="start" dominantBaseline="middle" fillOpacity={0.5}>
            {t % 1 === 0 ? t : t.toFixed(1)}%
          </text>
        ))}

        {/* Bottom axis */}
        <line x1={pad.left} x2={W - pad.right} y1={pad.top + iH} y2={pad.top + iH} stroke="rgba(255,255,255,0.08)" strokeWidth={1} />

        {/* Average area fill */}
        <path d={avgAreaPath} fill="url(#wpmAvgGrad)" />

        {/* Raw data scatter dots (subtle) */}
        {renderPoints.map((p, j) => (
          <circle
            key={j}
            cx={sx(renderIndices[j])}
            cy={sy(p.wpm)}
            r={points.length > 200 ? 1.2 : 1.8}
            fill="var(--color-accent)"
            fillOpacity={0.25}
          />
        ))}

        {/* Running average line (prominent) */}
        <path d={avgLinePath} fill="none" stroke="var(--color-accent)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />

        {/* Accuracy running average overlay */}
        {showAccuracy && (
          <path d={accAvgLinePath} fill="none" stroke={ACC_COLOR} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" strokeOpacity={0.7} />
        )}

        {/* Best WPM marker */}
        {(() => {
          let bestIdx = 0;
          for (let i = 1; i < points.length; i++) {
            if (points[i].wpm > points[bestIdx].wpm) bestIdx = i;
          }
          const bx = sx(bestIdx);
          const by = sy(points[bestIdx].wpm);
          return (
            <g pointerEvents="none">
              <circle cx={bx} cy={by} r={3} fill="none" stroke="#eab308" strokeWidth={1.5} strokeOpacity={0.7} />
            </g>
          );
        })()}

        {/* X-axis label */}
        <text x={W / 2} y={H - 4} fill="var(--color-muted)" fontSize={10} textAnchor="middle" fillOpacity={0.4}>
          races
        </text>

        {/* Legend */}
        <g transform={`translate(${W - pad.right - (showAccuracy ? 150 : 110)}, ${pad.top - 2})`}>
          <line x1={0} y1={4} x2={12} y2={4} stroke="var(--color-accent)" strokeWidth={2} strokeLinecap="round" />
          <text x={16} y={7} fill="var(--color-muted)" fontSize={8.5} fillOpacity={0.5}>avg ({avgWindow})</text>
          <circle cx={70} cy={4} r={2} fill="var(--color-accent)" fillOpacity={0.4} />
          <text x={76} y={7} fill="var(--color-muted)" fontSize={8.5} fillOpacity={0.5}>raw</text>
          {showAccuracy && (
            <>
              <line x1={100} y1={4} x2={112} y2={4} stroke={ACC_COLOR} strokeWidth={1.5} strokeLinecap="round" strokeOpacity={0.7} />
              <text x={116} y={7} fill={ACC_COLOR} fontSize={8.5} fillOpacity={0.5}>acc</text>
            </>
          )}
        </g>

        {/* Hover tooltip */}
        {hovered !== null && hoveredIdx !== null && (() => {
          const x = sx(hoveredIdx);
          const y = sy(hovered.wpm);
          const avgY = sy(avgValues[hoveredIdx]);
          const dateStr = new Date(hovered.date).toLocaleDateString(undefined, { month: "short", day: "numeric" });
          const TOOLTIP_W = 108;
          const TOOLTIP_H = 48;
          const flipLeft = x + TOOLTIP_W + 10 > W - pad.right;
          const tx = flipLeft ? x - TOOLTIP_W - 8 : x + 8;
          const ty = Math.max(pad.top, Math.min(y - TOOLTIP_H / 2, pad.top + iH - TOOLTIP_H));

          return (
            <g pointerEvents="none">
              {/* Vertical crosshair */}
              <line x1={x} x2={x} y1={pad.top} y2={pad.top + iH} stroke="rgba(255,255,255,0.12)" strokeWidth={1} strokeDasharray="3 3" />
              {/* Raw dot */}
              <circle cx={x} cy={y} r={3.5} fill="var(--color-accent)" fillOpacity={0.6} stroke="var(--color-accent)" strokeWidth={1} />
              {/* Avg dot */}
              <circle cx={x} cy={avgY} r={3} fill="var(--color-accent)" />
              {/* Accuracy dot */}
              {showAccuracy && (
                <circle cx={x} cy={accSy(hovered.accuracy)} r={2.5} fill={ACC_COLOR} fillOpacity={0.7} />
              )}
              {/* Tooltip card */}
              <rect x={tx} y={ty} width={TOOLTIP_W} height={TOOLTIP_H} rx={5} fill="rgba(12,12,20,0.95)" stroke="rgba(255,255,255,0.08)" strokeWidth={1} />
              <text x={tx + 7} y={ty + 13} fill="var(--color-accent)" fontSize={11} fontWeight="700">
                {Math.round(hovered.wpm)} wpm
              </text>
              <text x={tx + 7} y={ty + 26} fill="var(--color-muted)" fontSize={9} fillOpacity={0.7}>
                avg {Math.round(avgValues[hoveredIdx])} · {hovered.accuracy.toFixed(1)}%
              </text>
              <text x={tx + 7} y={ty + 39} fill="var(--color-muted)" fontSize={9} fillOpacity={0.45}>
                {dateStr} · race #{hoveredIdx + 1}
              </text>
            </g>
          );
        })()}
      </svg>
    </div>
  );
}

function EloMiniChart({ eloTrend, color, height }: { eloTrend: Array<{ date: string; elo: number }>; color: string; height: number }) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  if (eloTrend.length < 2) return null;

  const data = eloTrend.map((r) => r.elo);
  const renderData = useMemo(
    () => downsampleLTTB(eloTrend, 200, (d) => d.elo),
    [eloTrend]
  );

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const padding = { top: 12, right: 16, bottom: 20, left: 44 };
  const w = 600;
  const innerW = w - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const niceStep = range <= 100 ? 25 : range <= 300 ? 50 : 100;
  const yMin = Math.floor(min / niceStep) * niceStep;
  const yMax = Math.ceil(max * 1.05 / niceStep) * niceStep;
  const yRange = yMax - yMin || 1;
  const tickCount = Math.min(5, Math.max(2, Math.ceil(yRange / niceStep)));
  const yTicks = Array.from({ length: tickCount + 1 }, (_, i) => yMin + i * niceStep).filter((v) => v <= yMax);

  const renderScaleX = (i: number) => padding.left + (i / (renderData.length - 1)) * innerW;
  const scaleX = (i: number) => padding.left + (i / (data.length - 1)) * innerW;
  const scaleY = (v: number) => padding.top + innerH - ((v - yMin) / yRange) * innerH;

  const linePath = renderData.map((d, i) => `${i === 0 ? "M" : "L"} ${renderScaleX(i)} ${scaleY(d.elo)}`).join(" ");
  const areaPath = linePath +
    ` L ${renderScaleX(renderData.length - 1)} ${padding.top + innerH}` +
    ` L ${renderScaleX(0)} ${padding.top + innerH} Z`;

  const gradId = `areaGrad-${color.replace("#", "")}`;

  function handleMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * w;
    const normalizedX = (mouseX - padding.left) / innerW;
    const idx = Math.round(normalizedX * (data.length - 1));
    setHoveredIdx(Math.max(0, Math.min(data.length - 1, idx)));
  }

  const hovered = hoveredIdx !== null ? eloTrend[hoveredIdx] : null;

  return (
    <svg ref={svgRef} viewBox={`0 0 ${w} ${height}`} className="w-full h-full" style={{ cursor: "crosshair" }} onMouseMove={handleMouseMove} onMouseLeave={() => setHoveredIdx(null)}>
      <defs>
        <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {yTicks.map((tick) => (
        <g key={tick}>
          <line
            x1={padding.left}
            x2={w - padding.right}
            y1={scaleY(tick)}
            y2={scaleY(tick)}
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={1}
          />
          <text
            x={padding.left - 6}
            y={scaleY(tick)}
            fill="var(--color-muted)"
            fontSize={11}
            textAnchor="end"
            dominantBaseline="middle"
            fillOpacity={0.5}
          >
            {tick}
          </text>
        </g>
      ))}

      <line
        x1={padding.left}
        x2={w - padding.right}
        y1={padding.top + innerH}
        y2={padding.top + innerH}
        stroke="rgba(255,255,255,0.08)"
        strokeWidth={1}
      />

      <path d={areaPath} fill={`url(#${gradId})`} />

      <path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <text x={w - padding.right} y={scaleY(max) - 6} textAnchor="end" fill={color} opacity="0.5" fontSize="10" fontWeight="700">
        {Math.floor(max)}
      </text>
      <text x={w - padding.right} y={scaleY(min) + 12} textAnchor="end" fill={color} opacity="0.5" fontSize="10" fontWeight="700">
        {Math.floor(min)}
      </text>

      <text
        x={w / 2}
        y={padding.top + innerH + 14}
        fill="var(--color-muted)"
        fontSize={10}
        textAnchor="middle"
        fillOpacity={0.4}
      >
        races
      </text>

      {/* Hover tooltip */}
      {hovered !== null && hoveredIdx !== null && (() => {
        const x = scaleX(hoveredIdx);
        const y = scaleY(hovered.elo);
        const dateStr = new Date(hovered.date).toLocaleDateString(undefined, { month: "short", day: "numeric" });
        const TOOLTIP_W = 90;
        const TOOLTIP_H = 32;
        const flipLeft = x + TOOLTIP_W + 10 > w - padding.right;
        const tx = flipLeft ? x - TOOLTIP_W - 6 : x + 6;
        const ty = Math.max(padding.top, Math.min(y - TOOLTIP_H / 2, padding.top + innerH - TOOLTIP_H));

        return (
          <g pointerEvents="none">
            <line x1={x} x2={x} y1={padding.top} y2={padding.top + innerH} stroke="rgba(255,255,255,0.15)" strokeWidth={1} strokeDasharray="3 3" />
            <circle cx={x} cy={y} r={3.5} fill={color} />
            <rect x={tx} y={ty} width={TOOLTIP_W} height={TOOLTIP_H} rx={4} fill="rgba(12,12,20,0.92)" stroke="rgba(255,255,255,0.08)" strokeWidth={1} />
            <text x={tx + 6} y={ty + 12} fill={color} fontSize={11} fontWeight="700">
              {Math.round(hovered.elo)} elo
            </text>
            <text x={tx + 6} y={ty + 24} fill="var(--color-muted)" fontSize={9} fillOpacity={0.6}>
              {dateStr}
            </text>
          </g>
        );
      })()}
    </svg>
  );
}
