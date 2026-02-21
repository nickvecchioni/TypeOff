import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

import { getDb } from "@/lib/db";
import { notifications } from "@typeoff/db";
import { eq, and, desc, lt, sql } from "drizzle-orm";

// GET — list notifications with cursor pagination
export async function GET(request: Request) {
  const { auth } = await import("@/lib/auth");
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const limit = Math.min(50, parseInt(url.searchParams.get("limit") ?? "20", 10));
  const cursor = url.searchParams.get("cursor");
  const unreadOnly = url.searchParams.get("unreadOnly") === "true";

  const db = getDb();
  const conditions = [eq(notifications.userId, session.user.id)];
  if (unreadOnly) conditions.push(eq(notifications.read, false));
  if (cursor) conditions.push(lt(notifications.createdAt, new Date(cursor)));

  const rows = await db
    .select()
    .from(notifications)
    .where(and(...conditions))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);

  return NextResponse.json({
    notifications: rows.map((r) => ({
      id: r.id,
      type: r.type,
      title: r.title,
      body: r.body,
      metadata: r.metadata,
      actionUrl: r.actionUrl,
      read: r.read,
      createdAt: r.createdAt.toISOString(),
    })),
    nextCursor: rows.length === limit ? rows[rows.length - 1].createdAt.toISOString() : null,
  });
}

// PATCH — mark notifications as read
export async function PATCH(request: Request) {
  const { auth } = await import("@/lib/auth");
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const db = getDb();

  if (body.all === true) {
    await db
      .update(notifications)
      .set({ read: true })
      .where(and(eq(notifications.userId, session.user.id), eq(notifications.read, false)));
  } else if (Array.isArray(body.ids) && body.ids.length > 0) {
    const { inArray } = await import("drizzle-orm");
    await db
      .update(notifications)
      .set({ read: true })
      .where(and(eq(notifications.userId, session.user.id), inArray(notifications.id, body.ids)));
  } else {
    return NextResponse.json({ error: "Provide ids or all: true" }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}

// DELETE — remove notifications
export async function DELETE(request: Request) {
  const { auth } = await import("@/lib/auth");
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const all = url.searchParams.get("all") === "true";
  const ids = url.searchParams.get("ids")?.split(",").filter(Boolean) ?? [];

  const db = getDb();

  if (all) {
    await db
      .delete(notifications)
      .where(eq(notifications.userId, session.user.id));
  } else if (ids.length > 0) {
    const { inArray } = await import("drizzle-orm");
    await db
      .delete(notifications)
      .where(and(eq(notifications.userId, session.user.id), inArray(notifications.id, ids)));
  } else {
    return NextResponse.json({ error: "Provide ids or all=true" }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
