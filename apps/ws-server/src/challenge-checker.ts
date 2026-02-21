import { type Database, userChallengeProgress, userStats } from "@typeoff/db";
import { eq, and } from "drizzle-orm";
import {
  getActiveChallenges,
  getWeeklyKey,
  type ChallengeDefinition,
  type ChallengeProgress,
} from "@typeoff/shared";
import { sql } from "drizzle-orm";

export interface ChallengeContext {
  userId: string;
  raceWpm: number;
  raceAccuracy: number;
  placement: number;
  playerCount: number;
  currentStreak: number;
}

export interface ChallengeCheckResult {
  results: ChallengeProgress[];
  totalXpEarned: number;
}

export async function checkChallenges(
  ctx: ChallengeContext,
  db: Database,
): Promise<ChallengeCheckResult> {
  const now = new Date();
  const weeklyKey = getWeeklyKey(now);
  const activeChallenges = getActiveChallenges(now);

  // Load existing progress for active period key
  const existingRows = await db
    .select()
    .from(userChallengeProgress)
    .where(
      and(
        eq(userChallengeProgress.userId, ctx.userId),
        eq(userChallengeProgress.periodKey, weeklyKey),
      ),
    );

  const progressMap = new Map(
    existingRows.map((r) => [`${r.challengeId}:${r.periodKey}`, r]),
  );

  const results: ChallengeProgress[] = [];
  let totalXpEarned = 0;

  for (const challenge of activeChallenges) {
    const periodKey = weeklyKey;
    const key = `${challenge.id}:${periodKey}`;
    const existing = progressMap.get(key);

    // Already completed — skip
    if (existing?.completed) {
      results.push({
        challengeId: challenge.id,
        progress: existing.progress,
        target: challenge.target,
        completed: true,
        justCompleted: false,
        xpAwarded: 0,
      });
      continue;
    }

    const prevProgress = existing?.progress ?? 0;
    const newProgress = computeProgress(challenge, prevProgress, ctx);

    // No change — skip upsert
    if (newProgress === prevProgress) {
      results.push({
        challengeId: challenge.id,
        progress: prevProgress,
        target: challenge.target,
        completed: false,
        justCompleted: false,
        xpAwarded: 0,
      });
      continue;
    }

    const justCompleted = newProgress >= challenge.target;
    const xpAwarded = justCompleted ? challenge.xpReward : 0;

    // Upsert progress
    await db
      .insert(userChallengeProgress)
      .values({
        userId: ctx.userId,
        challengeId: challenge.id,
        periodKey,
        progress: newProgress,
        completed: justCompleted,
        completedAt: justCompleted ? now : null,
        xpAwarded,
      })
      .onConflictDoUpdate({
        target: [
          userChallengeProgress.userId,
          userChallengeProgress.challengeId,
          userChallengeProgress.periodKey,
        ],
        set: {
          progress: newProgress,
          completed: justCompleted,
          completedAt: justCompleted ? now : undefined,
          xpAwarded,
        },
      });

    if (xpAwarded > 0) {
      totalXpEarned += xpAwarded;
    }

    results.push({
      challengeId: challenge.id,
      progress: Math.min(newProgress, challenge.target),
      target: challenge.target,
      completed: justCompleted,
      justCompleted,
      xpAwarded,
    });
  }

  // Award XP in bulk
  if (totalXpEarned > 0) {
    await db
      .update(userStats)
      .set({
        totalXp: sql`${userStats.totalXp} + ${totalXpEarned}`,
      })
      .where(eq(userStats.userId, ctx.userId));
  }

  return { results, totalXpEarned };
}

function computeProgress(
  challenge: ChallengeDefinition,
  prevProgress: number,
  ctx: ChallengeContext,
): number {
  switch (challenge.category) {
    case "volume":
      // Increment by 1 for each race
      return prevProgress + 1;

    case "wins":
      // Increment if won
      return ctx.placement === 1 ? prevProgress + 1 : prevProgress;

    case "speed":
      // Binary (has threshold): hit WPM once → 1
      // Cumulative (no threshold): count races above 100 WPM
      if (challenge.threshold != null) {
        return ctx.raceWpm >= challenge.threshold ? 1 : prevProgress;
      }
      return ctx.raceWpm >= 100 ? prevProgress + 1 : prevProgress;

    case "accuracy":
      // Binary (has threshold): hit accuracy once → 1
      // Cumulative (no threshold): count races with 95%+ accuracy
      if (challenge.threshold != null) {
        return ctx.raceAccuracy >= challenge.threshold ? 1 : prevProgress;
      }
      return ctx.raceAccuracy >= 95 ? prevProgress + 1 : prevProgress;

    case "streak":
      // Set to current streak if higher (not cumulative)
      return Math.max(prevProgress, ctx.currentStreak);

    case "top2":
      return ctx.placement <= 2 ? prevProgress + 1 : prevProgress;

    default:
      return prevProgress;
  }
}
