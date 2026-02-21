import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

import { getDb } from "@/lib/db";
import { directMessages, friendships, userBlocks, users } from "@typeoff/db";
import { eq, or, and, desc, lt } from "drizzle-orm";

// GET — fetch message history with a specific friend
export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const { auth } = await import("@/lib/auth");
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId: otherId } = await params;
  const myId = session.user.id;

  if (!otherId || otherId === myId) {
    return NextResponse.json({ error: "Invalid userId" }, { status: 400 });
  }

  const db = getDb();

  // Verify friendship
  const friendship = await db
    .select({ id: friendships.id })
    .from(friendships)
    .where(
      and(
        or(
          and(eq(friendships.requesterId, myId), eq(friendships.addresseeId, otherId)),
          and(eq(friendships.requesterId, otherId), eq(friendships.addresseeId, myId)),
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
        and(eq(userBlocks.blockerId, myId), eq(userBlocks.blockedId, otherId)),
        and(eq(userBlocks.blockerId, otherId), eq(userBlocks.blockedId, myId)),
      ),
    )
    .limit(1);

  if (blocked.length > 0) {
    return NextResponse.json({ error: "Blocked" }, { status: 403 });
  }

  // Cursor-based pagination (before= timestamp)
  const url = new URL(request.url);
  const before = url.searchParams.get("before");

  const rows = await db
    .select({
      id: directMessages.id,
      senderId: directMessages.senderId,
      content: directMessages.content,
      createdAt: directMessages.createdAt,
      senderName: users.name,
      senderUsername: users.username,
    })
    .from(directMessages)
    .innerJoin(users, eq(users.id, directMessages.senderId))
    .where(
      and(
        or(
          and(eq(directMessages.senderId, myId), eq(directMessages.receiverId, otherId)),
          and(eq(directMessages.senderId, otherId), eq(directMessages.receiverId, myId)),
        ),
        before ? lt(directMessages.createdAt, new Date(before)) : undefined,
      ),
    )
    .orderBy(desc(directMessages.createdAt))
    .limit(50);

  // Return oldest-first
  const messages = rows.reverse().map((r) => ({
    id: r.id,
    fromUserId: r.senderId,
    fromName: r.senderUsername ?? r.senderName ?? "Unknown",
    message: r.content,
    timestamp: r.createdAt.getTime(),
  }));

  return NextResponse.json({ messages });
}
