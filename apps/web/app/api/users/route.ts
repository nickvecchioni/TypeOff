import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

import { getDb } from "@/lib/db";
import { users } from "@typeoff/db";
import { eq } from "drizzle-orm";

// GET ?username=foo — lookup user by username
export async function GET(request: Request) {
  const { auth } = await import("@/lib/auth");
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const username = url.searchParams.get("username");
  if (!username) {
    return NextResponse.json({ error: "Missing username" }, { status: 400 });
  }

  try {
    const db = getDb();
    const [user] = await db
      .select({ id: users.id, username: users.username })
      .from(users)
      .where(eq(users.username, username))
      .limit(1);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (err) {
    console.error("[users] GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
