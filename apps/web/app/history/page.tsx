"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface RaceRow {
  raceId: string;
  placement: number | null;
  wpm: number | null;
  rawWpm: number | null;
  accuracy: number | null;
  eloChange: number | null;
  finishedAt: string | null;
  playerCount: number;
}

interface HistoryResponse {
  races: RaceRow[];
  nextCursor?: string;
  total: number;
  isPro: boolean;
}

type SortKey = "date" | "wpm" | "accuracy" | "elo";

export default function HistoryPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [races, setRaces] = useState<RaceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [total, setTotal] = useState(0);
  const [isPro, setIsPro] = useState(false);
  const [sort, setSort] = useState<SortKey>("date");
  const [minWpm, setMinWpm] = useState("");
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/");
  }, [status, router]);

  const fetchRaces = useCallback(
    async (cursor?: string, append = false) => {
      if (!append) setLoading(true);
      else setLoadingMore(true);

      const params = new URLSearchParams({ sort });
      if (cursor) params.set("cursor", cursor);
      if (minWpm) params.set("minWpm", minWpm);

      try {
        const res = await fetch(`/api/history?${params}`);
        const data: HistoryResponse = await res.json();
        setRaces((prev) => (append ? [...prev, ...data.races] : data.races));
        setNextCursor(data.nextCursor);
        setTotal(data.total);
        setIsPro(data.isPro);
      } catch {
        // ignore
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [sort, minWpm],
  );

  useEffect(() => {
    if (session?.user?.id) fetchRaces();
  }, [session?.user?.id, fetchRaces]);

  if (status === "loading" || loading) {
    return (
      <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-8">
        <div className="max-w-3xl mx-auto space-y-4">
          <div className="h-8 w-48 rounded bg-surface/40 animate-pulse" />
          <div className="h-64 rounded-xl bg-surface/30 animate-pulse" />
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-8">
      <div className="max-w-3xl mx-auto animate-fade-in">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <h1 className="text-lg font-bold text-text tracking-tight">Race History</h1>
            <p className="text-xs text-muted/50 mt-0.5">
              {total} total races
              {!isPro && " — showing last 5"}
            </p>
          </div>
          {!isPro && (
            <Link
              href="/pro"
              className="text-[11px] font-bold text-bg bg-amber-400 hover:bg-amber-300 px-3 py-1.5 rounded-md transition-colors uppercase tracking-wider shrink-0"
            >
              Upgrade to Pro
            </Link>
          )}
        </div>

        {/* Filters (Pro only) */}
        {isPro && (
          <div className="flex items-center gap-3 mb-4">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="text-xs bg-surface/60 text-text rounded-lg px-3 py-1.5 ring-1 ring-white/[0.06] outline-none"
            >
              <option value="date">Sort by Date</option>
              <option value="wpm">Sort by WPM</option>
              <option value="accuracy">Sort by Accuracy</option>
              <option value="elo">Sort by ELO Change</option>
            </select>
            <input
              type="number"
              placeholder="Min WPM"
              value={minWpm}
              onChange={(e) => setMinWpm(e.target.value)}
              className="text-xs bg-surface/60 text-text rounded-lg px-3 py-1.5 ring-1 ring-white/[0.06] outline-none w-24 placeholder:text-muted/30"
            />
          </div>
        )}

        {/* Race table */}
        {races.length > 0 ? (
          <div className="rounded-xl bg-surface/40 ring-1 ring-white/[0.04] overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-xs text-muted/60 uppercase tracking-wider border-b border-white/[0.04]">
                  <th className="px-3 sm:px-4 py-2.5 font-medium">Date</th>
                  <th className="px-3 sm:px-4 py-2.5 font-medium">Place</th>
                  <th className="px-3 sm:px-4 py-2.5 font-medium text-right">WPM</th>
                  <th className="px-3 sm:px-4 py-2.5 font-medium text-right">Acc</th>
                  <th className="px-3 sm:px-4 py-2.5 font-medium text-right">ELO</th>
                  <th className="px-3 sm:px-4 py-2.5 font-medium text-right w-8"></th>
                </tr>
              </thead>
              <tbody>
                {races.map((race, i) => {
                  const placementColor =
                    race.placement === 1
                      ? "text-rank-gold"
                      : race.placement === 2
                        ? "text-rank-silver"
                        : race.placement === 3
                          ? "text-rank-bronze"
                          : "text-error";
                  const ord =
                    race.placement === 1
                      ? "1st"
                      : race.placement === 2
                        ? "2nd"
                        : race.placement === 3
                          ? "3rd"
                          : race.placement === 4
                            ? "4th"
                            : "-";
                  return (
                    <tr
                      key={`${race.raceId}-${i}`}
                      className="border-b border-white/[0.02] last:border-0 hover:bg-white/[0.015] transition-colors"
                    >
                      <td className="px-3 sm:px-4 py-2.5 text-muted tabular-nums text-xs" suppressHydrationWarning>
                        {race.finishedAt
                          ? new Date(race.finishedAt).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "-"}
                      </td>
                      <td className="px-3 sm:px-4 py-2.5">
                        <span className={`text-xs font-bold ${placementColor}`}>{ord}</span>
                      </td>
                      <td className="px-3 sm:px-4 py-2.5 text-right tabular-nums text-text text-xs">
                        {race.wpm != null ? (
                          <>
                            {Math.floor(race.wpm)}
                            <span className="text-[0.8em] opacity-50">
                              .{(race.wpm % 1).toFixed(2).slice(2)}
                            </span>
                          </>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="px-3 sm:px-4 py-2.5 text-right tabular-nums text-muted text-xs">
                        {race.accuracy != null ? (
                          <>
                            {Math.floor(race.accuracy)}
                            <span className="text-[0.8em] opacity-50">
                              .{((race.accuracy % 1) * 10).toFixed(0)}%
                            </span>
                          </>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="px-3 sm:px-4 py-2.5 text-right tabular-nums">
                        {race.eloChange != null ? (
                          <span
                            className={`text-xs font-medium ${
                              race.eloChange > 0
                                ? "text-correct"
                                : race.eloChange < 0
                                  ? "text-error"
                                  : "text-muted"
                            }`}
                          >
                            {race.eloChange > 0 ? "+" : ""}
                            {race.eloChange}
                          </span>
                        ) : (
                          <span className="text-muted text-xs">-</span>
                        )}
                      </td>
                      <td className="px-3 sm:px-4 py-2.5 text-right">
                        <Link
                          href={`/races/${race.raceId}`}
                          className="text-muted/30 hover:text-accent transition-colors"
                          title="Watch replay"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-xl bg-surface/40 ring-1 ring-white/[0.04] px-8 py-12 text-center">
            <p className="text-sm text-muted/50">No races found.</p>
          </div>
        )}

        {/* Load more */}
        {isPro && nextCursor && (
          <div className="flex justify-center mt-4">
            <button
              onClick={() => fetchRaces(nextCursor, true)}
              disabled={loadingMore}
              className="text-xs text-accent hover:text-accent/80 transition-colors disabled:opacity-50"
            >
              {loadingMore ? "Loading..." : "Load more"}
            </button>
          </div>
        )}

        {/* Upgrade CTA for free users */}
        {!isPro && races.length >= 5 && (
          <div className="mt-6 rounded-xl bg-amber-400/[0.04] ring-1 ring-amber-400/10 px-5 py-4 text-center">
            <p className="text-sm text-text font-medium mb-1">
              Want to see your full race history?
            </p>
            <p className="text-xs text-muted/50 mb-3">
              Upgrade to Pro for unlimited history, filters, and sorting.
            </p>
            <Link
              href="/pro"
              className="inline-block text-xs font-bold text-bg bg-amber-400 hover:bg-amber-300 px-4 py-2 rounded-lg transition-colors uppercase tracking-wider"
            >
              Upgrade to Pro
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
