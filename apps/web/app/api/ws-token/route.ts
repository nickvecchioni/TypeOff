import { NextResponse } from "next/server";
import { SignJWT } from "jose";
import { eq } from "drizzle-orm";
import { users, userActiveCosmetics } from "@typeoff/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const { auth } = await import("@/lib/auth");
  const { getDb } = await import("@/lib/db");
  const secret = new TextEncoder().encode(process.env.AUTH_SECRET);
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();

  // Read ELO + active cosmetics from users table
  const [row] = await db
    .select({
      eloRating: users.eloRating,
      username: users.username,
      activeBadge: userActiveCosmetics.activeBadge,
      activeNameColor: userActiveCosmetics.activeNameColor,
      activeNameEffect: userActiveCosmetics.activeNameEffect,
    })
    .from(users)
    .leftJoin(userActiveCosmetics, eq(users.id, userActiveCosmetics.userId))
    .where(eq(users.id, session.user.id))
    .limit(1);

  const token = await new SignJWT({
    sub: session.user.id,
    name: row?.username ?? "Anonymous",
    elo: row?.eloRating ?? 1000,
    username: row?.username ?? null,
    activeBadge: row?.activeBadge ?? null,
    activeNameColor: row?.activeNameColor ?? null,
    activeNameEffect: row?.activeNameEffect ?? null,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("30m")
    .sign(secret);

  return NextResponse.json({ token });
}
