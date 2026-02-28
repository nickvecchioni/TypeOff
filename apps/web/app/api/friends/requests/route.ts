import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

import { getDb } from "@/lib/db";
import { friendships, users } from "@typeoff/db";
import { eq, and } from "drizzle-orm";

// GET — list incoming pending requests
export async function GET() {
  const { auth } = await import("@/lib/auth");
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = getDb();
    const rows = await db
      .select({
        id: friendships.id,
        requesterId: friendships.requesterId,
        createdAt: friendships.createdAt,
        requesterUsername: users.username,
      })
      .from(friendships)
      .innerJoin(users, eq(friendships.requesterId, users.id))
      .where(
        and(
          eq(friendships.addresseeId, session.user.id),
          eq(friendships.status, "pending"),
        ),
      );

    return NextResponse.json({
      requests: rows.map((r) => ({
        id: r.id,
        requesterId: r.requesterId,
        username: r.requesterUsername,
        createdAt: r.createdAt,
      })),
    });
  } catch (err) {
    console.error("[friends/requests] GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST — accept or decline a request
export async function POST(request: Request) {
  const { auth } = await import("@/lib/auth");
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { friendshipId, action } = body as {
      friendshipId: string;
      action: "accept" | "decline";
    };

    if (!friendshipId || !["accept", "decline"].includes(action)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const db = getDb();

    // Verify the friendship is addressed to this user
    const [row] = await db
      .select()
      .from(friendships)
      .where(
        and(
          eq(friendships.id, friendshipId),
          eq(friendships.addresseeId, session.user.id),
          eq(friendships.status, "pending"),
        ),
      )
      .limit(1);

    if (!row) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    await db
      .update(friendships)
      .set({
        status: action === "accept" ? "accepted" : "declined",
        updatedAt: new Date(),
      })
      .where(eq(friendships.id, friendshipId));

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[friends/requests] POST error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
