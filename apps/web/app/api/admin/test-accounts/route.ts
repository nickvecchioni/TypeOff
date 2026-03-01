import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { users } from "@typeoff/db";
import { eq, isNull } from "drizzle-orm";
import { validateAdmin } from "@/lib/admin-auth";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function POST(req: NextRequest) {
  if (!(await validateAdmin())) return unauthorized();

  const body = await req.json();
  const id = crypto.randomUUID();
  const username =
    body.username?.trim() ||
    `test-${Math.random().toString(36).slice(2, 6)}`;

  const db = getDb();
  await db.insert(users).values({ id, username });

  return NextResponse.json({ id, username });
}

export async function GET() {
  if (!(await validateAdmin())) return unauthorized();

  const db = getDb();
  const rows = await db
    .select({
      id: users.id,
      username: users.username,
      eloRating: users.eloRating,
      rankTier: users.rankTier,
    })
    .from(users)
    .where(isNull(users.email));

  return NextResponse.json(rows);
}

export async function DELETE(req: NextRequest) {
  if (!(await validateAdmin())) return unauthorized();

  const body = await req.json();
  const db = getDb();

  if (body.username) {
    const deleted = await db
      .delete(users)
      .where(eq(users.username, body.username))
      .returning({ id: users.id });
    if (deleted.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, deletedId: deleted[0].id });
  }

  await db.delete(users).where(eq(users.id, body.id));
  return NextResponse.json({ success: true });
}
