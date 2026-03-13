import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { raceParticipants, races, userStats, userModeStats, soloResults } from "@typeoff/db";
import { eq, desc, sql, and, gte } from "drizzle-orm";
import type { ModeCategory } from "@typeoff/shared";

export const dynamic = "force-dynamic";

const VALID_MODES = new Set<string>(["words", "special", "quotes", "code", "solo"]);
const VALID_RANGES = new Set<string>(["7d", "30d", "3m", "all"]);

/** Map solo wordPool (e.g. "words:easy:false") to a mode category for filtering */
function soloModeCategory(wordPool: string | null): string {
  if (!wordPool) return "words";
  const ct = wordPool.split(":")[0];
  if (ct === "code") return "code";
  if (ct === "quotes") return "quotes";
  if (ct === "practice" || ct === "custom" || ct === "zen") return "special";
  return "words";
}

/** Common shape for merged results */
interface UnifiedResult {
  wpm: number;
  accuracy: number;
  date: Date;
  source: "race" | "solo";
  wordCount?: number;
  // Race-only fields
  placement?: number | null;
  eloBefore?: number | null;
  eloAfter?: number | null;
  playerCount?: number;
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const rawMode = searchParams.get("mode");
  const modeFilter: string | null =
    rawMode && VALID_MODES.has(rawMode) ? rawMode : null;

  const rawRange = searchParams.get("range");
  const rangeFilter: string | null =
    rawRange && VALID_RANGES.has(rawRange) ? rawRange : null;

  // Compute the cutoff date for time-range filtering
  let rangeCutoff: Date | null = null;
  if (rangeFilter && rangeFilter !== "all") {
    const now = new Date();
    if (rangeFilter === "7d") rangeCutoff = new Date(now.getTime() - 7 * 86400000);
    else if (rangeFilter === "30d") rangeCutoff = new Date(now.getTime() - 30 * 86400000);
    else if (rangeFilter === "3m") rangeCutoff = new Date(now.getTime() - 90 * 86400000);
  }

  const db = getDb();
  const userId = session.user.id;
  const isPro = session.user.isPro ?? false;

  // Per-mode stats (always returned, all tiers)
  const modeStatsRows = await db
    .select()
    .from(userModeStats)
    .where(eq(userModeStats.userId, userId));

  const modeStats = modeStatsRows.map((r) => ({
    modeCategory: r.modeCategory,
    racesPlayed: r.racesPlayed,
    racesWon: r.racesWon,
    avgWpm: r.avgWpm,
    bestWpm: r.bestWpm,
    avgAccuracy: r.avgAccuracy,
  }));

  // Free users: return limited data (last 20 results, best records only)
  if (!isPro) {
    // Fetch ranked races (skip if filtering to solo-only)
    const raceResults: UnifiedResult[] = [];
    if (modeFilter !== "solo") {
      const conditions = [eq(raceParticipants.userId, userId)];
      if (modeFilter && modeFilter !== "solo") conditions.push(eq(races.modeCategory, modeFilter as ModeCategory));
      if (rangeCutoff) conditions.push(gte(raceParticipants.finishedAt, rangeCutoff));

      const freeRaces = await db
        .select({
          wpm: raceParticipants.wpm,
          accuracy: raceParticipants.accuracy,
          finishedAt: raceParticipants.finishedAt,
        })
        .from(raceParticipants)
        .innerJoin(races, eq(raceParticipants.raceId, races.id))
        .where(and(...conditions))
        .orderBy(desc(raceParticipants.finishedAt))
        .limit(20);

      for (const r of freeRaces) {
        if (r.wpm != null && r.finishedAt) {
          raceResults.push({
            wpm: r.wpm,
            accuracy: r.accuracy ?? 0,
            date: r.finishedAt,
            source: "race",
          });
        }
      }
    }

    // Fetch solo results
    const soloConditions = [eq(soloResults.userId, userId)];
    if (rangeCutoff) soloConditions.push(gte(soloResults.createdAt, rangeCutoff));

    const soloRows = await db
      .select({
        wpm: soloResults.wpm,
        accuracy: soloResults.accuracy,
        createdAt: soloResults.createdAt,
        wordPool: soloResults.wordPool,
      })
      .from(soloResults)
      .where(and(...soloConditions))
      .orderBy(desc(soloResults.createdAt))
      .limit(20);

    const soloFiltered: UnifiedResult[] = [];
    for (const r of soloRows) {
      if (modeFilter && modeFilter !== "solo" && soloModeCategory(r.wordPool) !== modeFilter) continue;
      soloFiltered.push({
        wpm: r.wpm,
        accuracy: r.accuracy,
        date: r.createdAt,
        source: "solo",
      });
    }

    // Merge, sort by date desc, take 20
    const merged = [...raceResults, ...soloFiltered]
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 20);

    const wpmTrend = merged
      .map((r) => ({ date: r.date.toISOString(), wpm: r.wpm, accuracy: r.accuracy }))
      .reverse();

