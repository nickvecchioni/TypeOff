import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { userChallengeProgress, userStats } from "@typeoff/db";
import { eq, and, inArray } from "drizzle-orm";
import {
  getActiveChallenges,
  getWeeklyKey,
  type ChallengeDefinition,
} from "@typeoff/shared";

export async function GET() {
  const now = new Date();
  const weeklyKey = getWeeklyKey(now);
  const challenges = getActiveChallenges(now);

  const session = await auth();

  let progressMap = new Map<string, { progress: number; completed: boolean }>();
  let totalXp = 0;

  if (session?.user?.id) {
    const db = getDb();

    // Load progress for active challenges
    const challengeIds = challenges.map((c) => c.id);
    const rows = await db
      .select({
        challengeId: userChallengeProgress.challengeId,
        periodKey: userChallengeProgress.periodKey,
        progress: userChallengeProgress.progress,
        completed: userChallengeProgress.completed,
      })
      .from(userChallengeProgress)
      .where(
        and(
          eq(userChallengeProgress.userId, session.user.id),
          inArray(userChallengeProgress.challengeId, challengeIds),
          eq(userChallengeProgress.periodKey, weeklyKey),
        ),
      );

    for (const row of rows) {
      progressMap.set(`${row.challengeId}:${row.periodKey}`, {
        progress: row.progress,
        completed: row.completed,
      });
    }

    // Load total XP
    const statsRows = await db
      .select({ totalXp: userStats.totalXp })
      .from(userStats)
      .where(eq(userStats.userId, session.user.id))
      .limit(1);
    totalXp = statsRows[0]?.totalXp ?? 0;
  }

  const challengesWithProgress = challenges.map((c: ChallengeDefinition) => {
    const periodKey = weeklyKey;
    const prog = progressMap.get(`${c.id}:${periodKey}`);
    return {
      ...c,
      progress: prog?.progress ?? 0,
      completed: prog?.completed ?? false,
    };
  });

  return NextResponse.json({
    challenges: challengesWithProgress,
    totalXp,
    weeklyKey,
  });
}
