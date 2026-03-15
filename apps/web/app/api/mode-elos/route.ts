import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { userModeStats } from "@typeoff/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { auth } = await import("@/lib/auth");
    const { getDb } = await import("@/lib/db");
    const session = await auth();

    if (!session?.user?.id) {
      // Guest: return empty (no persisted data)
      return NextResponse.json({ modeElos: {}, modeRacesPlayed: {} });
    }

    const db = getDb();
    const rows = await db
      .select({
        modeCategory: userModeStats.modeCategory,
        eloRating: userModeStats.eloRating,
        racesPlayed: userModeStats.racesPlayed,
      })
      .from(userModeStats)
      .where(eq(userModeStats.userId, session.user.id));

    const modeElos: Record<string, number> = {};
    const modeRacesPlayed: Record<string, number> = {};
    for (const row of rows) {
      modeElos[row.modeCategory] = row.eloRating;
      modeRacesPlayed[row.modeCategory] = row.racesPlayed;
    }

    return NextResponse.json({ modeElos, modeRacesPlayed });
  } catch (err) {
    console.error("[mode-elos] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
