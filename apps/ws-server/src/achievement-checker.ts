import { type Database, userAchievements, raceParticipants, friendships } from "@typeoff/db";
import { eq, and, gte, or, sql } from "drizzle-orm";
import type { RankTier } from "@typeoff/shared";

export interface AchievementContext {
  userId: string;
  raceWpm: number;
  raceAccuracy: number;
  placement: number;
  racesPlayed: number;
  racesWon: number;
  currentStreak: number;
  maxStreak: number;
  rankTier: RankTier;
}

const RANK_ORDER: RankTier[] = [
  "bronze",
  "silver",
  "gold",
  "platinum",
  "diamond",
  "master",
  "grandmaster",
];

function rankAtLeast(current: RankTier, target: RankTier): boolean {
  return RANK_ORDER.indexOf(current) >= RANK_ORDER.indexOf(target);
}

export async function checkAchievements(
  ctx: AchievementContext,
  db: Database,
): Promise<string[]> {
  // Load existing achievements for this user
  const existing = await db
    .select({ achievementId: userAchievements.achievementId })
    .from(userAchievements)
    .where(eq(userAchievements.userId, ctx.userId));
  const unlocked = new Set(existing.map((r) => r.achievementId));

  // Kick off the two async queries we might need
  const [highAccuracyCount, friendCount] = await Promise.all([
    !unlocked.has("accuracy_95_x10")
      ? db
          .select({ count: sql<number>`count(*)::int` })
          .from(raceParticipants)
          .where(
            and(
              eq(raceParticipants.userId, ctx.userId),
              gte(raceParticipants.accuracy, 95),
            ),
          )
          .then((rows) => rows[0]?.count ?? 0)
      : Promise.resolve(0),
    !unlocked.has("friend_1")
      ? db
          .select({ count: sql<number>`count(*)::int` })
          .from(friendships)
          .where(
            and(
              or(
                eq(friendships.requesterId, ctx.userId),
                eq(friendships.addresseeId, ctx.userId),
              ),
              eq(friendships.status, "accepted"),
            ),
          )
          .then((rows) => rows[0]?.count ?? 0)
      : Promise.resolve(0),
  ]);

  const newAchievements: string[] = [];
  const check = (id: string, condition: boolean) => {
    if (!unlocked.has(id) && condition) newAchievements.push(id);
  };

  // Speed
  check("speed_100", ctx.raceWpm >= 100);
  check("speed_150", ctx.raceWpm >= 150);
  check("speed_200", ctx.raceWpm >= 200);

  // Accuracy
  check("accuracy_perfect", ctx.raceAccuracy >= 100);
  check("accuracy_95_x10", highAccuracyCount >= 10);

  // Volume
  check("races_1", ctx.racesPlayed >= 1);
  check("races_10", ctx.racesPlayed >= 10);
  check("races_50", ctx.racesPlayed >= 50);
  check("races_100", ctx.racesPlayed >= 100);
  check("races_500", ctx.racesPlayed >= 500);

  // Wins
  check("wins_1", ctx.racesWon >= 1);
  check("wins_10", ctx.racesWon >= 10);
  check("wins_50", ctx.racesWon >= 50);

  // Streaks (use max of current and maxStreak for historical)
  const bestStreak = Math.max(ctx.currentStreak, ctx.maxStreak);
  check("streak_3", bestStreak >= 3);
  check("streak_5", bestStreak >= 5);
  check("streak_10", bestStreak >= 10);

  // Rank
  check("rank_silver", rankAtLeast(ctx.rankTier, "silver"));
  check("rank_gold", rankAtLeast(ctx.rankTier, "gold"));
  check("rank_platinum", rankAtLeast(ctx.rankTier, "platinum"));
  check("rank_diamond", rankAtLeast(ctx.rankTier, "diamond"));
  check("rank_master", rankAtLeast(ctx.rankTier, "master"));
  check("rank_grandmaster", rankAtLeast(ctx.rankTier, "grandmaster"));

  // Social
  check("friend_1", friendCount >= 1);

  // Batch insert new achievements
  if (newAchievements.length > 0) {
    await db
      .insert(userAchievements)
      .values(
        newAchievements.map((achievementId) => ({
          userId: ctx.userId,
          achievementId,
        })),
      )
      .onConflictDoNothing();
  }

  return newAchievements;
}
