import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

import { getDb } from "@/lib/db";
import { clans, clanMembers, users } from "@typeoff/db";
import { eq, and, sql } from "drizzle-orm";
import { calculateClanElo } from "@typeoff/shared";

// GET — list members
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ clanId: string }> },
) {
  const { clanId } = await params;
  const db = getDb();

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
    members: members.map((m) => ({
      ...m,
      joinedAt: m.joinedAt.toISOString(),
    })),
  });
}

// DELETE — kick member or self-leave
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ clanId: string }> },
) {
  const { auth } = await import("@/lib/auth");
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { clanId } = await params;
  const body = await request.json();
  const targetUserId = body.userId as string;

  if (!targetUserId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  }

  const db = getDb();

  // Check clan exists
  const [clan] = await db
    .select({ leaderId: clans.leaderId })
    .from(clans)
    .where(eq(clans.id, clanId))
    .limit(1);
  if (!clan) {
    return NextResponse.json({ error: "Clan not found" }, { status: 404 });
  }

  const isSelf = targetUserId === session.user.id;

  if (!isSelf) {
    // Verify caller is leader or officer
    const [callerMember] = await db
      .select({ role: clanMembers.role })
      .from(clanMembers)
      .where(and(eq(clanMembers.clanId, clanId), eq(clanMembers.userId, session.user.id)))
      .limit(1);
    if (!callerMember || (callerMember.role !== "leader" && callerMember.role !== "officer")) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }
    // Can't kick leader
    if (targetUserId === clan.leaderId) {
      return NextResponse.json({ error: "Cannot kick the clan leader" }, { status: 400 });
    }
  }

  // Leader cannot leave without disbanding
  if (isSelf && session.user.id === clan.leaderId) {
    return NextResponse.json({ error: "Leader must disband the clan instead of leaving" }, { status: 400 });
  }

  // Remove member
  await db
    .delete(clanMembers)
    .where(and(eq(clanMembers.clanId, clanId), eq(clanMembers.userId, targetUserId)));

  // Clear user's clanId
  await db.update(users).set({ clanId: null }).where(eq(users.id, targetUserId));

  // Decrement member count
  await db
    .update(clans)
    .set({ memberCount: sql`greatest(${clans.memberCount} - 1, 1)` })
    .where(eq(clans.id, clanId));

  // Recalculate clan ELO
  const remainingMembers = await db
    .select({ eloRating: users.eloRating })
    .from(clanMembers)
    .innerJoin(users, eq(clanMembers.userId, users.id))
    .where(eq(clanMembers.clanId, clanId));
  const newClanElo = calculateClanElo(remainingMembers.map((m) => m.eloRating));
  await db.update(clans).set({ eloRating: newClanElo }).where(eq(clans.id, clanId));

  return NextResponse.json({ success: true });
}
