import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { soloResults } from "@typeoff/db";
import { eq, desc } from "drizzle-orm";

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

  const rows = await db
    .select({
      mode: soloResults.mode,
      duration: soloResults.duration,
      wordPool: soloResults.wordPool,
      wpm: soloResults.wpm,
      time: soloResults.time,
      createdAt: soloResults.createdAt,
    })
    .from(soloResults)
    .where(eq(soloResults.userId, userId))
    .orderBy(desc(soloResults.wpm));

  // Keep only the best WPM per (mode, duration, wordPool)
  const pbMap = new Map<string, (typeof rows)[0]>();
  for (const row of rows) {
    const key = `${row.mode}:${row.duration}:${row.wordPool ?? "common"}`;
    if (!pbMap.has(key)) {
      pbMap.set(key, row);
    }
  }

  return NextResponse.json(Array.from(pbMap.values()));
}
