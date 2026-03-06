import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import {
  raceParticipants,
  races,
  soloResults,
  userKeyAccuracy,
  userBigramAccuracy,
  userStats,
} from "@typeoff/db";
import { eq, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!session.user.isPro) {
    return NextResponse.json({ error: "Pro required" }, { status: 403 });
  }

  const type = req.nextUrl.searchParams.get("type") ?? "all";
  const format = req.nextUrl.searchParams.get("format") ?? "json";
  const db = getDb();
  const userId = session.user.id;

  const data: Record<string, unknown> = {};

  // Race history
  if (type === "all" || type === "races") {
    const raceRows = await db
      .select({
        raceId: raceParticipants.raceId,
        placement: raceParticipants.placement,
        wpm: raceParticipants.wpm,
        rawWpm: raceParticipants.rawWpm,
        accuracy: raceParticipants.accuracy,
        eloBefore: raceParticipants.eloBefore,
        eloAfter: raceParticipants.eloAfter,
        finishedAt: raceParticipants.finishedAt,
        pp: raceParticipants.pp,
        playerCount: races.playerCount,
        modeCategory: races.modeCategory,
        seed: races.seed,
      })
      .from(raceParticipants)
      .innerJoin(races, eq(raceParticipants.raceId, races.id))
      .where(eq(raceParticipants.userId, userId))
      .orderBy(desc(raceParticipants.finishedAt));

    data.races = raceRows.map((r) => ({
      raceId: r.raceId,
      placement: r.placement,
      wpm: r.wpm,
      rawWpm: r.rawWpm,
      accuracy: r.accuracy,
      eloChange:
        r.eloBefore != null && r.eloAfter != null
          ? r.eloAfter - r.eloBefore
          : null,
      eloBefore: r.eloBefore,
      eloAfter: r.eloAfter,
      pp: r.pp,
      finishedAt: r.finishedAt?.toISOString() ?? null,
      playerCount: r.playerCount,
      modeCategory: r.modeCategory,
      seed: r.seed,
    }));
  }

  // Solo results
  if (type === "all" || type === "solo") {
    const soloRows = await db
      .select({
        mode: soloResults.mode,
        duration: soloResults.duration,
        wordPool: soloResults.wordPool,
        wpm: soloResults.wpm,
        rawWpm: soloResults.rawWpm,
        accuracy: soloResults.accuracy,
        correctChars: soloResults.correctChars,
        incorrectChars: soloResults.incorrectChars,
        totalChars: soloResults.totalChars,
        time: soloResults.time,
        isPb: soloResults.isPb,
        consistency: soloResults.consistency,
        seed: soloResults.seed,
        createdAt: soloResults.createdAt,
      })
      .from(soloResults)
      .where(eq(soloResults.userId, userId))
      .orderBy(desc(soloResults.createdAt));

    data.soloResults = soloRows.map((r) => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  // Key accuracy
  if (type === "all" || type === "keys") {
    const keyRows = await db
      .select({
        key: userKeyAccuracy.key,
        correctCount: userKeyAccuracy.correctCount,
        totalCount: userKeyAccuracy.totalCount,
      })
      .from(userKeyAccuracy)
      .where(eq(userKeyAccuracy.userId, userId));

    data.keyAccuracy = keyRows.map((r) => ({
      key: r.key,
      correct: r.correctCount,
      total: r.totalCount,
      accuracy:
        r.totalCount > 0
          ? Math.round((r.correctCount / r.totalCount) * 10000) / 100
          : 100,
    }));
  }

  // Bigram accuracy
  if (type === "all" || type === "bigrams") {
    const bigramRows = await db
      .select({
        bigram: userBigramAccuracy.bigram,
        correctCount: userBigramAccuracy.correctCount,
        totalCount: userBigramAccuracy.totalCount,
      })
      .from(userBigramAccuracy)
      .where(eq(userBigramAccuracy.userId, userId));

    data.bigramAccuracy = bigramRows.map((r) => ({
      bigram: r.bigram,
      correct: r.correctCount,
      total: r.totalCount,
      accuracy:
        r.totalCount > 0
          ? Math.round((r.correctCount / r.totalCount) * 10000) / 100
          : 100,
    }));
  }

  // Aggregate stats
  if (type === "all" || type === "stats") {
    const [stats] = await db
      .select()
      .from(userStats)
      .where(eq(userStats.userId, userId))
      .limit(1);

    data.stats = stats
      ? {
          racesPlayed: stats.racesPlayed,
          racesWon: stats.racesWon,
          avgWpm: stats.avgWpm,
          maxWpm: stats.maxWpm,
          avgAccuracy: stats.avgAccuracy,
          currentStreak: stats.currentStreak,
          maxStreak: stats.maxStreak,
          totalXp: stats.totalXp,
          totalPp: stats.totalPp,
        }
      : null;
  }

  if (format === "csv") {
    // CSV: flatten race history only (most common export use case)
    const raceData = (data.races ?? []) as Array<Record<string, unknown>>;
    if (raceData.length === 0) {
      return new Response("No data", { status: 200 });
    }

    const headers = Object.keys(raceData[0]);
    const csvRows = [
      headers.join(","),
      ...raceData.map((row) =>
        headers.map((h) => {
          const v = row[h];
          return v == null ? "" : String(v);
        }).join(","),
      ),
    ];

    return new Response(csvRows.join("\n"), {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="typeoff-export-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  }

  return NextResponse.json({
    exportedAt: new Date().toISOString(),
    username: session.user.username,
    ...data,
  });
}
