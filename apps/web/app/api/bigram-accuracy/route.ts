import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { userBigramAccuracy } from "@typeoff/db";
import { eq, asc, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

// GET — returns worst bigrams sorted by accuracy (ascending)
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = getDb();
    const rows = await db
      .select({
        bigram: userBigramAccuracy.bigram,
        correctCount: userBigramAccuracy.correctCount,
        totalCount: userBigramAccuracy.totalCount,
      })
      .from(userBigramAccuracy)
      .where(eq(userBigramAccuracy.userId, session.user.id))
      .orderBy(asc(sql`CASE WHEN ${userBigramAccuracy.totalCount} = 0 THEN 1.0 ELSE CAST(${userBigramAccuracy.correctCount} AS REAL) / ${userBigramAccuracy.totalCount} END`))
      .limit(100);

    const bigrams = rows.map((r) => ({
      bigram: r.bigram,
      correct: r.correctCount,
      total: r.totalCount,
      accuracy: r.totalCount > 0 ? Math.round((r.correctCount / r.totalCount) * 100 * 10) / 10 : 100,
    }));

    return NextResponse.json({ bigrams });
  } catch (err) {
    console.error("[bigram-accuracy] GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
