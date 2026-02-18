import { type Database, userKeyPass, userCosmetics, userStats } from "@typeoff/db";
import { eq, and } from "drizzle-orm";
import { sql } from "drizzle-orm";
import {
  getCurrentSeason,
  getSeasonTier,
  calculateRaceSeasonXp,
  getNewRewardsAtTier,
  type KeyPassProgress,
  type KeyPassReward,
} from "@typeoff/shared";

export interface KeyPassContext {
  userId: string;
  raceWpm: number;
  raceAccuracy: number;
  placement: number;
  playerCount: number;
}

export async function checkKeyPass(
  ctx: KeyPassContext,
  db: Database,
): Promise<KeyPassProgress | null> {
  const season = getCurrentSeason();
  if (!season) return null;

  const xpEarned = calculateRaceSeasonXp({
    wpm: ctx.raceWpm,
    accuracy: ctx.raceAccuracy,
    placement: ctx.placement,
    playerCount: ctx.playerCount,
  });

  // Load or create user key pass row
  const existing = await db
    .select()
    .from(userKeyPass)
    .where(
      and(
        eq(userKeyPass.userId, ctx.userId),
        eq(userKeyPass.seasonId, season.id),
      ),
    );

  const prevXp = existing.length > 0 ? existing[0].seasonalXp : 0;
  const prevTier = existing.length > 0 ? existing[0].currentTier : 0;
  const isPremium = existing.length > 0 ? existing[0].isPremium : false;

  const newXp = prevXp + xpEarned;
  const newTier = Math.min(getSeasonTier(newXp, season.xpPerTier), season.maxTier);
  const tierUp = newTier > prevTier;

  // Upsert key pass progress
  if (existing.length === 0) {
    await db.insert(userKeyPass).values({
      userId: ctx.userId,
      seasonId: season.id,
      seasonalXp: newXp,
      currentTier: newTier,
      isPremium: false,
    });
  } else {
    await db
      .update(userKeyPass)
      .set({
        seasonalXp: newXp,
        currentTier: newTier,
      })
      .where(
        and(
          eq(userKeyPass.userId, ctx.userId),
          eq(userKeyPass.seasonId, season.id),
        ),
      );
  }

  // If tier increased, unlock new rewards
  const newRewards: KeyPassReward[] = [];
  if (tierUp) {
    for (let t = prevTier + 1; t <= newTier; t++) {
      const rewards = getNewRewardsAtTier(season, t, isPremium);
      for (const reward of rewards) {
        await db
          .insert(userCosmetics)
          .values({
            userId: ctx.userId,
            cosmeticId: reward.id,
            seasonId: season.id,
          })
          .onConflictDoNothing();
        newRewards.push(reward);
      }
    }
  }

  // Also add XP to lifetime totalXp
  await db
    .update(userStats)
    .set({
      totalXp: sql`${userStats.totalXp} + ${xpEarned}`,
    })
    .where(eq(userStats.userId, ctx.userId));

  return {
    seasonId: season.id,
    seasonalXp: newXp,
    currentTier: newTier,
    isPremium,
    xpEarned,
    tierUp,
    newTier,
    newRewards,
  };
}
