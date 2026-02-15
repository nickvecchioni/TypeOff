import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { soloResults, userStats } from "@typeoff/db";
import { eq, and, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const { auth } = await import("@/lib/auth");
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const {
    mode,
    duration,
    wordPool,
    wpm,
    rawWpm,
    accuracy,
    correctChars,
    incorrectChars,
    extraChars,
    totalChars,
    time,
  } = body;

  if (!mode || !duration || wpm == null || accuracy == null || time == null) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const db = getDb();
  const userId = session.user.id;

  // Find existing best WPM for this (mode, duration, wordPool) combo
  const existing = await db
    .select({ wpm: soloResults.wpm })
    .from(soloResults)
    .where(
      and(
        eq(soloResults.userId, userId),
        eq(soloResults.mode, mode),
        eq(soloResults.duration, duration),
        wordPool
          ? eq(soloResults.wordPool, wordPool)
          : undefined
      )
    )
    .orderBy(desc(soloResults.wpm))
    .limit(1);

  const previousBest = existing.length > 0 ? existing[0].wpm : null;
  const isPb = previousBest === null || wpm > previousBest;

  await db.insert(soloResults).values({
    userId,
    mode,
    duration,
    wordPool: wordPool ?? null,
    wpm,
    rawWpm,
    accuracy,
    correctChars,
    incorrectChars,
    extraChars,
    totalChars,
    time,
    isPb,
  });

  // Update userStats.maxWpm if new overall best
  if (isPb) {
    const statsRows = await db
      .select({ maxWpm: userStats.maxWpm })
      .from(userStats)
      .where(eq(userStats.userId, userId))
      .limit(1);

    if (statsRows.length > 0) {
      if (wpm > statsRows[0].maxWpm) {
        await db
          .update(userStats)
          .set({ maxWpm: wpm, updatedAt: new Date() })
          .where(eq(userStats.userId, userId));
      }
    }
  }

  return NextResponse.json({ saved: true, isPb, previousBest });
}

export async function GET(request: Request) {
  const { auth } = await import("@/lib/auth");
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "20"), 100);

  const db = getDb();

  const rows = await db
    .select()
    .from(soloResults)
    .where(eq(soloResults.userId, session.user.id))
    .orderBy(desc(soloResults.createdAt))
    .limit(limit);

  return NextResponse.json(rows);
}
