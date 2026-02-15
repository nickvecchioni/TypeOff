import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { users, userStats, seasons, seasonSnapshots } from "@typeoff/db";
import { eq } from "drizzle-orm";
import { getRankTier } from "@typeoff/shared";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function validateSecret(secret: unknown): boolean {
  const expected = process.env.ADMIN_SECRET;
  if (!expected || typeof secret !== "string") return false;
  return secret === expected;
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!validateSecret(body.adminSecret)) return unauthorized();

  const db = getDb();

  // 1. Find active season
  const activeSeasons = await db
    .select()
    .from(seasons)
    .where(eq(seasons.isActive, true))
    .limit(1);

  const activeSeason = activeSeasons[0] ?? null;

  // 2. Close active season
  if (activeSeason) {
    await db
      .update(seasons)
      .set({ endedAt: new Date(), isActive: false })
      .where(eq(seasons.id, activeSeason.id));
  }

  // 3. Snapshot all users
  const allUsers = await db
    .select({
      id: users.id,
      eloRating: users.eloRating,
      rankTier: users.rankTier,
      peakEloRating: users.peakEloRating,
      peakRankTier: users.peakRankTier,
    })
    .from(users);

  const allStats = await db.select().from(userStats);
  const statsMap = new Map(allStats.map((s) => [s.userId, s]));

  if (activeSeason) {
    for (const user of allUsers) {
      const stats = statsMap.get(user.id);
      await db.insert(seasonSnapshots).values({
        userId: user.id,
        seasonId: activeSeason.id,
        finalElo: user.eloRating,
        finalRankTier: user.rankTier,
        peakElo: user.peakEloRating,
        peakRankTier: user.peakRankTier,
        racesPlayed: stats?.racesPlayed ?? 0,
        racesWon: stats?.racesWon ?? 0,
      });
    }
  }

  // 4. Soft-reset ELOs: newElo = round(1000 + (elo - 1000) * 0.5)
  for (const user of allUsers) {
    const newElo = Math.round(1000 + (user.eloRating - 1000) * 0.5);
    const newTier = getRankTier(newElo);
    await db
      .update(users)
      .set({
        eloRating: newElo,
        rankTier: newTier,
        peakEloRating: newElo,
        peakRankTier: newTier,
      })
      .where(eq(users.id, user.id));
  }

  // 5. Reset userStats counters
  for (const stats of allStats) {
    await db
      .update(userStats)
      .set({
        racesPlayed: 0,
        racesWon: 0,
        avgWpm: 0,
        maxWpm: 0,
        avgAccuracy: 0,
        currentStreak: 0,
        maxStreak: 0,
        updatedAt: new Date(),
      })
      .where(eq(userStats.userId, stats.userId));
  }

  // 6. Create new season
  const nextNumber = activeSeason ? activeSeason.number + 1 : 1;
  const newSeason = await db
    .insert(seasons)
    .values({
      number: nextNumber,
      name: body.name ?? `Season ${nextNumber}`,
      startedAt: new Date(),
      isActive: true,
    })
    .returning();

  return NextResponse.json({
    success: true,
    previousSeason: activeSeason?.number ?? null,
    newSeason: newSeason[0],
    usersReset: allUsers.length,
  });
}
