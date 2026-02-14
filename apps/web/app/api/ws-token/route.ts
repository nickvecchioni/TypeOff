import { NextResponse } from "next/server";
import { SignJWT } from "jose";
import { eq } from "drizzle-orm";
import { users } from "@typeoff/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const { auth } = await import("@/lib/auth");
  const { getDb } = await import("@/lib/db");
  const secret = new TextEncoder().encode(process.env.AUTH_SECRET);
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Always read current ELO from DB (session JWT may be stale)
  const db = getDb();
  const [row] = await db
    .select({ eloRating: users.eloRating, username: users.username })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  const token = await new SignJWT({
    sub: session.user.id,
    name: row?.username ?? "Anonymous",
    elo: row?.eloRating ?? 1000,
    username: row?.username ?? null,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("5m")
    .sign(secret);

  return NextResponse.json({ token });
}
