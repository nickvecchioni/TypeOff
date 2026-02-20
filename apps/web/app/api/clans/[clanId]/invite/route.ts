import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

import { getDb } from "@/lib/db";
import { clans, clanMembers, clanInvites, users, notifications } from "@typeoff/db";
import { eq, and, sql } from "drizzle-orm";
import { calculateClanElo } from "@typeoff/shared";

// POST — send clan invite
export async function POST(
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

  // Verify caller is leader or officer
  const [callerMember] = await db
    .select({ role: clanMembers.role })
    .from(clanMembers)
    .where(and(eq(clanMembers.clanId, clanId), eq(clanMembers.userId, session.user.id)))
    .limit(1);

  if (!callerMember || (callerMember.role !== "leader" && callerMember.role !== "officer")) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  // Target must not be in a clan
  const [targetUser] = await db
    .select({ clanId: users.clanId })
    .from(users)
    .where(eq(users.id, targetUserId))
    .limit(1);

  if (!targetUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  if (targetUser.clanId) {
    return NextResponse.json({ error: "User is already in a clan" }, { status: 409 });
  }

  // Check for existing pending invite
  const existing = await db
    .select({ id: clanInvites.id })
    .from(clanInvites)
    .where(and(
      eq(clanInvites.clanId, clanId),
      eq(clanInvites.userId, targetUserId),
      eq(clanInvites.status, "pending"),
    ))
    .limit(1);

  if (existing.length > 0) {
    return NextResponse.json({ error: "Invite already pending" }, { status: 409 });
  }

  // Create invite
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  const [invite] = await db
    .insert(clanInvites)
    .values({
      clanId,
      userId: targetUserId,
      invitedBy: session.user.id,
      expiresAt,
    })
    .returning();

  // Get clan info for notification
  const [clan] = await db
    .select({ name: clans.name, tag: clans.tag })
    .from(clans)
    .where(eq(clans.id, clanId))
    .limit(1);

  // Create notification
  const senderName = session.user.username ?? session.user.name ?? "Someone";
  await db
    .insert(notifications)
    .values({
      userId: targetUserId,
      type: "clan_invite",
      title: "Clan Invite",
      body: `${senderName} invited you to join [${clan?.tag}] ${clan?.name}`,
      actionUrl: `/clans/${clanId}`,
      metadata: JSON.stringify({ inviteId: invite.id, clanId }),
    })
    .catch(() => {});

  return NextResponse.json({
    invite: {
      id: invite.id,
      clanId: invite.clanId,
      userId: invite.userId,
      status: invite.status,
      expiresAt: invite.expiresAt.toISOString(),
    },
  });
}

// PATCH — respond to invite
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
  const body = await request.json();
  const { inviteId, accept } = body as { inviteId: string; accept: boolean };

  if (!inviteId) {
    return NextResponse.json({ error: "Missing inviteId" }, { status: 400 });
  }

  const db = getDb();

  const [invite] = await db
    .select()
    .from(clanInvites)
    .where(and(
      eq(clanInvites.id, inviteId),
      eq(clanInvites.userId, session.user.id),
      eq(clanInvites.clanId, clanId),
    ))
    .limit(1);

  if (!invite || invite.status !== "pending") {
    return NextResponse.json({ error: "Invite not found or already responded" }, { status: 404 });
  }

  if (new Date() > invite.expiresAt) {
    return NextResponse.json({ error: "Invite has expired" }, { status: 410 });
  }

  if (accept) {
    // Check user is not already in a clan
    const [userRow] = await db
      .select({ clanId: users.clanId })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);
    if (userRow?.clanId) {
      return NextResponse.json({ error: "You are already in a clan" }, { status: 409 });
    }

    await db.update(clanInvites).set({ status: "accepted" }).where(eq(clanInvites.id, inviteId));
    await db.insert(clanMembers).values({ clanId, userId: session.user.id, role: "member" });
    await db.update(users).set({ clanId }).where(eq(users.id, session.user.id));
    await db.update(clans).set({ memberCount: sql`${clans.memberCount} + 1` }).where(eq(clans.id, clanId));

    // Recalculate clan ELO
    const members = await db
      .select({ eloRating: users.eloRating })
      .from(clanMembers)
      .innerJoin(users, eq(clanMembers.userId, users.id))
      .where(eq(clanMembers.clanId, clanId));
    const newClanElo = calculateClanElo(members.map((m) => m.eloRating));
    await db.update(clans).set({ eloRating: newClanElo }).where(eq(clans.id, clanId));
  } else {
    await db.update(clanInvites).set({ status: "declined" }).where(eq(clanInvites.id, inviteId));
  }

  return NextResponse.json({ success: true, accepted: accept });
}
