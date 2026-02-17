import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { userRatings } from "@typeoff/db";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const { auth } = await import("@/lib/auth");
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json([]);
  }

  const db = getDb();
  const rows = await db
    .select({
      raceType: userRatings.raceType,
      eloRating: userRatings.eloRating,
      rankTier: userRatings.rankTier,
      placementsCompleted: userRatings.placementsCompleted,
      racesPlayed: userRatings.racesPlayed,
    })
    .from(userRatings)
    .where(eq(userRatings.userId, session.user.id));

  return NextResponse.json(rows);
}
