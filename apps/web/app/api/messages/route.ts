import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

import { getDb } from "@/lib/db";
import { directMessages, friendships, userBlocks } from "@typeoff/db";
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

  // Verify friendship
  const friendship = await db
    .select({ id: friendships.id })
    .from(friendships)
    .where(
      and(
        or(
          and(eq(friendships.requesterId, userId), eq(friendships.addresseeId, friendId)),
          and(eq(friendships.requesterId, friendId), eq(friendships.addresseeId, userId)),
        ),
        eq(friendships.status, "accepted"),
      ),
    )
    .limit(1);

  if (friendship.length === 0) {
    return NextResponse.json({ error: "Not friends" }, { status: 403 });
  }

  // Check if blocked in either direction
  const blocked = await db
    .select({ blockerId: userBlocks.blockerId })
    .from(userBlocks)
    .where(
      or(
        and(eq(userBlocks.blockerId, userId), eq(userBlocks.blockedId, friendId)),
        and(eq(userBlocks.blockerId, friendId), eq(userBlocks.blockedId, userId)),
      ),
    )
    .limit(1);

  if (blocked.length > 0) {
    return NextResponse.json({ error: "Blocked" }, { status: 403 });
  }

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
