import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { soloResults, users } from "@typeoff/db";
import { eq, and, desc, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("mode") ?? "timed";
  const duration = parseInt(searchParams.get("duration") ?? "30");
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "100"), 100);

  const db = getDb();

  // For each user, find their max WPM row for this mode+duration
  const rows = await db
    .select({
      userId: soloResults.userId,
      username: users.username,
      wpm: sql<number>`max(${soloResults.wpm})`.as("best_wpm"),
      accuracy: soloResults.accuracy,
      createdAt: soloResults.createdAt,
    })
    .from(soloResults)
    .innerJoin(users, eq(soloResults.userId, users.id))
    .where(
      and(
        eq(soloResults.mode, mode),
        eq(soloResults.duration, duration)
      )
    )
    .groupBy(
      soloResults.userId,
      users.username,
      soloResults.accuracy,
      soloResults.createdAt
    )
    .orderBy(desc(sql`max(${soloResults.wpm})`))
    .limit(limit);

  // Deduplicate: keep only the best WPM per user
  const userMap = new Map<string, (typeof rows)[0] & { rank: number }>();
  let rank = 0;
  for (const row of rows) {
    if (!userMap.has(row.userId)) {
      rank++;
      userMap.set(row.userId, { ...row, rank });
    } else {
      const existing = userMap.get(row.userId)!;
      if (row.wpm > existing.wpm) {
        userMap.set(row.userId, { ...row, rank: existing.rank });
      }
    }
  }

  return NextResponse.json(Array.from(userMap.values()));
}
