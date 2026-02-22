import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

import { getDb } from "@/lib/db";
import { directMessages } from "@typeoff/db";
import { eq, or, and, desc, lt } from "drizzle-orm";

// GET — message history with cursor pagination
export async function GET(request: Request) {
  const { auth } = await import("@/lib/auth");
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const friendId = searchParams.get("friendId");
  const cursor = searchParams.get("cursor");
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10), 100);

  if (!friendId) {
    return NextResponse.json({ error: "Missing friendId" }, { status: 400 });
  }

  const db = getDb();
  const userId = session.user.id;

  const conditions = and(
    or(
      and(
        eq(directMessages.senderId, userId),
        eq(directMessages.receiverId, friendId),
      ),
      and(
        eq(directMessages.senderId, friendId),
        eq(directMessages.receiverId, userId),
      ),
    ),
    cursor ? lt(directMessages.createdAt, new Date(cursor)) : undefined,
  );

  const rows = await db
    .select()
    .from(directMessages)
    .where(conditions)
    .orderBy(desc(directMessages.createdAt))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const messages = rows.slice(0, limit).map((m) => ({
    id: m.id,
    senderId: m.senderId,
    recipientId: m.receiverId,
    content: m.content,
    createdAt: m.createdAt.toISOString(),
    readAt: null,
  }));

  return NextResponse.json({
    messages,
    nextCursor: hasMore ? messages[messages.length - 1].createdAt : null,
  });
}
