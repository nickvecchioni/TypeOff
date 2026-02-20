import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { textLeaderboards, users, userStats } from "@typeoff/db";
import { eq, desc, sql } from "drizzle-orm";
import { calculateTotalPP } from "@typeoff/shared";

export const dynamic = "force-dynamic";

// GET — returns PP profile for a user
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  const db = getDb();

  // Get top 50 PP scores
  const topScores = await db
    .select({
      textHash: textLeaderboards.textHash,
      bestWpm: textLeaderboards.bestWpm,
      bestAccuracy: textLeaderboards.bestAccuracy,
      pp: textLeaderboards.pp,
      textDifficulty: textLeaderboards.textDifficulty,
      mode: textLeaderboards.mode,
      updatedAt: textLeaderboards.updatedAt,
    })
    .from(textLeaderboards)
    .where(eq(textLeaderboards.userId, userId))
    .orderBy(desc(textLeaderboards.pp))
    .limit(50);

  const ppScores = topScores.map((s) => s.pp);
  const totalPp = calculateTotalPP(ppScores);

  // Get user's rank by total PP
  const [rankResult] = await db
    .select({ count: sql<number>`count(*) + 1` })
    .from(userStats)
    .where(sql`${userStats.totalPp} > ${totalPp}`);
  const rank = Number(rankResult?.count ?? 1);

  // Get username
  const [user] = await db
    .select({ username: users.username })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return NextResponse.json({
    userId,
    username: user?.username,
    totalPp: Math.round(totalPp * 100) / 100,
    rank,
    topScores: topScores.map((s, i) => ({
      ...s,
      weight: Math.pow(0.95, i),
      weightedPp: Math.round(s.pp * Math.pow(0.95, i) * 100) / 100,
    })),
  });
}
