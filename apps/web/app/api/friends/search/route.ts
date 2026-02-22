import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

import { getDb } from "@/lib/db";
import { users } from "@typeoff/db";
import { ilike, and, ne } from "drizzle-orm";

// GET ?q=username — search users by username prefix
export async function GET(request: Request) {
  const { auth } = await import("@/lib/auth");
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim();

  if (!q || q.length < 2) {
    return NextResponse.json({ users: [] });
  }

  const db = getDb();
  const results = await db
    .select({ id: users.id, username: users.username })
    .from(users)
    .where(
      and(
        ilike(users.username, `${q}%`),
        ne(users.id, session.user.id),
      ),
    )
    .limit(10);

  return NextResponse.json({
    users: results.map((u) => ({
      userId: u.id,
      username: u.username,
    })),
  });
}
