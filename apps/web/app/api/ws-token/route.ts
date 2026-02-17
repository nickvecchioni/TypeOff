import { NextResponse } from "next/server";
import { SignJWT } from "jose";
import { eq } from "drizzle-orm";
import { users, userRatings } from "@typeoff/db";
import type { RaceType } from "@typeoff/shared";

export const dynamic = "force-dynamic";

export async function GET() {
  const { auth } = await import("@/lib/auth");
  const { getDb } = await import("@/lib/db");
  const secret = new TextEncoder().encode(process.env.AUTH_SECRET);
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();

  // Read current "best" ELO from users table
  const [row] = await db
    .select({ eloRating: users.eloRating, username: users.username })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  // Read per-type ratings
  const ratings = await db
    .select({
      raceType: userRatings.raceType,
      eloRating: userRatings.eloRating,
      placementsCompleted: userRatings.placementsCompleted,
      racesPlayed: userRatings.racesPlayed,
    })
    .from(userRatings)
    .where(eq(userRatings.userId, session.user.id));

  const eloByType: Partial<Record<RaceType, number>> = {};
  const placementsByType: Partial<Record<RaceType, { completed: boolean; played: number }>> = {};
  for (const r of ratings) {
    const rt = r.raceType as RaceType;
    eloByType[rt] = r.eloRating;
    placementsByType[rt] = { completed: r.placementsCompleted, played: r.racesPlayed };
  }

  const token = await new SignJWT({
    sub: session.user.id,
    name: row?.username ?? "Anonymous",
    elo: row?.eloRating ?? 1000,
    username: row?.username ?? null,
    eloByType,
    placementsByType,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("5m")
    .sign(secret);

  return NextResponse.json({ token });
}
