import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

import { getDb } from "@/lib/db";
import { userAchievements } from "@typeoff/db";
import { eq } from "drizzle-orm";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const { userId } = await params;

  try {
    const db = getDb();
    const rows = await db
      .select({
        achievementId: userAchievements.achievementId,
        unlockedAt: userAchievements.unlockedAt,
      })
      .from(userAchievements)
      .where(eq(userAchievements.userId, userId));

    const achievements = rows.map((r) => ({
      id: r.achievementId,
      unlockedAt: r.unlockedAt.toISOString(),
    }));

    return NextResponse.json({ achievements });
  } catch (err) {
    console.error("[achievements] GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
