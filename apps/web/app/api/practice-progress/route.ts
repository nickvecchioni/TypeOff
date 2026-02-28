import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { userAccuracySnapshots } from "@typeoff/db";
import { eq, and, gte, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const { auth } = await import("@/lib/auth");
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!session.user.isPro) {
    return NextResponse.json({ error: "Pro required" }, { status: 403 });
  }

  try {
    const db = getDb();
    const userId = session.user.id;

    // Get snapshots from the last 30 days
    const since = new Date();
    since.setDate(since.getDate() - 30);

    const rows = await db
      .select({
        snapshotType: userAccuracySnapshots.snapshotType,
        target: userAccuracySnapshots.target,
        accuracy: userAccuracySnapshots.accuracy,
        totalCount: userAccuracySnapshots.totalCount,
        createdAt: userAccuracySnapshots.createdAt,
      })
      .from(userAccuracySnapshots)
      .where(
        and(
          eq(userAccuracySnapshots.userId, userId),
          gte(userAccuracySnapshots.createdAt, since),
        ),
      )
      .orderBy(desc(userAccuracySnapshots.createdAt))
      .limit(500);

    // Group by target
    const grouped: Record<string, {
      target: string;
      type: string;
      snapshots: Array<{ accuracy: number; totalCount: number; date: string }>;
    }> = {};

    for (const row of rows) {
      const key = `${row.snapshotType}:${row.target}`;
      if (!grouped[key]) {
        grouped[key] = { target: row.target, type: row.snapshotType, snapshots: [] };
      }
      grouped[key].snapshots.push({
        accuracy: row.accuracy,
        totalCount: row.totalCount,
        date: row.createdAt.toISOString(),
      });
    }

    // Reverse snapshots so oldest first (for charting)
    for (const g of Object.values(grouped)) {
      g.snapshots.reverse();
    }

    return NextResponse.json({ progress: Object.values(grouped) });
  } catch (err) {
    console.error("[practice-progress] GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
