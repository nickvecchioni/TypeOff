import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { textLeaderboards, users } from "@typeoff/db";
import { eq, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

// GET — returns top entries for a specific text (seed + mode)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const seed = searchParams.get("seed");
  const mode = searchParams.get("mode");
  const limit = Math.min(Number(searchParams.get("limit") ?? 20), 100);

  if (!seed || !mode) {
    return NextResponse.json({ error: "seed and mode required" }, { status: 400 });
  }

  const textHash = `${seed}:${mode}`;
  const db = getDb();

  const rows = await db
    .select({
      userId: textLeaderboards.userId,
      username: users.username,
      bestWpm: textLeaderboards.bestWpm,
      bestAccuracy: textLeaderboards.bestAccuracy,
      pp: textLeaderboards.pp,
      updatedAt: textLeaderboards.updatedAt,
    })
    .from(textLeaderboards)
    .innerJoin(users, eq(textLeaderboards.userId, users.id))
    .where(eq(textLeaderboards.textHash, textHash))
    .orderBy(desc(textLeaderboards.bestWpm))
    .limit(limit);

  return NextResponse.json({ entries: rows });
}
