import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

import { getDb } from "@/lib/db";
import { friendships, users } from "@typeoff/db";
import { eq, or, and } from "drizzle-orm";

// GET — list accepted friends
export async function GET() {
  const { auth } = await import("@/lib/auth");
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const rows = await db
    .select()
    .from(friendships)
    .where(
      and(
        or(
          eq(friendships.requesterId, session.user.id),
          eq(friendships.addresseeId, session.user.id),
        ),
        eq(friendships.status, "accepted"),
      ),
    );

  // Resolve friend user info
  const friendIds = rows.map((r) =>
    r.requesterId === session.user!.id ? r.addresseeId : r.requesterId,
  );

  if (friendIds.length === 0) {
    return NextResponse.json({ friends: [] });
  }

  const friendUsers = await db
    .select({ id: users.id, username: users.username, name: users.name })
    .from(users)
    .where(or(...friendIds.map((id) => eq(users.id, id))));

  const friends = friendUsers.map((u) => ({
    userId: u.id,
    username: u.username,
    name: u.name,
  }));

  return NextResponse.json({ friends });
}

// POST — send friend request
export async function POST(request: Request) {
  const { auth } = await import("@/lib/auth");
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const addresseeId = body.addresseeId as string;

  if (!addresseeId || addresseeId === session.user.id) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const db = getDb();

  // Check if friendship already exists
  const existing = await db
    .select()
    .from(friendships)
    .where(
      or(
        and(
          eq(friendships.requesterId, session.user.id),
          eq(friendships.addresseeId, addresseeId),
        ),
        and(
          eq(friendships.requesterId, addresseeId),
          eq(friendships.addresseeId, session.user.id),
        ),
      ),
    )
    .limit(1);

  if (existing.length > 0) {
    return NextResponse.json(
      { error: "Friend request already exists" },
      { status: 409 },
    );
  }

  await db.insert(friendships).values({
    requesterId: session.user.id,
    addresseeId,
    status: "pending",
  });

  return NextResponse.json({ success: true });
}
