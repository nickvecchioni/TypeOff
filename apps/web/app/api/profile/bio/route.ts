import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { users, userSubscription } from "@typeoff/db";
import { eq } from "drizzle-orm";

const MAX_BIO_LENGTH = 160;

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Pro check
  const db = getDb();
  const [sub] = await db
    .select({ status: userSubscription.status })
    .from(userSubscription)
    .where(eq(userSubscription.userId, session.user.id))
    .limit(1);

  if (sub?.status !== "active" && sub?.status !== "lifetime") {
    return NextResponse.json({ error: "Pro required" }, { status: 403 });
  }

  const { bio } = await req.json();

  if (typeof bio !== "string") {
    return NextResponse.json({ error: "Invalid bio" }, { status: 400 });
  }

  const trimmed = bio.trim().slice(0, MAX_BIO_LENGTH);

  await db
    .update(users)
    .set({ bio: trimmed || null })
    .where(eq(users.id, session.user.id));

  return NextResponse.json({ bio: trimmed || null });
}