    // Activity per day
    const racesPerDay: Record<string, number> = {};
    for (const r of merged) {
      const day = r.date.toISOString().slice(0, 10);
      racesPerDay[day] = (racesPerDay[day] ?? 0) + 1;
    }

    let bestWpm: { wpm: number; date: string } | null = null;
    let bestAccuracy: { accuracy: number; date: string } | null = null;
    for (const r of merged) {
      if (!bestWpm || r.wpm > bestWpm.wpm) bestWpm = { wpm: r.wpm, date: r.date.toISOString() };
      if (!bestAccuracy || r.accuracy > bestAccuracy.accuracy) bestAccuracy = { accuracy: r.accuracy, date: r.date.toISOString() };
    }

    return NextResponse.json({ wpmTrend, personalRecords: { bestWpm, bestAccuracy }, modeStats, racesPerDay });
  }

  // ── Pro users: fetch everything ──────────────────────────────────

  // Fetch ranked races (skip if filtering to solo-only)
  const raceResults: UnifiedResult[] = [];
  if (modeFilter !== "solo") {
    const conditions = [eq(raceParticipants.userId, userId)];
    if (modeFilter && modeFilter !== "solo") conditions.push(eq(races.modeCategory, modeFilter as ModeCategory));
    if (rangeCutoff) conditions.push(gte(raceParticipants.finishedAt, rangeCutoff));

    const allRaces = await db
      .select({
        raceId: raceParticipants.raceId,
        placement: raceParticipants.placement,
        wpm: raceParticipants.wpm,
        rawWpm: raceParticipants.rawWpm,
        accuracy: raceParticipants.accuracy,
        eloBefore: raceParticipants.eloBefore,
        eloAfter: raceParticipants.eloAfter,
        finishedAt: raceParticipants.finishedAt,
        playerCount: races.playerCount,
        wordCount: races.wordCount,
      })
      .from(raceParticipants)
      .innerJoin(races, eq(raceParticipants.raceId, races.id))
      .where(and(...conditions))
      .orderBy(desc(raceParticipants.finishedAt));

    for (const r of allRaces) {
      if (r.wpm != null && r.finishedAt) {
        raceResults.push({
          wpm: r.wpm,
          accuracy: r.accuracy ?? 0,
          date: r.finishedAt,
          source: "race",
          wordCount: r.wordCount,
          placement: r.placement,
          eloBefore: r.eloBefore,
          eloAfter: r.eloAfter,
          playerCount: r.playerCount,
        });
      }
    }
  }

  // Fetch solo results
  const soloConditionsPro = [eq(soloResults.userId, userId)];
  if (rangeCutoff) soloConditionsPro.push(gte(soloResults.createdAt, rangeCutoff));

  const soloRows = await db
    .select({
      wpm: soloResults.wpm,
      accuracy: soloResults.accuracy,
      createdAt: soloResults.createdAt,
      wordPool: soloResults.wordPool,
      mode: soloResults.mode,
      duration: soloResults.duration,
    })
    .from(soloResults)
    .where(and(...soloConditionsPro))
    .orderBy(desc(soloResults.createdAt));

  const soloFiltered: UnifiedResult[] = [];
  for (const r of soloRows) {
    if (modeFilter && modeFilter !== "solo" && soloModeCategory(r.wordPool) !== modeFilter) continue;
    soloFiltered.push({
      wpm: r.wpm,
      accuracy: r.accuracy,
      date: r.createdAt,
      source: "solo",
      wordCount: r.mode === "wordcount" ? r.duration : undefined,
    });
  }

  // Merge all results sorted by date desc
  const allResults = [...raceResults, ...soloFiltered]
    .sort((a, b) => b.date.getTime() - a.date.getTime());

  // Fetch user stats
  const [stats] = await db
    .select()
    .from(userStats)
    .where(eq(userStats.userId, userId))
    .limit(1);

  // WPM trend (all results)
  const wpmTrend = allResults
    .map((r) => ({
      date: r.date.toISOString(),
      wpm: r.wpm,
      accuracy: r.accuracy,
    }))
    .reverse();

  // Consistency score (stddev of last 50 WPMs)
  const recentWpms = allResults.slice(0, 50).map((r) => r.wpm);
  let consistencyScore: number | null = null;
  if (recentWpms.length >= 5) {
    const mean = recentWpms.reduce((s, v) => s + v, 0) / recentWpms.length;
    const variance = recentWpms.reduce((s, v) => s + (v - mean) ** 2, 0) / recentWpms.length;
    consistencyScore = Math.round(Math.sqrt(variance) * 100) / 100;
  }

  // Avg accuracy (last 50 results)
  const recentAccuracies = allResults.slice(0, 50).map((r) => r.accuracy);
  const avgAccuracy =
    recentAccuracies.length > 0
      ? Math.round((recentAccuracies.reduce((s, v) => s + v, 0) / recentAccuracies.length) * 10) / 10
      : null;

  // Win rate (multiplayer races only, min 5 to be meaningful)
  const multiplayerRaces = raceResults.filter((r) => (r.playerCount ?? 0) > 1 && r.placement != null);
  const wins = multiplayerRaces.filter((r) => r.placement === 1).length;
  const winRate =
    multiplayerRaces.length >= 5
      ? Math.round((wins / multiplayerRaces.length) * 1000) / 10
      : null;

  // ELO trend (ranked races with ELO data)
  const eloTrend = raceResults
    .filter((r) => r.eloAfter != null)
    .map((r) => ({ date: r.date.toISOString(), elo: r.eloAfter! }))
    .reverse();

  // Speed by placement (race-only)
  const placementStats: Record<number, { totalWpm: number; count: number }> = {};
  for (const r of raceResults) {
    if (r.placement != null && (r.playerCount ?? 0) > 1) {
      if (!placementStats[r.placement]) {
        placementStats[r.placement] = { totalWpm: 0, count: 0 };
      }
      placementStats[r.placement].totalWpm += r.wpm;
      placementStats[r.placement].count += 1;
    }
  }
  const speedByPlacement = Object.entries(placementStats)
    .map(([place, data]) => ({
      placement: Number(place),
      avgWpm: Math.round((data.totalWpm / data.count) * 100) / 100,
      count: data.count,
    }))
    .sort((a, b) => a.placement - b.placement);

  const placementDistribution = {
    first: placementStats[1]?.count ?? 0,
    second: placementStats[2]?.count ?? 0,
    third: placementStats[3]?.count ?? 0,
    other: Object.entries(placementStats)
      .filter(([p]) => Number(p) >= 4)
      .reduce((s, [, v]) => s + v.count, 0),
    total: multiplayerRaces.length,
  };

  // Session breakdown (races + solo per day)
  const racesPerDay: Record<string, number> = {};
  for (const r of allResults) {
    const day = r.date.toISOString().slice(0, 10);
    racesPerDay[day] = (racesPerDay[day] ?? 0) + 1;
  }

  // Word count breakdown (best/avg WPM per word count bucket)
  const wcBuckets: Record<number, { totalWpm: number; bestWpm: number; count: number }> = {};
  for (const r of allResults) {
    if (r.wordCount == null) continue;
    // Bucket into standard sizes: 10, 25, 50, 100, 150+
    const bucket = r.wordCount <= 15 ? 10 : r.wordCount <= 35 ? 25 : r.wordCount <= 75 ? 50 : r.wordCount <= 125 ? 100 : 150;
    if (!wcBuckets[bucket]) wcBuckets[bucket] = { totalWpm: 0, bestWpm: 0, count: 0 };
    wcBuckets[bucket].totalWpm += r.wpm;
    wcBuckets[bucket].count += 1;
    if (r.wpm > wcBuckets[bucket].bestWpm) wcBuckets[bucket].bestWpm = r.wpm;
  }
  const wordCountStats = Object.entries(wcBuckets)
    .map(([wc, data]) => ({
      wordCount: Number(wc),
      bestWpm: Math.round(data.bestWpm * 100) / 100,
      avgWpm: Math.round((data.totalWpm / data.count) * 100) / 100,
      count: data.count,
    }))
    .sort((a, b) => a.wordCount - b.wordCount);

  // Personal records (across both ranked and solo)
  let bestWpm: { wpm: number; date: string } | null = null;
  let bestAccuracy: { accuracy: number; date: string } | null = null;
  for (const r of allResults) {
    if (!bestWpm || r.wpm > bestWpm.wpm) {
      bestWpm = { wpm: r.wpm, date: r.date.toISOString() };
    }
    if (!bestAccuracy || r.accuracy > bestAccuracy.accuracy) {
      bestAccuracy = { accuracy: r.accuracy, date: r.date.toISOString() };
    }
  }

  // Solo vs Ranked breakdown
  function computeSourceStats(results: UnifiedResult[]) {
    if (results.length === 0) return null;
    const best = Math.max(...results.map((r) => r.wpm));
    const avg = results.reduce((s, r) => s + r.wpm, 0) / results.length;
    const avgAcc = results.reduce((s, r) => s + r.accuracy, 0) / results.length;
    return {
      count: results.length,
      bestWpm: Math.round(best * 100) / 100,
      avgWpm: Math.round(avg * 100) / 100,
      avgAccuracy: Math.round(avgAcc * 10) / 10,
    };
  }

  const soloVsRanked = {
    solo: computeSourceStats(soloFiltered),
    ranked: computeSourceStats(raceResults),
  };

  return NextResponse.json({
    totalRaces: allResults.length,
    wpmTrend,
    consistencyScore,
    avgAccuracy,
    winRate,
    eloTrend,
    speedByPlacement,
    placementDistribution,
    racesPerDay,
    modeStats,
    wordCountStats,
    soloVsRanked,
    personalRecords: {
      bestWpm,
      bestAccuracy,
      maxStreak: stats?.maxStreak ?? 0,
      maxRankedDayStreak: stats?.maxRankedDayStreak ?? 0,
    },
  });
}
