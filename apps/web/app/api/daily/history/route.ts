import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { dailyChallenges, dailyChallengeResults, users } from "@typeoff/db";
import { eq, desc, and, sql, inArray } from "drizzle-orm";

export const dynamic = "force-dynamic";

// GET — past 7 days of daily challenges with user results
export async function GET() {
  const session = await auth();
  const db = getDb();

  // Get last 7 daily challenges
  const challenges = await db
    .select()
    .from(dailyChallenges)
    .orderBy(desc(dailyChallenges.date))
    .limit(7);

  if (challenges.length === 0) {
    return NextResponse.json({ days: [] });
  }

  const challengeIds = challenges.map((c) => c.id);

  // Get top result for each challenge
  const topResults = await db
    .select({
      challengeId: dailyChallengeResults.dailyChallengeId,
      username: users.username,
      wpm: dailyChallengeResults.wpm,
    })
    .from(dailyChallengeResults)
    .innerJoin(users, eq(dailyChallengeResults.userId, users.id))
    .where(inArray(dailyChallengeResults.dailyChallengeId, challengeIds))
    .orderBy(desc(dailyChallengeResults.wpm));

  // Group by challenge, take the top entry per challenge
  const topByChallenge = new Map<string, { username: string | null; wpm: number }>();
  for (const r of topResults) {
    if (!topByChallenge.has(r.challengeId)) {
      topByChallenge.set(r.challengeId, { username: r.username, wpm: r.wpm });
    }
  }

  // Get participant counts
  const countResults = await db
    .select({
      challengeId: dailyChallengeResults.dailyChallengeId,
      count: sql<number>`count(*)`.as("cnt"),
    })
    .from(dailyChallengeResults)
    .where(inArray(dailyChallengeResults.dailyChallengeId, challengeIds))
    .groupBy(dailyChallengeResults.dailyChallengeId);
  const countMap = new Map(countResults.map((r) => [r.challengeId, Number(r.count)]));

  // Get user's results if authenticated
  const userResults = new Map<string, { wpm: number; accuracy: number; attempts: number }>();
  if (session?.user?.id) {
    const myResults = await db
      .select({
        challengeId: dailyChallengeResults.dailyChallengeId,
        wpm: dailyChallengeResults.wpm,
        accuracy: dailyChallengeResults.accuracy,
        attempts: dailyChallengeResults.attempts,
      })
      .from(dailyChallengeResults)
      .where(
        and(
          inArray(dailyChallengeResults.dailyChallengeId, challengeIds),
          eq(dailyChallengeResults.userId, session.user.id),
        ),
      );
    for (const r of myResults) {
      userResults.set(r.challengeId, { wpm: r.wpm, accuracy: r.accuracy, attempts: r.attempts });
    }
  }

  const days = challenges.map((c) => {
    const top = topByChallenge.get(c.id);
    const myResult = userResults.get(c.id);
    return {
      date: c.date,
      challengeId: c.id,
      seed: c.seed,
      mode: c.mode,
      wordCount: c.wordCount,
      participants: countMap.get(c.id) ?? 0,
      topResult: top ?? null,
      myResult: myResult ?? null,
    };
  });

  return NextResponse.json({ days });
}
