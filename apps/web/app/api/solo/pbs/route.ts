import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { soloResults } from "@typeoff/db";
import { eq, desc, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { auth } = await import("@/lib/auth");
  const session = await auth();

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId") ?? session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();

  // For each (mode, duration, wordPool) combo, get the row with max WPM
  const rows = await db
    .select({
      mode: soloResults.mode,
      duration: soloResults.duration,
      wordPool: soloResults.wordPool,
      wpm: sql<number>`max(${soloResults.wpm})`.as("wpm"),
      accuracy: soloResults.accuracy,
      time: soloResults.time,
      createdAt: soloResults.createdAt,
    })
    .from(soloResults)
    .where(eq(soloResults.userId, userId))
    .groupBy(
      soloResults.mode,
      soloResults.duration,
      soloResults.wordPool,
      soloResults.accuracy,
      soloResults.time,
      soloResults.createdAt
    )
    .orderBy(desc(sql`max(${soloResults.wpm})`));

  // Deduplicate: keep only the best WPM per (mode, duration, wordPool)
  const pbMap = new Map<string, (typeof rows)[0]>();
  for (const row of rows) {
    const key = `${row.mode}:${row.duration}:${row.wordPool ?? ""}`;
    const existing = pbMap.get(key);
    if (!existing || row.wpm > existing.wpm) {
      pbMap.set(key, row);
    }
  }

  return NextResponse.json(Array.from(pbMap.values()));
}
