export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { userBlocks } from "@typeoff/db";
import { eq, and } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getDb();
  const rows = await db
    .select({ blockedId: userBlocks.blockedId })
    .from(userBlocks)
    .where(eq(userBlocks.blockerId, session.user.id));

  return NextResponse.json({ blockedIds: rows.map((r) => r.blockedId) });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { blockedId } = await request.json();
  if (!blockedId || blockedId === session.user.id) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const db = getDb();
  await db
    .insert(userBlocks)
    .values({ blockerId: session.user.id, blockedId })
    .onConflictDoNothing();

  return NextResponse.json({ success: true });
}

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { blockedId } = await request.json();
  if (!blockedId) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const db = getDb();
  await db
    .delete(userBlocks)
    .where(and(eq(userBlocks.blockerId, session.user.id), eq(userBlocks.blockedId, blockedId)));

  return NextResponse.json({ success: true });
}
