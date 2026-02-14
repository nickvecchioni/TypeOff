import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

import { getDb } from "@/lib/db";
import { users } from "@typeoff/db";
import { eq } from "drizzle-orm";

export async function PATCH(request: Request) {
  const { auth } = await import("@/lib/auth");
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const username = (body.username as string)?.trim();

  if (!username || username.length < 3 || username.length > 20) {
    return NextResponse.json(
      { error: "Username must be 3-20 characters" },
      { status: 400 }
    );
  }

  if (!/^[a-z0-9-]+$/.test(username)) {
    return NextResponse.json(
      { error: "Only lowercase letters, numbers, and hyphens allowed" },
      { status: 400 }
    );
  }

  const db = getDb();

  // Check uniqueness
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.username, username))
    .limit(1);

  if (existing.length > 0 && existing[0].id !== session.user.id) {
    return NextResponse.json(
      { error: "Username already taken" },
      { status: 409 }
    );
  }

  try {
    await db
      .update(users)
      .set({ username })
      .where(eq(users.id, session.user.id));
    return NextResponse.json({ username });
  } catch {
    return NextResponse.json(
      { error: "Username already taken" },
      { status: 409 }
    );
  }
}
