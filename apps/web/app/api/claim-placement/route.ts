import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { users, userStats } from "@typeoff/db";
import { eq } from "drizzle-orm";
import { calibrateElo } from "@typeoff/shared";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const { auth } = await import("@/lib/auth");
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const wpm = body.wpm as number;

  if (typeof wpm !== "number" || wpm < 1 || wpm > 300) {
    return NextResponse.json({ error: "Invalid WPM" }, { status: 400 });
  }

  const db = getDb();

  // Check that placements haven't already been completed
  const [user] = await db
    .select({ placementsCompleted: users.placementsCompleted })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  if (!user || user.placementsCompleted) {
    return NextResponse.json(
      { error: "Placements already completed" },
      { status: 409 }
    );
  }

  // Recalculate ELO server-side (don't trust client)
  const { elo, tier } = calibrateElo(wpm);

  // Update user with placement results
  await db
    .update(users)
    .set({
      eloRating: elo,
      rankTier: tier,
      peakEloRating: elo,
      peakRankTier: tier,
      placementsCompleted: true,
    })
    .where(eq(users.id, session.user.id));

  // Upsert userStats with initial values
  const [existing] = await db
    .select({ userId: userStats.userId })
    .from(userStats)
    .where(eq(userStats.userId, session.user.id))
    .limit(1);

  if (!existing) {
    await db.insert(userStats).values({
      userId: session.user.id,
      racesPlayed: 0,
      racesWon: 0,
      avgWpm: 0,
      maxWpm: 0,
      avgAccuracy: 0,
      currentStreak: 0,
      maxStreak: 0,
      rankedDayStreak: 0,
      maxRankedDayStreak: 0,
      totalXp: 0,
      updatedAt: new Date(),
    });
  }

  return NextResponse.json({ elo, rankTier: tier });
}
