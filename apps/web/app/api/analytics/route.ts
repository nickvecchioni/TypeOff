import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { raceParticipants, races, userStats, userModeStats } from "@typeoff/db";
import { eq, desc, sql, and } from "drizzle-orm";
import type { ModeCategory } from "@typeoff/shared";

export const dynamic = "force-dynamic";

const VALID_MODES = new Set<string>(["words", "special", "quotes", "code"]);

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const rawMode = searchParams.get("mode");
  const modeFilter: ModeCategory | null =
    rawMode && VALID_MODES.has(rawMode) ? (rawMode as ModeCategory) : null;

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

  // Free users: return limited data (last 20 races, best records only)
  if (!isPro) {
    const whereClause = modeFilter
      ? and(eq(raceParticipants.userId, userId), eq(races.modeCategory, modeFilter))
      : eq(raceParticipants.userId, userId);

    const freeRaces = await db
      .select({
        wpm: raceParticipants.wpm,
        accuracy: raceParticipants.accuracy,
        finishedAt: raceParticipants.finishedAt,
      })
      .from(raceParticipants)
      .innerJoin(races, eq(raceParticipants.raceId, races.id))
      .where(whereClause)
      .orderBy(desc(raceParticipants.finishedAt))
      .limit(20);

    const wpmTrend = freeRaces
      .filter((r) => r.wpm != null && r.finishedAt)
      .map((r) => ({ date: r.finishedAt!.toISOString(), wpm: r.wpm!, accuracy: r.accuracy ?? 0 }))
      .reverse();

    let bestWpm: { wpm: number; date: string } | null = null;
    let bestAccuracy: { accuracy: number; date: string } | null = null;
    for (const r of freeRaces) {
      if (r.wpm != null && r.finishedAt) {
        if (!bestWpm || r.wpm > bestWpm.wpm) bestWpm = { wpm: r.wpm, date: r.finishedAt.toISOString() };
      }
      if (r.accuracy != null && r.finishedAt) {
        if (!bestAccuracy || r.accuracy > bestAccuracy.accuracy) bestAccuracy = { accuracy: r.accuracy, date: r.finishedAt.toISOString() };
      }
    }

    return NextResponse.json({ wpmTrend, personalRecords: { bestWpm, bestAccuracy }, modeStats });
  }

  // Pro users: fetch everything
  const whereClause = modeFilter
    ? and(eq(raceParticipants.userId, userId), eq(races.modeCategory, modeFilter))
    : eq(raceParticipants.userId, userId);

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
    })
    .from(raceParticipants)
    .innerJoin(races, eq(raceParticipants.raceId, races.id))
    .where(whereClause)
    .orderBy(desc(raceParticipants.finishedAt));

  // Fetch user stats
  const [stats] = await db
    .select()
    .from(userStats)
    .where(eq(userStats.userId, userId))
    .limit(1);

  // WPM trend (all races)
  const wpmTrend = allRaces
    .filter((r) => r.wpm != null && r.finishedAt)
    .map((r) => ({
      date: r.finishedAt!.toISOString(),
      wpm: r.wpm!,
      accuracy: r.accuracy ?? 0,
    }))
    .reverse();

  // Consistency score (stddev of last 50 WPMs)
  const recentWpms = allRaces
    .filter((r) => r.wpm != null)
    .slice(0, 50)
    .map((r) => r.wpm!);
  let consistencyScore: number | null = null;
  if (recentWpms.length >= 5) {
    const mean = recentWpms.reduce((s, v) => s + v, 0) / recentWpms.length;
    const variance = recentWpms.reduce((s, v) => s + (v - mean) ** 2, 0) / recentWpms.length;
    consistencyScore = Math.round(Math.sqrt(variance) * 100) / 100;
  }

  // Avg accuracy (last 50 races)
  const recentAccuracies = allRaces.filter((r) => r.accuracy != null).slice(0, 50).map((r) => r.accuracy!);
  const avgAccuracy =
    recentAccuracies.length > 0
      ? Math.round((recentAccuracies.reduce((s, v) => s + v, 0) / recentAccuracies.length) * 10) / 10
      : null;

  // Win rate (multiplayer races only, min 5 to be meaningful)
  const multiplayerRaces = allRaces.filter((r) => r.playerCount > 1 && r.placement != null);
  const wins = multiplayerRaces.filter((r) => r.placement === 1).length;
  const winRate =
    multiplayerRaces.length >= 5
      ? Math.round((wins / multiplayerRaces.length) * 1000) / 10
      : null;

  // ELO trend (ranked races with ELO data)
  const eloTrend = allRaces
    .filter((r) => r.eloAfter != null && r.finishedAt)
    .map((r) => ({ date: r.finishedAt!.toISOString(), elo: r.eloAfter! }))
    .reverse();

  // Speed by placement
  const placementStats: Record<number, { totalWpm: number; count: number }> = {};
  for (const r of allRaces) {
    if (r.placement != null && r.wpm != null && r.playerCount > 1) {
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

  // Session breakdown (races per day)
  const racesPerDay: Record<string, number> = {};
  for (const r of allRaces) {
    if (r.finishedAt) {
      const day = r.finishedAt.toISOString().slice(0, 10);
      racesPerDay[day] = (racesPerDay[day] ?? 0) + 1;
    }
  }

  // Personal records
  let bestWpm: { wpm: number; date: string } | null = null;
  let bestAccuracy: { accuracy: number; date: string } | null = null;
  for (const r of allRaces) {
    if (r.wpm != null && r.finishedAt) {
      if (!bestWpm || r.wpm > bestWpm.wpm) {
        bestWpm = { wpm: r.wpm, date: r.finishedAt.toISOString() };
      }
    }
    if (r.accuracy != null && r.finishedAt) {
      if (!bestAccuracy || r.accuracy > bestAccuracy.accuracy) {
        bestAccuracy = { accuracy: r.accuracy, date: r.finishedAt.toISOString() };
      }
    }
  }

  return NextResponse.json({
    totalRaces: allRaces.length,
    wpmTrend,
    consistencyScore,
    avgAccuracy,
    winRate,
    eloTrend,
    speedByPlacement,
    placementDistribution,
    racesPerDay,
    modeStats,
    personalRecords: {
      bestWpm,
      bestAccuracy,
      maxStreak: stats?.maxStreak ?? 0,
      maxRankedDayStreak: stats?.maxRankedDayStreak ?? 0,
    },
  });
}
