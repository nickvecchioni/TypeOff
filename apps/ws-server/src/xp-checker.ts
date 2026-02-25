import { type Database, userCosmetics, userStats, userSubscription } from "@typeoff/db";
import { eq } from "drizzle-orm";
import { sql } from "drizzle-orm";

const PRO_XP_MULTIPLIER = 1.5;
import {
  calculateRaceXp,
  getXpLevel,
  getNewCosmeticRewards,
  type CosmeticReward,
} from "@typeoff/shared";

export interface XpContext {
  userId: string;
  raceWpm: number;
  raceAccuracy: number;
  placement: number;
  playerCount: number;
}

export interface XpProgress {
  xpEarned: number;
  totalXp: number;
  level: number;
  levelUp: boolean;
  newRewards: CosmeticReward[];
  isPro: boolean;
}

export async function checkXpRewards(
  ctx: XpContext,
  db: Database,
): Promise<XpProgress> {
  // Check Pro status and read current XP in parallel
  const [[sub], [stats]] = await Promise.all([
    db
      .select({ status: userSubscription.status })
      .from(userSubscription)
      .where(eq(userSubscription.userId, ctx.userId))
      .limit(1),
    db
      .select({ totalXp: userStats.totalXp })
      .from(userStats)
      .where(eq(userStats.userId, ctx.userId))
      .limit(1),
  ]);

  const isPro = sub?.status === "active" || sub?.status === "lifetime" || sub?.status === "past_due";

  const baseXp = calculateRaceXp({
    wpm: ctx.raceWpm,
    accuracy: ctx.raceAccuracy,
    placement: ctx.placement,
    playerCount: ctx.playerCount,
  });
  const xpEarned = isPro ? Math.round(baseXp * PRO_XP_MULTIPLIER) : baseXp;

  const prevXp = stats?.totalXp ?? 0;
  const newXp = prevXp + xpEarned;

  // Increment totalXp
  await db
    .update(userStats)
    .set({
      totalXp: sql`${userStats.totalXp} + ${xpEarned}`,
    })
    .where(eq(userStats.userId, ctx.userId));

  const prevLevel = getXpLevel(prevXp).level;
  const newLevel = getXpLevel(newXp).level;
  const levelUp = newLevel > prevLevel;

  // If level increased, unlock new cosmetic rewards
  const newRewards = getNewCosmeticRewards(prevXp, newXp, isPro);
  if (newRewards.length > 0) {
    for (const reward of newRewards) {
      await db
        .insert(userCosmetics)
        .values({
          userId: ctx.userId,
          cosmeticId: reward.id,
          seasonId: "xp",
        })
        .onConflictDoNothing();
    }
  }

  return {
    xpEarned,
    totalXp: newXp,
    level: newLevel,
    levelUp,
    newRewards,
    isPro,
  };
}
