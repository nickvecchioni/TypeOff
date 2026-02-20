import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

import { getDb } from "@/lib/db";
import { clans, clanMembers, users } from "@typeoff/db";
import { eq, desc, like, or, lt, sql } from "drizzle-orm";

// GET — list/search clans
export async function GET(request: Request) {
  const url = new URL(request.url);
  const search = url.searchParams.get("search");
  const limit = Math.min(50, parseInt(url.searchParams.get("limit") ?? "20", 10));
  const cursor = url.searchParams.get("cursor");

  const db = getDb();
  const conditions = [];
  if (search) {
    conditions.push(or(
      like(clans.name, `%${search}%`),
      like(clans.tag, `%${search}%`),
    ));
  }
  if (cursor) {
    conditions.push(lt(clans.eloRating, parseInt(cursor, 10)));
  }

  const rows = await db
    .select({
      id: clans.id,
      name: clans.name,
      tag: clans.tag,
      description: clans.description,
      eloRating: clans.eloRating,
      memberCount: clans.memberCount,
      createdAt: clans.createdAt,
    })
    .from(clans)
    .where(conditions.length > 0 ? sql`${conditions.reduce((a, b) => sql`${a} AND ${b}`)}` : undefined)
    .orderBy(desc(clans.eloRating))
    .limit(limit);

  return NextResponse.json({
    clans: rows.map((r) => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
    })),
    nextCursor: rows.length === limit ? rows[rows.length - 1].eloRating : null,
  });
}

// POST — create clan
export async function POST(request: Request) {
  const { auth } = await import("@/lib/auth");
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { name, tag, description } = body as { name?: string; tag?: string; description?: string };

  // Validate name
  if (!name || name.length < 3 || name.length > 30) {
    return NextResponse.json({ error: "Name must be 3-30 characters" }, { status: 400 });
  }

  // Validate tag
  if (!tag || !/^[A-Z0-9]{2,5}$/.test(tag)) {
    return NextResponse.json({ error: "Tag must be 2-5 uppercase alphanumeric characters" }, { status: 400 });
  }

  const db = getDb();

  // Check user not already in a clan
  const [userRow] = await db
    .select({ clanId: users.clanId })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);
  if (userRow?.clanId) {
    return NextResponse.json({ error: "You are already in a clan" }, { status: 409 });
  }

  // Check uniqueness
  const { and } = await import("drizzle-orm");
  const existing = await db
    .select({ id: clans.id })
    .from(clans)
    .where(or(eq(clans.name, name), eq(clans.tag, tag)))
    .limit(1);
  if (existing.length > 0) {
    return NextResponse.json({ error: "Name or tag already taken" }, { status: 409 });
  }

  // Get user's ELO for initial clan ELO
  const [eloRow] = await db
    .select({ eloRating: users.eloRating })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  const [clan] = await db
    .insert(clans)
    .values({
      name,
      tag,
      description: description ?? null,
      leaderId: session.user.id,
      eloRating: eloRow?.eloRating ?? 1000,
      memberCount: 1,
    })
    .returning();

  // Create member entry
  await db.insert(clanMembers).values({
    clanId: clan.id,
    userId: session.user.id,
    role: "leader",
  });

  // Update user's clanId
  await db.update(users).set({ clanId: clan.id }).where(eq(users.id, session.user.id));

  return NextResponse.json({ clan: { ...clan, createdAt: clan.createdAt.toISOString() } });
}
