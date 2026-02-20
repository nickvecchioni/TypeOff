import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

import { getDb } from "@/lib/db";
import { clans, clanMembers, users, userStats } from "@typeoff/db";
import { eq, and, sql } from "drizzle-orm";

// GET — clan profile
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ clanId: string }> },
) {
  const { clanId } = await params;
  const db = getDb();

  const [clan] = await db
    .select()
    .from(clans)
    .where(eq(clans.id, clanId))
    .limit(1);

  if (!clan) {
    return NextResponse.json({ error: "Clan not found" }, { status: 404 });
  }

  const members = await db
    .select({
      userId: clanMembers.userId,
      role: clanMembers.role,
      joinedAt: clanMembers.joinedAt,
      username: users.username,
      eloRating: users.eloRating,
      rankTier: users.rankTier,
    })
    .from(clanMembers)
    .innerJoin(users, eq(clanMembers.userId, users.id))
    .where(eq(clanMembers.clanId, clanId));

  return NextResponse.json({
    clan: { ...clan, createdAt: clan.createdAt.toISOString() },
    members: members.map((m) => ({
      ...m,
      joinedAt: m.joinedAt.toISOString(),
    })),
  });
}

// PATCH — update clan (leader only)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ clanId: string }> },
) {
  const { auth } = await import("@/lib/auth");
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { clanId } = await params;
  const db = getDb();

  const [clan] = await db
    .select({ leaderId: clans.leaderId })
    .from(clans)
    .where(eq(clans.id, clanId))
    .limit(1);

  if (!clan || clan.leaderId !== session.user.id) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const body = await request.json();
  const updates: Record<string, unknown> = {};
  if (body.name && typeof body.name === "string" && body.name.length >= 3 && body.name.length <= 30) {
    updates.name = body.name;
  }
  if (body.description !== undefined) {
    updates.description = body.description;
  }

  if (Object.keys(updates).length > 0) {
    await db.update(clans).set(updates).where(eq(clans.id, clanId));
  }

  return NextResponse.json({ success: true });
}

// DELETE — disband clan (leader only)
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ clanId: string }> },
) {
  const { auth } = await import("@/lib/auth");
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { clanId } = await params;
  const db = getDb();

  const [clan] = await db
    .select({ leaderId: clans.leaderId })
    .from(clans)
    .where(eq(clans.id, clanId))
    .limit(1);

  if (!clan || clan.leaderId !== session.user.id) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  // Clear clanId for all members
  const members = await db
    .select({ userId: clanMembers.userId })
    .from(clanMembers)
    .where(eq(clanMembers.clanId, clanId));

  const { inArray } = await import("drizzle-orm");
  if (members.length > 0) {
    await db
      .update(users)
      .set({ clanId: null })
      .where(inArray(users.id, members.map((m) => m.userId)));
  }

  // Delete clan (cascades to clanMembers and clanInvites)
  await db.delete(clans).where(eq(clans.id, clanId));

  return NextResponse.json({ success: true });
}
