import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { userAchievements } from "@typeoff/db";
import { eq } from "drizzle-orm";
import { ACHIEVEMENTS } from "@typeoff/shared";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  const db = getDb();

  const unlocked = await db
    .select({
      achievementId: userAchievements.achievementId,
      unlockedAt: userAchievements.unlockedAt,
    })
    .from(userAchievements)
    .where(eq(userAchievements.userId, userId));

  const unlockedMap = new Map(
    unlocked.map((u) => [u.achievementId, u.unlockedAt])
  );

  const result = ACHIEVEMENTS.map((def) => ({
    ...def,
    unlocked: unlockedMap.has(def.id),
    unlockedAt: unlockedMap.get(def.id) ?? null,
  }));

  return NextResponse.json(result);
}
