export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { userKeyAccuracy } from "@typeoff/db";
import { eq, gte, and } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ weakKeys: [], all: [] });
  }

  try {
    const db = getDb();

    const rows = await db
      .select()
      .from(userKeyAccuracy)
      .where(
        and(
          eq(userKeyAccuracy.userId, session.user.id),
          gte(userKeyAccuracy.totalCount, 10)
        )
      );

    const keysWithAccuracy = rows.map(r => ({
      key: r.key,
      accuracy: r.totalCount > 0 ? r.correctCount / r.totalCount : 1,
      total: r.totalCount,
    }));

    keysWithAccuracy.sort((a, b) => a.accuracy - b.accuracy);

    // Bottom 8 keys as weak keys for targeted practice
    const weakKeys = keysWithAccuracy.slice(0, 8).map(k => k.key);

    return NextResponse.json({ weakKeys, all: keysWithAccuracy });
  } catch (err) {
    console.error("[key-accuracy] GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
