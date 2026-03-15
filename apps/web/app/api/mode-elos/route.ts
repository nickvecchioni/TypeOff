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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = getDb();
    const rows = await db
      .select({
        modeCategory: userModeStats.modeCategory,
        eloRating: userModeStats.eloRating,
      })
      .from(userModeStats)
      .where(eq(userModeStats.userId, session.user.id));

    const modeElos: Record<string, number> = {};
    for (const row of rows) {
      modeElos[row.modeCategory] = row.eloRating;
    }

    return NextResponse.json({ modeElos });
  } catch (err) {
    console.error("[mode-elos] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
