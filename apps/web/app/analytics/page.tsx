"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BigramAnalysis } from "@/components/practice/BigramAnalysis";
import { BigramHeatmap } from "@/components/practice/BigramHeatmap";
import { KeyboardHeatmap } from "@/components/typing/KeyboardHeatmap";
import type { KeyStatsMap } from "@typeoff/shared";
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
  // Pro-only fields
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

export default function AnalyticsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bigrams, setBigrams] = useState<Array<{ bigram: string; correct: number; total: number; accuracy: number }>>([]);
  const [keyStats, setKeyStats] = useState<KeyStatsMap | null>(null);
  const [modeFilter, setModeFilter] = useState<string>("all");

  const isPro = session?.user?.isPro ?? false;

  useEffect(() => {
    if (status === "unauthenticated") router.push("/");
  }, [status, router]);

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

  // Bigram + key accuracy data for all users (display gating happens in render)
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

  if (status === "loading" || loading) {
    return (
      <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-8">
        <div className="max-w-3xl mx-auto space-y-4">
          <div className="h-8 w-48 rounded bg-surface/40 animate-pulse" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 rounded-xl bg-surface/30 animate-pulse" />
            ))}
          </div>
          <div className="h-48 rounded-xl bg-surface/30 animate-pulse" />
        </div>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <p className="text-sm text-error">{error ?? "Failed to load analytics"}</p>
      </main>
    );
  }

  // Derived stats (Pro only)
  const recentWpms = (data.wpmTrend ?? []).slice(-50);
  const avgWpm =
    recentWpms.length > 0
      ? recentWpms.reduce((s, r) => s + r.wpm, 0) / recentWpms.length
      : 0;

  const last30Days: { date: string; count: number }[] = [];
  if (data.racesPerDay) {
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      last30Days.push({ date: key, count: data.racesPerDay[key] ?? 0 });
    }
  }
  const maxDayCount = Math.max(1, ...last30Days.map((d) => d.count));

  return (
    <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-8">
      <div className="max-w-3xl mx-auto animate-fade-in">
        <div className="mb-5">
          <h1 className="text-lg font-bold text-text tracking-tight">Analytics</h1>
          {isPro && data.totalRaces != null && (
            <p className="text-xs text-muted/65 mt-0.5">{data.totalRaces} total races analyzed</p>
          )}
        </div>

        {/* ── Mode Filter ─────────────────────────────────── */}
        <div className="flex items-center gap-1 flex-wrap mb-5">
          {MODE_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setModeFilter(f.value)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                modeFilter === f.value
                  ? "bg-accent/15 text-accent ring-1 ring-accent/20"
                  : "text-muted/60 hover:text-text hover:bg-white/[0.04]"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* ── Personal Records (free + pro) ───────────────── */}
        <div className={`grid gap-2 mb-4 ${isPro ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2"}`}>
          <StatCard
            label="Best WPM"
            value={data.personalRecords.bestWpm ? Math.floor(data.personalRecords.bestWpm.wpm).toString() : "-"}
            sub={data.personalRecords.bestWpm ? new Date(data.personalRecords.bestWpm.date).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : undefined}
          />
          <StatCard
            label="Best Accuracy"
            value={data.personalRecords.bestAccuracy ? `${Math.floor(data.personalRecords.bestAccuracy.accuracy)}%` : "-"}
            sub={data.personalRecords.bestAccuracy ? new Date(data.personalRecords.bestAccuracy.date).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : undefined}
          />
          {isPro && (
            <>
              <StatCard
                label="Consistency"
                value={data.consistencyScore != null ? data.consistencyScore.toFixed(1) : "-"}
                sub="WPM std dev (last 50)"
              />
              <StatCard
                label="Avg WPM"
                value={avgWpm > 0 ? Math.floor(avgWpm).toString() : "-"}
                sub="Last 50 races"
              />
            </>
          )}
        </div>

        {/* ── WPM Trend (free: last 20, pro: full) ────────── */}
        {data.wpmTrend.length >= 2 && (
          <section className="mb-6">
            <SectionHeader>
              WPM Trend
              {!isPro && (
                <span className="text-[10px] font-normal text-muted/65 normal-case tracking-normal ml-1">
                  (last 20 races)
                </span>
              )}
            </SectionHeader>
            <div className="rounded-xl bg-surface/40 ring-1 ring-white/[0.04] px-4 py-3">
              <MiniChart data={data.wpmTrend.map((r) => r.wpm)} color="#4d9eff" height={120} />
            </div>
          </section>
        )}

        {/* ── Pro-only sections ────────────────────────────── */}
        {isPro ? (
          <>
            {/* Streaks + Win Rate + Avg Accuracy */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
              <StatCard
                label="Win Rate"
                value={data.winRate != null ? `${data.winRate}%` : "—"}
                sub={data.winRate != null ? "ranked races" : "need 5+ races"}
              />
              <StatCard
                label="Avg Accuracy"
                value={data.avgAccuracy != null ? `${data.avgAccuracy.toFixed(1)}%` : "—"}
                sub="Last 50 races"
              />
              <StatCard label="Best Win Streak" value={(data.personalRecords.maxStreak ?? 0).toString()} />
              <StatCard label="Best Day Streak" value={(data.personalRecords.maxRankedDayStreak ?? 0).toString()} />
            </div>

            {/* Actionable Insights (Pro) */}
            {(bigrams.length > 0 || (keyStats && Object.keys(keyStats).length > 0)) && (
              <section className="mb-6">
                <SectionHeader>Insights</SectionHeader>
                <AnalyticsInsights
                  weakKeys={keyStats ? Object.entries(keyStats).map(([key, stat]) => ({
                    key,
                    accuracy: stat.total > 0 ? stat.correct / stat.total : 1,
                    total: stat.total,
                  })) : []}
                  weakBigrams={bigrams.map((b) => ({ bigram: b.bigram, accuracy: b.accuracy, total: b.total }))}
                  avgWpm={avgWpm}
                />
              </section>
            )}

            {/* By Mode breakdown (visible in "All" view, hidden when filtered) */}
            {modeFilter === "all" && (data.modeStats?.length ?? 0) > 0 && (
              <section className="mb-6">
                <SectionHeader>By Mode</SectionHeader>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(data.modeStats ?? []).map((m) => (
                    <button
                      key={m.modeCategory}
                      onClick={() => setModeFilter(m.modeCategory)}
                      className="rounded-lg bg-surface/40 ring-1 ring-white/[0.04] px-3 py-2.5 text-left hover:bg-white/[0.04] transition-colors"
                    >
                      <div className="text-[10px] text-muted/50 uppercase tracking-wider mb-1">
                        {MODE_LABELS[m.modeCategory] ?? m.modeCategory}
                      </div>
                      <div className="text-base font-bold text-text tabular-nums leading-tight">
                        {Math.floor(m.bestWpm)}
                        <span className="text-[0.6em] text-muted/60 ml-1">best</span>
                      </div>
                      <div className="text-xs text-muted/60 tabular-nums">
                        {Math.floor(m.avgWpm)} avg
                      </div>
                      <div className="text-[10px] text-muted/50 tabular-nums mt-0.5">
                        {m.racesPlayed} races · {m.racesPlayed > 0 ? Math.round((m.racesWon / m.racesPlayed) * 100) : 0}% win
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* ELO Trend */}
            {(data.eloTrend?.length ?? 0) >= 2 && (
              <section className="mb-6">
                <SectionHeader>ELO Trend</SectionHeader>
                <div className="rounded-xl bg-surface/40 ring-1 ring-white/[0.04] px-4 py-3">
                  <MiniChart data={data.eloTrend!.map((r) => r.elo)} color="#eab308" height={100} />
                </div>
              </section>
            )}

            {/* Speed by Placement + Distribution */}
            {(data.speedByPlacement?.length ?? 0) > 0 && (
              <section className="mb-6">
                <SectionHeader>Speed by Placement</SectionHeader>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                  {data.speedByPlacement!.map((p) => {
                    const ord = p.placement === 1 ? "1st" : p.placement === 2 ? "2nd" : p.placement === 3 ? "3rd" : `${p.placement}th`;
                    const color = p.placement === 1 ? "text-rank-gold" : p.placement === 2 ? "text-rank-silver" : p.placement === 3 ? "text-rank-bronze" : "text-muted";
                    return (
                      <div key={p.placement} className="rounded-lg bg-surface/40 ring-1 ring-white/[0.04] px-3 py-2.5">
                        <div className={`text-xs font-bold ${color} mb-0.5`}>{ord} Place</div>
                        <div className="text-base font-bold text-text tabular-nums">
                          {Math.floor(p.avgWpm)}
                          <span className="text-[0.7em] opacity-50">.{(p.avgWpm % 1).toFixed(2).slice(2)}</span>
                          <span className="text-[0.6em] text-muted/60 ml-1">wpm</span>
                        </div>
                        <div className="text-[10px] text-muted/60 tabular-nums">{p.count} races</div>
                      </div>
                    );
                  })}
                </div>
                {data.placementDistribution && data.placementDistribution.total >= 5 && (
                  <PlacementBar dist={data.placementDistribution} />
                )}
              </section>
            )}

            {/* Activity Heatmap */}
            {last30Days.length > 0 && (
              <section className="mb-6">
                <SectionHeader>Activity (Last 30 Days)</SectionHeader>
                <div className="rounded-xl bg-surface/40 ring-1 ring-white/[0.04] px-4 py-3">
                  <div className="flex items-end gap-[3px] h-16">
                    {last30Days.map((d) => {
                      const pct = (d.count / maxDayCount) * 100;
                      const opacity = d.count === 0 ? 0.08 : 0.3 + (pct / 100) * 0.7;
                      return (
                        <div
                          key={d.date}
                          className="flex-1 rounded-sm bg-accent transition-all"
                          style={{ height: d.count === 0 ? "4px" : `${Math.max(10, pct)}%`, opacity }}
                          title={`${d.date}: ${d.count} races`}
                        />
                      );
                    })}
                  </div>
                  <div className="flex justify-between mt-1.5 text-[9px] text-muted/65">
                    <span>{last30Days[0]?.date.slice(5)}</span>
                    <span>Today</span>
                  </div>
                </div>
              </section>
            )}

            {/* Key Accuracy */}
            {keyStats && Object.keys(keyStats).length > 0 && (
              <section className="mb-6">
                <SectionHeader>Key Accuracy</SectionHeader>
                <div className="rounded-xl bg-surface/40 ring-1 ring-white/[0.04] px-4 py-5">
                  <KeyboardHeatmap keyStats={keyStats} />
                  <div className="mt-4 flex justify-center">
                    <Link
                      href="/solo?drill=true"
                      className="px-4 py-2 rounded-lg bg-accent/10 ring-1 ring-accent/20 text-xs font-semibold text-accent hover:bg-accent/15 transition-colors"
                    >
                      Start Drill Session →
                    </Link>
                  </div>
                </div>
              </section>
            )}

            {/* Bigram Analysis */}
            {bigrams.length > 0 && (
              <section className="mb-6">
                <SectionHeader>Bigram Analysis</SectionHeader>
                <BigramAnalysis bigrams={bigrams} onPractice={(weak) => router.push(`/solo?bigrams=${weak.join(",")}`)} />
              </section>
            )}
            {bigrams.length > 0 && (
              <section className="mb-6">
                <BigramHeatmap bigrams={bigrams} />
              </section>
            )}

            {/* Practice Progress */}
            <section className="mb-6">
              <SectionHeader>Practice Progress</SectionHeader>
              <PracticeProgress />
            </section>
          </>
        ) : (
          /* ── Free user sections ─────────────────────────── */
          <>
            {/* By Mode (free users get read-only summary) */}
            {modeFilter === "all" && (data.modeStats?.length ?? 0) > 0 && (
              <section className="mb-4">
                <SectionHeader>By Mode</SectionHeader>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(data.modeStats ?? []).map((m) => (
                    <div
                      key={m.modeCategory}
                      className="rounded-lg bg-surface/40 ring-1 ring-white/[0.04] px-3 py-2.5"
                    >
                      <div className="text-[10px] text-muted/50 uppercase tracking-wider mb-1">
                        {MODE_LABELS[m.modeCategory] ?? m.modeCategory}
                      </div>
                      <div className="text-base font-bold text-text tabular-nums leading-tight">
                        {Math.floor(m.bestWpm)}
                        <span className="text-[0.6em] text-muted/60 ml-1">best</span>
                      </div>
                      <div className="text-[10px] text-muted/50 tabular-nums mt-0.5">
                        {m.racesPlayed} races
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Key Accuracy heatmap (read-only, no drill button) */}
            {keyStats && Object.keys(keyStats).length > 0 && (
              <section className="mb-6">
                <SectionHeader>Key Accuracy</SectionHeader>
                <div className="rounded-xl bg-surface/40 ring-1 ring-white/[0.04] px-4 py-5">
                  <KeyboardHeatmap keyStats={keyStats} />
                </div>
              </section>
            )}

            {/* Worst 5 bigrams (free preview) + teaser insight */}
            {bigrams.length > 0 && (() => {
              const meaningful = bigrams.filter((b) => b.total >= 10);
              meaningful.sort((a, b) => a.accuracy - b.accuracy);
              const worst5 = meaningful.slice(0, 5);
              // Generate a teaser insight from the worst bigram
              const teaserInsight = worst5.length > 0
                ? (() => {
                    const rawKeys = keyStats
                      ? Object.entries(keyStats).map(([key, stat]) => ({
                          key,
                          accuracy: stat.total > 0 ? stat.correct / stat.total : 1,
                          total: stat.total,
                        }))
                      : [];
                    const ranked = rankWeaknesses(rawKeys, worst5.map((b) => ({ bigram: b.bigram, accuracy: b.accuracy, total: b.total })));
                    const insights = estimateWpmImpact(avgWpm || 60, ranked);
                    return insights[0];
                  })()
                : null;
              return (
                <>
                  <section className="mb-4">
                    <SectionHeader>Weakest Bigrams</SectionHeader>
                    <div className="flex flex-wrap gap-2">
                      {worst5.map((b) => (
                        <div key={b.bigram} className="rounded-lg bg-surface/40 ring-1 ring-white/[0.04] px-3 py-2">
                          <span className="text-accent font-bold text-sm">{b.bigram}</span>
                          <span className={`ml-2 text-xs tabular-nums ${b.accuracy < 0.7 ? "text-error/70" : b.accuracy < 0.9 ? "text-amber-400/70" : "text-correct/70"}`}>
                            {Math.round(b.accuracy * 100)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </section>
                  {teaserInsight && (
                    <div className="rounded-lg ring-1 ring-amber-400/10 bg-amber-400/[0.02] px-4 py-3 mb-4">
                      <p className="text-[11px] text-muted/70 leading-relaxed">{teaserInsight.insight}</p>
                      <p className="text-[10px] text-muted/50 mt-1">Upgrade to Pro for all insights and practice drills</p>
                    </div>
                  )}
                </>
              );
            })()}

            {/* Pro upsell */}
            <div className="rounded-xl ring-1 ring-amber-400/10 bg-amber-400/[0.02] px-5 py-4">
              <p className="text-xs font-bold text-amber-400/60 mb-1">Pro Analytics</p>
              <p className="text-[11px] text-muted/60 mb-3 leading-relaxed">
                Unlock smart practice drills, full bigram analysis, WPM impact insights, progress tracking, ELO trends, placement distribution, and more.
              </p>
              <Link
                href="/pro"
                className="inline-block text-xs font-bold text-bg bg-amber-400 hover:bg-amber-300 px-4 py-2 rounded-lg transition-colors"
              >
                Upgrade to Pro →
              </Link>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

/* ── Helper Components ──────────────────────────────────── */

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-bold text-muted/60 uppercase tracking-wider mb-3 flex items-center gap-3">
      {children}
      <span className="flex-1 h-px bg-white/[0.03]" />
    </h2>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg bg-surface/40 ring-1 ring-white/[0.04] px-3 py-2.5">
      <div className="text-base font-bold text-text tabular-nums leading-tight">{value}</div>
      <div className="text-[10px] text-muted/60 mt-0.5">{label}</div>
      {sub && <div className="text-[9px] text-muted/65 mt-0.5">{sub}</div>}
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
    { label: "4th+", count: other, pct: pct(other), color: "bg-muted/30", textColor: "text-muted/65" },
  ];
  return (
    <div className="rounded-xl bg-surface/40 ring-1 ring-white/[0.04] px-4 py-3">
      <div className="flex h-2 rounded-full overflow-hidden gap-px mb-3">
        {segments.map((s) =>
          s.count > 0 ? (
            <div
              key={s.label}
              className={`${s.color} opacity-70 transition-all`}
              style={{ width: `${s.pct}%` }}
              title={`${s.label}: ${s.count} (${s.pct}%)`}
            />
          ) : null
        )}
      </div>
      <div className="flex gap-4">
        {segments.map((s) => (
          <div key={s.label} className="flex items-center gap-1.5">
            <span className={`text-xs font-bold tabular-nums ${s.textColor}`}>{s.pct}%</span>
            <span className="text-[10px] text-muted/60">{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MiniChart({ data, color, height }: { data: number[]; color: string; height: number }) {
  if (data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const padding = 4;
  const w = 600;

  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = height - padding - ((v - min) / range) * (height - padding * 2);
    return `${x},${y}`;
  });

  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="w-full" style={{ height }}>
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
        opacity="0.7"
      />
      {/* Min/max labels */}
      <text x={w - 2} y={padding + 4} textAnchor="end" fill={color} opacity="0.4" fontSize="10">
        {Math.floor(max)}
      </text>
      <text x={w - 2} y={height - padding} textAnchor="end" fill={color} opacity="0.4" fontSize="10">
        {Math.floor(min)}
      </text>
    </svg>
  );
}
