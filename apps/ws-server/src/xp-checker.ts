import { type Database, userCosmetics, userStats } from "@typeoff/db";
import { eq } from "drizzle-orm";
import { sql } from "drizzle-orm";
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
}

export async function checkXpRewards(
  ctx: XpContext,
  db: Database,
): Promise<XpProgress> {
  const xpEarned = calculateRaceXp({
    wpm: ctx.raceWpm,
    accuracy: ctx.raceAccuracy,
    placement: ctx.placement,
    playerCount: ctx.playerCount,
  });

  // Read current totalXp
  const [stats] = await db
    .select({ totalXp: userStats.totalXp })
    .from(userStats)
    .where(eq(userStats.userId, ctx.userId))
    .limit(1);

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
  const newRewards = getNewCosmeticRewards(prevXp, newXp);
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
  };
}
