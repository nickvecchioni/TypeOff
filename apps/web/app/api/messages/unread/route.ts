import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

import { getDb } from "@/lib/db";
import { directMessages } from "@typeoff/db";
import { eq, and, isNull, sql } from "drizzle-orm";

// GET — unread message counts per friend
export async function GET() {
  const { auth } = await import("@/lib/auth");
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();

  const rows = await db
    .select({
      senderId: directMessages.senderId,
      count: sql<number>`count(*)::int`,
    })
    .from(directMessages)
    .where(
      and(
        eq(directMessages.recipientId, session.user.id),
        isNull(directMessages.readAt),
      ),
    )
    .groupBy(directMessages.senderId);

  const counts: Record<string, number> = {};
  for (const row of rows) {
    counts[row.senderId] = row.count;
  }

  return NextResponse.json({ counts });
}
