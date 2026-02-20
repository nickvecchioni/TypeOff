import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { userStats, users, userActiveCosmetics } from "@typeoff/db";
import { eq, desc, gt, inArray, isNotNull } from "drizzle-orm";

export const dynamic = "force-dynamic";

// GET — global PP leaderboard
export async function GET() {
  const db = getDb();

  const rows = await db
    .select({
      userId: users.id,
      username: users.username,
      totalPp: userStats.totalPp,
      avgWpm: userStats.avgWpm,
      maxWpm: userStats.maxWpm,
      racesPlayed: userStats.racesPlayed,
    })
    .from(userStats)
    .innerJoin(users, eq(userStats.userId, users.id))
    .where(gt(userStats.totalPp, 0))
    .orderBy(desc(userStats.totalPp))
    .limit(100);

  // Load cosmetics
  const playerIds = rows.map((r) => r.userId);
  const cosmeticRows = playerIds.length > 0
    ? await db
        .select({
          userId: userActiveCosmetics.userId,
          activeBadge: userActiveCosmetics.activeBadge,
          activeNameColor: userActiveCosmetics.activeNameColor,
          activeNameEffect: userActiveCosmetics.activeNameEffect,
        })
        .from(userActiveCosmetics)
        .where(inArray(userActiveCosmetics.userId, playerIds))
    : [];
  const cosmeticMap = new Map(cosmeticRows.map((r) => [r.userId, r]));

  const entries = rows.map((r) => {
    const cosmetic = cosmeticMap.get(r.userId);
    return {
      ...r,
      totalPp: Math.round((r.totalPp ?? 0) * 100) / 100,
      activeBadge: cosmetic?.activeBadge ?? null,
      activeNameColor: cosmetic?.activeNameColor ?? null,
      activeNameEffect: cosmetic?.activeNameEffect ?? null,
    };
  });

  return NextResponse.json({ entries });
}
