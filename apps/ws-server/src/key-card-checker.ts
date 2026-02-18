import { type Database, userKeyCard, userCosmetics, userStats } from "@typeoff/db";
import { eq, and } from "drizzle-orm";
import { sql } from "drizzle-orm";
import {
  getCurrentSeason,
  getSeasonTier,
  calculateRaceSeasonXp,
  getNewRewardsAtTier,
  type KeyCardProgress,
  type KeyCardReward,
} from "@typeoff/shared";

export interface KeyCardContext {
  userId: string;
  raceWpm: number;
  raceAccuracy: number;
  placement: number;
  playerCount: number;
}

export async function checkKeyCard(
  ctx: KeyCardContext,
  db: Database,
): Promise<KeyCardProgress | null> {
  const season = getCurrentSeason();
  if (!season) return null;

  const xpEarned = calculateRaceSeasonXp({
    wpm: ctx.raceWpm,
    accuracy: ctx.raceAccuracy,
    placement: ctx.placement,
    playerCount: ctx.playerCount,
  });

  // Load or create user key card row
  const existing = await db
    .select()
    .from(userKeyCard)
    .where(
      and(
        eq(userKeyCard.userId, ctx.userId),
        eq(userKeyCard.seasonId, season.id),
      ),
    );

  const prevXp = existing.length > 0 ? existing[0].seasonalXp : 0;
  const prevTier = existing.length > 0 ? existing[0].currentTier : 0;
  const isPremium = existing.length > 0 ? existing[0].isPremium : false;

  const newXp = prevXp + xpEarned;
  const newTier = Math.min(getSeasonTier(newXp, season.xpPerTier), season.maxTier);
  const tierUp = newTier > prevTier;

  // Upsert key card progress
  if (existing.length === 0) {
    await db.insert(userKeyCard).values({
      userId: ctx.userId,
      seasonId: season.id,
      seasonalXp: newXp,
      currentTier: newTier,
      isPremium: false,
    });
  } else {
    await db
      .update(userKeyCard)
      .set({
        seasonalXp: newXp,
        currentTier: newTier,
      })
      .where(
        and(
          eq(userKeyCard.userId, ctx.userId),
          eq(userKeyCard.seasonId, season.id),
        ),
      );
  }

  // If tier increased, unlock new rewards
  const newRewards: KeyCardReward[] = [];
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
