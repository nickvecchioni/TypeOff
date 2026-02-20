import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { dailyChallenges, dailyChallengeResults, users } from "@typeoff/db";
import { eq, and, desc, sql } from "drizzle-orm";
import { dailySeed } from "@typeoff/shared";

export const dynamic = "force-dynamic";

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

// GET — returns today's challenge + leaderboard + user's result
export async function GET() {
  const session = await auth();
  const db = getDb();
  const today = todayUTC();

  // Auto-create today's challenge if not exists
  let [challenge] = await db
    .select()
    .from(dailyChallenges)
    .where(eq(dailyChallenges.date, today))
    .limit(1);

  if (!challenge) {
    const seed = dailySeed(today);
    [challenge] = await db
      .insert(dailyChallenges)
      .values({
        date: today,
        seed,
        mode: "standard",
        wordCount: 50,
      })
      .onConflictDoNothing()
      .returning();

    // Handle race condition — re-fetch if insert was a no-op
    if (!challenge) {
      [challenge] = await db
        .select()
        .from(dailyChallenges)
        .where(eq(dailyChallenges.date, today))
        .limit(1);
    }
  }

  // Leaderboard (top 50)
  const leaderboard = await db
    .select({
      userId: dailyChallengeResults.userId,
      username: users.username,
      wpm: dailyChallengeResults.wpm,
      rawWpm: dailyChallengeResults.rawWpm,
      accuracy: dailyChallengeResults.accuracy,
      attempts: dailyChallengeResults.attempts,
      completedAt: dailyChallengeResults.completedAt,
    })
    .from(dailyChallengeResults)
    .innerJoin(users, eq(dailyChallengeResults.userId, users.id))
    .where(eq(dailyChallengeResults.dailyChallengeId, challenge.id))
    .orderBy(desc(dailyChallengeResults.wpm))
    .limit(50);

  // User's result (if authenticated)
  let myResult = null;
  if (session?.user?.id) {
    const [result] = await db
      .select()
      .from(dailyChallengeResults)
      .where(
        and(
          eq(dailyChallengeResults.dailyChallengeId, challenge.id),
          eq(dailyChallengeResults.userId, session.user.id),
        ),
      )
      .limit(1);
    if (result) {
      myResult = {
        wpm: result.wpm,
        rawWpm: result.rawWpm,
        accuracy: result.accuracy,
        attempts: result.attempts,
      };
    }
  }

  // Countdown to next day (UTC midnight)
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  tomorrow.setUTCHours(0, 0, 0, 0);
  const nextDailyAt = tomorrow.getTime();

  return NextResponse.json({
    challenge: {
      id: challenge.id,
      date: challenge.date,
      seed: challenge.seed,
      mode: challenge.mode,
      wordCount: challenge.wordCount,
    },
    leaderboard,
    myResult,
    nextDailyAt,
  });
}

// POST — submit daily challenge attempt (upserts best)
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { challengeId, wpm, rawWpm, accuracy } = body;

  if (!challengeId || wpm == null || rawWpm == null || accuracy == null) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Verify challenge exists and is today's
  const db = getDb();
  const [challenge] = await db
    .select()
    .from(dailyChallenges)
    .where(eq(dailyChallenges.id, challengeId))
    .limit(1);

  if (!challenge || challenge.date !== todayUTC()) {
    return NextResponse.json({ error: "Invalid or expired challenge" }, { status: 400 });
  }

  // Upsert — update only if WPM is higher, always increment attempts
  await db
    .insert(dailyChallengeResults)
    .values({
      dailyChallengeId: challengeId,
      userId: session.user.id,
      wpm,
      rawWpm,
      accuracy,
      attempts: 1,
    })
    .onConflictDoUpdate({
      target: [dailyChallengeResults.dailyChallengeId, dailyChallengeResults.userId],
      set: {
        wpm: sql`CASE WHEN excluded.wpm > ${dailyChallengeResults.wpm} THEN excluded.wpm ELSE ${dailyChallengeResults.wpm} END`,
        rawWpm: sql`CASE WHEN excluded.wpm > ${dailyChallengeResults.wpm} THEN excluded.raw_wpm ELSE ${dailyChallengeResults.rawWpm} END`,
        accuracy: sql`CASE WHEN excluded.wpm > ${dailyChallengeResults.wpm} THEN excluded.accuracy ELSE ${dailyChallengeResults.accuracy} END`,
        attempts: sql`${dailyChallengeResults.attempts} + 1`,
        completedAt: new Date(),
      },
    });

  return NextResponse.json({ ok: true });
}
