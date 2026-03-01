"use client";

import { useEffect, useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { SignInPrompt } from "@/components/auth/SignInPrompt";
import Link from "next/link";
import { BigramAnalysis } from "@/components/practice/BigramAnalysis";
import { BigramHeatmap } from "@/components/practice/BigramHeatmap";
import { KeyboardHeatmap } from "@/components/typing/KeyboardHeatmap";
import { WpmChart } from "@/components/typing/WpmChart";
import type { KeyStatsMap, WpmSample } from "@typeoff/shared";
import { estimateWpmImpact, rankWeaknesses } from "@typeoff/shared";
import { AnalyticsInsights } from "@/components/analytics/AnalyticsInsights";
import { PracticeProgress } from "@/components/practice/PracticeProgress";

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
}

const MODE_FILTERS = [
  { value: "all", label: "All" },
  { value: "solo", label: "Solo" },
  { value: "words", label: "Words" },
  { value: "quotes", label: "Quotes" },
  { value: "code", label: "Code" },
  { value: "special", label: "Special" },
] as const;

const MODE_LABELS: Record<string, string> = {
  words: "Words",
  quotes: "Quotes",
  code: "Code",
  special: "Special",
};

type Tab = "overview" | "keys" | "bigrams" | "progress";

export default function AnalyticsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bigrams, setBigrams] = useState<Array<{ bigram: string; correct: number; total: number; accuracy: number }>>([]);
  const [keyStats, setKeyStats] = useState<KeyStatsMap | null>(null);
  const [modeFilter, setModeFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  const isPro = session?.user?.isPro ?? false;

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
    const url = modeFilter !== "all" ? `/api/analytics?mode=${modeFilter}` : "/api/analytics";
    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load analytics");
        return r.json();
      })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [session?.user?.id, modeFilter]);

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

  if (status === "loading" || (loading && !data)) {
    return (
      <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-6">
        <div className="max-w-5xl mx-auto space-y-4">
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

  const wpmSamples: WpmSample[] = data.wpmTrend.map((r, i) => ({
    elapsed: i + 1,
    wpm: r.wpm,
    raw: r.wpm,
  }));

  // Trend indicator: compare last 5 vs previous 5
  const trendDelta = (() => {
    if (recentWpms.length < 10) return null;
    const recent5 = recentWpms.slice(-5).reduce((s, r) => s + r.wpm, 0) / 5;
    const prev5 = recentWpms.slice(-10, -5).reduce((s, r) => s + r.wpm, 0) / 5;
    return recent5 - prev5;
  })();

  // Activity data
  const last30Days: { date: string; count: number; dayOfWeek: number }[] = [];
  if (data.racesPerDay) {
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      last30Days.push({ date: key, count: data.racesPerDay[key] ?? 0, dayOfWeek: d.getDay() });
    }
  }
  const maxDayCount = Math.max(1, ...last30Days.map((d) => d.count));
  const totalRacesLast30 = last30Days.reduce((s, d) => s + d.count, 0);

  const TABS: { id: Tab; label: string; pro?: boolean }[] = [
    { id: "overview", label: "Overview" },
    { id: "keys", label: "Key Accuracy" },
    { id: "bigrams", label: "Bigrams" },
    ...(isPro ? [{ id: "progress" as Tab, label: "Progress", pro: true }] : []),
  ];

  return (
    <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-6">
      <div className="max-w-5xl mx-auto">

        {/* ── Hero Stats ─────────────────────────────────────── */}
        <div
          className="relative rounded-xl overflow-hidden ring-1 ring-white/[0.06] mb-4 animate-fade-in"
          style={{ animationDelay: "0ms" }}
        >
          {/* Top accent line */}
          <div className="h-[2px] bg-gradient-to-r from-transparent via-accent to-transparent opacity-60" />

          {/* Subtle radial glow */}
          <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top_left,rgba(77,158,255,0.06),transparent_50%)]" />

          <div className="relative px-4 sm:px-5 py-3.5 sm:py-4">
            {/* Header row */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <h1 className="text-sm font-bold text-text tracking-tight">Analytics</h1>
                {isPro && data.totalRaces != null && (
                  <span className="text-[10px] text-muted/50 tabular-nums">{data.totalRaces} races analyzed</span>
                )}
              </div>
              {/* Mode filter pills */}
              <div className="flex items-center gap-0.5 bg-white/[0.02] rounded-lg p-0.5 ring-1 ring-white/[0.04]">
                {MODE_FILTERS.map((f) => (
                  <button
                    key={f.value}
                    onClick={() => setModeFilter(f.value)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                      modeFilter === f.value
                        ? "bg-accent/15 text-accent shadow-sm shadow-accent/10"
                        : "text-muted/50 hover:text-text"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <div className={`transition-opacity duration-200 ${loading && data ? "opacity-50 pointer-events-none" : ""}`}>
              {/* Primary + secondary stats */}
              <div className="flex flex-col sm:flex-row sm:items-end gap-3 sm:gap-6">
                {/* Primary: Best WPM */}
                <div className="shrink-0">
                  <div className="text-[10px] text-muted/50 uppercase tracking-widest mb-1">Best WPM</div>
                  <div className="flex items-baseline gap-0.5">
                    <span className="text-3xl sm:text-4xl font-black text-accent tabular-nums leading-none tracking-tight">
                      {data.personalRecords.bestWpm ? Math.floor(data.personalRecords.bestWpm.wpm) : "—"}
                    </span>
                    {data.personalRecords.bestWpm && (
                      <span className="text-lg font-bold text-accent/30 tabular-nums">
                        .{(data.personalRecords.bestWpm.wpm % 1).toFixed(2).slice(2)}
                      </span>
                    )}
                    {trendDelta !== null && (
                      <span className={`ml-1.5 text-[10px] font-bold tabular-nums ${trendDelta >= 0 ? "text-correct/70" : "text-error/70"}`}>
                        {trendDelta >= 0 ? "+" : ""}{trendDelta.toFixed(1)}
                      </span>
                    )}
                  </div>
                  {data.personalRecords.bestWpm && (
                    <div className="text-[9px] text-muted/40 mt-0.5 tabular-nums">
                      {new Date(data.personalRecords.bestWpm.date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                    </div>
                  )}
                </div>

                {/* Divider */}
                <div className="hidden sm:block w-px h-10 bg-white/[0.06] self-center" />

                {/* Secondary stats grid */}
                <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 gap-x-5 gap-y-2">
                  <StatCell
                    label="Best Accuracy"
                    value={data.personalRecords.bestAccuracy ? `${data.personalRecords.bestAccuracy.accuracy.toFixed(1)}%` : "—"}
                    sub={data.personalRecords.bestAccuracy
                      ? new Date(data.personalRecords.bestAccuracy.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })
                      : undefined
                    }
                  />
                  {isPro && (
                    <>
                      <StatCell
                        label="Avg WPM"
                        value={avgWpm > 0 ? avgWpm.toFixed(1) : "—"}
                        sub="last 50 races"
                      />
                      <StatCell
                        label="Consistency"
                        value={data.consistencyScore != null ? `±${data.consistencyScore.toFixed(1)}` : "—"}
                        sub="std dev"
                      />
                      <StatCell
                        label="Win Rate"
                        value={data.winRate != null ? `${data.winRate}%` : "—"}
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
                      value={avgWpm > 0 ? avgWpm.toFixed(1) : "—"}
                      sub={`last ${recentWpms.length} races`}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Tab Navigation ──────────────────────────────────── */}
        <div
          className="flex items-center gap-0 mb-4 border-b border-white/[0.06] animate-fade-in"
          style={{ animationDelay: "60ms" }}
        >
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative px-3 py-2 text-[11px] font-medium transition-colors ${
                activeTab === tab.id
                  ? "text-accent"
                  : "text-muted/50 hover:text-text"
              }`}
            >
              {tab.label}
              {tab.pro && (
                <span className="ml-1 text-[8px] font-black tracking-wider text-accent/60 uppercase">pro</span>
              )}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-2 right-2 h-[2px] bg-accent rounded-full" />
              )}
            </button>
          ))}
        </div>

        <div className={`transition-opacity duration-200 ${loading && data ? "opacity-50 pointer-events-none" : ""}`}>

        {/* ── Overview Tab ─────────────────────────────────────── */}
        {activeTab === "overview" && (
          <div className="space-y-3 animate-fade-in">
            {/* WPM Trend Chart */}
            {wpmSamples.length >= 2 && (
              <Card title={`WPM Trend`} subtitle={isPro ? undefined : "(last 20 races)"} delay={0}>
                <div style={{ minHeight: 160 }}>
                  <WpmChart samples={wpmSamples} />
                </div>
              </Card>
            )}

            {isPro ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* ELO Trend */}
                {(data.eloTrend?.length ?? 0) >= 2 && (
                  <Card title="ELO Trend" delay={60}>
                    <div style={{ minHeight: 140 }}>
                      <AreaMiniChart data={data.eloTrend!.map((r) => r.elo)} color="#eab308" height={120} />
                    </div>
                  </Card>
                )}

                {/* By Mode */}
                {modeFilter === "all" && (data.modeStats?.length ?? 0) > 0 && (
                  <Card title="By Mode" delay={120}>
                    <div className="grid grid-cols-2 gap-2">
                      {(data.modeStats ?? []).map((m) => (
                        <button
                          key={m.modeCategory}
                          onClick={() => setModeFilter(m.modeCategory)}
                          className="group rounded-lg bg-white/[0.02] ring-1 ring-white/[0.05] hover:ring-accent/20 px-2.5 py-2 text-left transition-all hover:bg-white/[0.04]"
                        >
                          <div className="text-[9px] text-muted/45 uppercase tracking-wider mb-0.5 group-hover:text-accent/60 transition-colors">
                            {MODE_LABELS[m.modeCategory] ?? m.modeCategory}
                          </div>
                          <div className="text-sm font-bold text-text tabular-nums leading-tight">
                            {Math.floor(m.bestWpm)}
                            <span className="text-[0.55em] text-muted/40 ml-1 font-semibold">best</span>
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[9px] text-muted/50 tabular-nums">{Math.floor(m.avgWpm)} avg</span>
                            <span className="text-[9px] text-muted/35">·</span>
                            <span className="text-[9px] text-muted/50 tabular-nums">{m.racesPlayed} races</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </Card>
                )}

                {/* Speed by Placement */}
                {(data.speedByPlacement?.length ?? 0) > 0 && (
                  <Card title="Speed by Placement" delay={180}>
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      {data.speedByPlacement!.map((p) => {
                        const ord = p.placement === 1 ? "1st" : p.placement === 2 ? "2nd" : p.placement === 3 ? "3rd" : `${p.placement}th`;
                        const color = p.placement === 1 ? "text-rank-gold" : p.placement === 2 ? "text-rank-silver" : p.placement === 3 ? "text-rank-bronze" : "text-muted/60";
                        return (
                          <div key={p.placement} className="rounded-lg bg-white/[0.02] ring-1 ring-white/[0.05] px-3 py-2">
                            <div className={`text-[10px] font-bold ${color} mb-0.5 uppercase tracking-wider`}>{ord}</div>
                            <div className="text-base font-bold text-text tabular-nums">
                              {Math.floor(p.avgWpm)}
                              <span className="text-[0.65em] text-muted/40 ml-0.5">wpm</span>
                            </div>
                            <div className="text-[10px] text-muted/40 tabular-nums">{p.count} races</div>
                          </div>
                        );
                      })}
                    </div>
                    {data.placementDistribution && data.placementDistribution.total >= 5 && (
                      <PlacementBar dist={data.placementDistribution} />
                    )}
                  </Card>
                )}

                {/* Activity */}
                {last30Days.length > 0 && (
                  <Card
                    title="Activity"
                    subtitle="30 days"
                    delay={240}
                    headerRight={
                      <span className="text-xs font-bold text-text tabular-nums">
                        {totalRacesLast30}
                        <span className="text-muted/40 font-normal ml-1">races</span>
                      </span>
                    }
                  >
                    <ActivityChart days={last30Days} maxCount={maxDayCount} />
                  </Card>
                )}

                {/* Insights */}
                {(bigrams.length > 0 || (keyStats && Object.keys(keyStats).length > 0)) && (
                  <div className="sm:col-span-2">
                    <Card title="Insights" subtitle="WPM impact analysis" delay={300}>
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
                  </div>
                )}
              </div>
            ) : (
              /* Free user overview */
              <div className="space-y-3">
                {/* By Mode */}
                {modeFilter === "all" && (data.modeStats?.length ?? 0) > 0 && (
                  <Card title="By Mode" delay={60}>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {(data.modeStats ?? []).map((m) => (
                        <div
                          key={m.modeCategory}
                          className="rounded-lg bg-white/[0.02] ring-1 ring-white/[0.05] px-2.5 py-2"
                        >
                          <div className="text-[9px] text-muted/45 uppercase tracking-wider mb-0.5">
                            {MODE_LABELS[m.modeCategory] ?? m.modeCategory}
                          </div>
                          <div className="text-sm font-bold text-text tabular-nums leading-tight">
                            {Math.floor(m.bestWpm)}
                            <span className="text-[0.55em] text-muted/40 ml-1 font-semibold">best</span>
                          </div>
                          <div className="text-[9px] text-muted/50 tabular-nums mt-0.5">{m.racesPlayed} races</div>
                        </div>
                      ))}
                    </div>
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

        {/* ── Keys Tab ──────────────────────────────────────── */}
        {activeTab === "keys" && (
          <div className="space-y-3 animate-fade-in">
            {keyStats && Object.keys(keyStats).length > 0 ? (
              <Card
                title="Keyboard Heatmap"
                delay={0}
                headerRight={
                  isPro ? (
                    <Link
                      href="/solo?drill=true"
                      className="px-3 py-1.5 rounded-lg bg-accent/10 ring-1 ring-accent/20 text-[10px] font-semibold text-accent hover:bg-accent/15 transition-colors"
                    >
                      Start Drill Session
                    </Link>
                  ) : undefined
                }
              >
                <KeyboardHeatmap keyStats={keyStats} />
              </Card>
            ) : (
              <EmptyState message="Complete more typing tests to see key accuracy data." />
            )}
          </div>
        )}

        {/* ── Bigrams Tab ──────────────────────────────────── */}
        {activeTab === "bigrams" && (
          <div className="space-y-3 animate-fade-in">
            {bigrams.length > 0 ? (
              <>
                {isPro ? (
                  <Card title="Weakest Bigrams" delay={0}>
                    <BigramAnalysis bigrams={bigrams} onPractice={(weak) => router.push(`/solo?bigrams=${weak.join(",")}`)} />
                  </Card>
                ) : (
                  <FreeBigramPreview bigrams={bigrams} keyStats={keyStats} avgWpm={avgWpm} />
                )}
                <Card title="Bigram Heatmap" subtitle="rows = first char, cols = second char" delay={60}>
                  <BigramHeatmap bigrams={bigrams} />
                </Card>
                {!isPro && <ProUpsell />}
              </>
            ) : (
              <EmptyState message="Complete more typing tests to see bigram accuracy data." />
            )}
          </div>
        )}

        {/* ── Progress Tab (Pro) ────────────────────────────── */}
        {activeTab === "progress" && isPro && (
          <div className="space-y-3 animate-fade-in">
            <Card title="Practice Progress" subtitle="accuracy trends over time" delay={0}>
              <PracticeProgress />
            </Card>
          </div>
        )}

        </div>
      </div>
    </main>
  );
}

/* ── Shared Components ─────────────────────────────────────── */

function StatCell({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <div className="text-[9px] text-muted/40 uppercase tracking-widest mb-0.5">{label}</div>
      <div className="text-sm font-bold text-text tabular-nums leading-tight">{value}</div>
      {sub && <div className="text-[9px] text-muted/35 tabular-nums">{sub}</div>}
    </div>
  );
}

function Card({
  title,
  subtitle,
  delay = 0,
  headerRight,
  children,
}: {
  title: string;
  subtitle?: string;
  delay?: number;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-xl bg-surface/25 ring-1 ring-white/[0.05] overflow-hidden animate-fade-in"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="px-3 sm:px-4 pt-3 pb-2 flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          <h2 className="text-[10px] font-bold text-muted/60 uppercase tracking-widest">{title}</h2>
          {subtitle && <span className="text-[9px] text-muted/35">{subtitle}</span>}
        </div>
        {headerRight}
      </div>
      <div className="px-3 sm:px-4 pb-3">{children}</div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-xl bg-surface/20 ring-1 ring-white/[0.04] px-6 py-12 text-center animate-fade-in">
      <div className="text-muted/30 text-2xl mb-3">⌨</div>
      <p className="text-xs text-muted/50">{message}</p>
    </div>
  );
}

function ActivityChart({ days, maxCount }: { days: { date: string; count: number; dayOfWeek: number }[]; maxCount: number }) {
  return (
    <div>
      <div className="flex items-end gap-[3px] h-20">
        {days.map((d) => {
          const pct = (d.count / maxCount) * 100;
          const intensity = d.count === 0 ? 0 : 0.3 + (pct / 100) * 0.7;
          return (
            <div
              key={d.date}
              className="flex-1 rounded-t transition-all group relative"
              style={{
                height: d.count === 0 ? "3px" : `${Math.max(12, pct)}%`,
                background: d.count === 0
                  ? "rgba(255,255,255,0.04)"
                  : `rgba(77, 158, 255, ${intensity})`,
              }}
              title={`${d.date}: ${d.count} races`}
            />
          );
        })}
      </div>
      <div className="flex justify-between mt-2 text-[9px] text-muted/40 tabular-nums">
        <span>{days[0]?.date.slice(5)}</span>
        <span>today</span>
      </div>
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
            <span className={`text-[10px] font-bold tabular-nums ${s.textColor}`}>{s.pct}%</span>
            <span className="text-[9px] text-muted/40">{s.label}</span>
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
      <Card title="Weakest Bigrams" subtitle="top 5" delay={120}>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {worst5.map((b) => {
            const textColor = b.accuracy < 70 ? "text-error" : b.accuracy < 90 ? "text-amber-400" : "text-correct";
            const barColor = b.accuracy < 70 ? "bg-error/40" : b.accuracy < 90 ? "bg-amber-400/40" : "bg-correct/40";
            return (
              <div key={b.bigram} className="rounded-lg bg-white/[0.02] ring-1 ring-white/[0.05] px-3 py-2.5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-accent font-bold text-sm">{b.bigram}</span>
                  <span className={`text-xs font-bold tabular-nums ${textColor}`}>
                    {Math.round(b.accuracy)}%
                  </span>
                </div>
                <div className="h-1 rounded-full bg-white/[0.04] overflow-hidden">
                  <div className={`h-full rounded-full ${barColor}`} style={{ width: `${b.accuracy}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </Card>
      {teaserInsight && (
        <div className="rounded-xl ring-1 ring-accent/10 bg-accent/[0.03] px-4 py-3 animate-fade-in" style={{ animationDelay: "180ms" }}>
          <p className="text-[11px] text-muted/65 leading-relaxed">{teaserInsight.insight}</p>
          <p className="text-[10px] text-muted/40 mt-1.5">Upgrade to Pro for all insights and practice drills</p>
        </div>
      )}
    </>
  );
}

function ProUpsell() {
  return (
    <div
      className="relative rounded-xl overflow-hidden ring-1 ring-accent/15 animate-fade-in"
      style={{ animationDelay: "240ms" }}
    >
      {/* Gradient top edge */}
      <div className="h-[2px] bg-gradient-to-r from-accent/30 via-accent/60 to-accent/30" />

      {/* Subtle glow background */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,rgba(77,158,255,0.04),transparent_60%)]" />

      <div className="relative px-5 py-5">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-[9px] font-black tracking-[0.15em] text-accent bg-accent/10 ring-1 ring-accent/25 rounded px-1.5 py-0.5 leading-none">
            PRO
          </span>
          <span className="text-xs font-bold text-text/70">Unlock Full Analytics</span>
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-5">
          {[
            "Smart practice drills for weak keys",
            "ELO trends & placement distribution",
            "Full bigram analysis & WPM insights",
            "Activity tracking & consistency scores",
          ].map((label) => (
            <div key={label} className="flex items-start gap-2 text-[11px] text-text/45">
              <span className="text-accent/60 mt-px shrink-0">+</span>
              <span>{label}</span>
            </div>
          ))}
        </div>

        <Link
          href="/pro"
          className="block w-full rounded-lg bg-accent/10 ring-1 ring-accent/30 text-accent text-xs font-bold px-4 py-2.5 hover:bg-accent/20 transition-colors text-center"
        >
          Upgrade to Pro — $4.99/mo
        </Link>
        <p className="text-[9px] text-muted/35 text-center mt-1.5">cancel anytime</p>
      </div>
    </div>
  );
}

function AreaMiniChart({ data, color, height }: { data: number[]; color: string; height: number }) {
  if (data.length < 2) return null;

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

  const scaleX = (i: number) => padding.left + (i / (data.length - 1)) * innerW;
  const scaleY = (v: number) => padding.top + innerH - ((v - yMin) / yRange) * innerH;

  const linePath = data.map((v, i) => `${i === 0 ? "M" : "L"} ${scaleX(i)} ${scaleY(v)}`).join(" ");
  const areaPath = linePath +
    ` L ${scaleX(data.length - 1)} ${padding.top + innerH}` +
    ` L ${scaleX(0)} ${padding.top + innerH} Z`;

  const gradId = `areaGrad-${color.replace("#", "")}`;

  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="w-full h-full" style={{ cursor: "crosshair" }}>
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
        fontSize={9}
        textAnchor="middle"
        fillOpacity={0.3}
      >
        races
      </text>
    </svg>
  );
}
