import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { users, userSubscription } from "@typeoff/db";
import { desc, isNotNull, eq, inArray } from "drizzle-orm";
import { validateAdmin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await validateAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const rows = await db
    .select({
      id: users.id,
      username: users.username,
      email: users.email,
      eloRating: users.eloRating,
      rankTier: users.rankTier,
      placementsCompleted: users.placementsCompleted,
      subStatus: userSubscription.status,
    })
    .from(users)
    .leftJoin(userSubscription, eq(users.id, userSubscription.userId))
    .where(isNotNull(users.email))
    .orderBy(desc(users.eloRating));

  const result = rows.map((r) => ({
    ...r,
    isPro: r.subStatus === "active" || r.subStatus === "lifetime" || r.subStatus === "past_due",
  }));

  return NextResponse.json(result);
}

// POST — one-time migration: convert all active/past_due subscribers to lifetime
export async function POST() {
  if (!(await validateAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const result = await db
    .update(userSubscription)
    .set({ status: "lifetime", updatedAt: new Date() })
    .where(inArray(userSubscription.status, ["active", "past_due"]));

  return NextResponse.json({ ok: true, message: "All active subscribers converted to lifetime Pro" });
}

export async function PATCH(req: NextRequest) {
  if (!(await validateAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId, isPro } = await req.json();
  if (!userId || typeof isPro !== "boolean") {
    return NextResponse.json({ error: "Missing userId or isPro" }, { status: 400 });
  }

  const db = getDb();

  if (isPro) {
    // Upsert a subscription row with status "lifetime"
    await db
      .insert(userSubscription)
      .values({
        userId,
        stripeCustomerId: "admin_grant",
        stripeSubscriptionId: null,
        status: "lifetime",
        currentPeriodEnd: null,
      })
      .onConflictDoUpdate({
        target: userSubscription.userId,
        set: { status: "lifetime", updatedAt: new Date() },
      });
  } else {
    // Set status to inactive
    await db
      .update(userSubscription)
      .set({ status: "inactive", updatedAt: new Date() })
      .where(eq(userSubscription.userId, userId));
  }

  return NextResponse.json({ ok: true });
}
