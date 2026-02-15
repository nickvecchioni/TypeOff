import type { Socket } from "socket.io";
import type { ClientToServerEvents, ServerToClientEvents } from "@typeoff/shared";
import { ACHIEVEMENTS, ACHIEVEMENT_MAP, getRankTier } from "@typeoff/shared";
import { createDb, userAchievements, userStats, users } from "@typeoff/db";
import { eq, and } from "drizzle-orm";

type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

interface RaceData {
  userId: string;
  placement: number;
  wpm: number;
  accuracy: number;
  newElo: number;
  currentStreak: number;
  racesPlayed: number;
  racesWon: number;
}

export async function checkAchievements(
  raceData: RaceData,
  socket: TypedSocket | null
) {
  try {
    const db = createDb(process.env.DATABASE_URL!);

    // Load existing achievements
    const existing = await db
      .select({ achievementId: userAchievements.achievementId })
      .from(userAchievements)
      .where(eq(userAchievements.userId, raceData.userId));

    const existingSet = new Set(existing.map((e) => e.achievementId));
    const newlyUnlocked: string[] = [];

    function check(id: string, condition: boolean) {
      if (!existingSet.has(id) && condition) {
        newlyUnlocked.push(id);
      }
    }

    // Milestone checks
    check("first-win", raceData.racesWon >= 1);
    check("marathon-100", raceData.racesPlayed >= 100);
    check("veteran-500", raceData.racesPlayed >= 500);

    // Streak checks
    check("streak-5", raceData.currentStreak >= 5);
    check("streak-10", raceData.currentStreak >= 10);

    // Rank checks
    const tier = getRankTier(raceData.newElo);
    const tierOrder = ["bronze", "silver", "gold", "platinum", "diamond", "master", "grandmaster"];
    const tierIndex = tierOrder.indexOf(tier);
    check("hit-silver", tierIndex >= 1);
    check("hit-gold", tierIndex >= 2);
    check("hit-platinum", tierIndex >= 3);
    check("hit-diamond", tierIndex >= 4);
    check("hit-master", tierIndex >= 5);
    check("hit-grandmaster", tierIndex >= 6);

    // Performance checks
    check("speed-demon", raceData.wpm >= 100);
    check("perfectionist", raceData.accuracy >= 100);

    // Insert new achievements and emit toasts
    for (const id of newlyUnlocked) {
      const def = ACHIEVEMENT_MAP.get(id);
      if (!def) continue;

      await db.insert(userAchievements).values({
        userId: raceData.userId,
        achievementId: id,
      });

      socket?.emit("achievementUnlocked", {
        achievementId: id,
        title: def.title,
        icon: def.icon,
      });
    }
  } catch (err) {
    console.error("[achievement-checker] error:", err);
  }
}
