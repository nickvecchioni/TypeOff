import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { raceParticipants, races, userStats } from "@typeoff/db";
import { eq, desc, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const userId = session.user.id;
  const isPro = session.user.isPro ?? false;

  // Free users: return limited data (last 20 races, best records only)
  if (!isPro) {
    const freeRaces = await db
      .select({
        wpm: raceParticipants.wpm,
        accuracy: raceParticipants.accuracy,
        finishedAt: raceParticipants.finishedAt,
      })
      .from(raceParticipants)
      .where(eq(raceParticipants.userId, userId))
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

    return NextResponse.json({ wpmTrend, personalRecords: { bestWpm, bestAccuracy } });
  }

  // Pro users: fetch everything
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
    .where(eq(raceParticipants.userId, userId))
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
    speedByPlacement,
    racesPerDay,
    personalRecords: {
      bestWpm,
      bestAccuracy,
      maxStreak: stats?.maxStreak ?? 0,
      maxRankedDayStreak: stats?.maxRankedDayStreak ?? 0,
    },
  });
}
