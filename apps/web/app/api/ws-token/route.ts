import { NextResponse } from "next/server";
import { SignJWT } from "jose";
import { eq } from "drizzle-orm";
import { users, userActiveCosmetics, clans } from "@typeoff/db";

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

  // Read ELO + active cosmetics + clan from users table
  const [row] = await db
    .select({
      eloRating: users.eloRating,
      username: users.username,
      clanId: users.clanId,
      activeBadge: userActiveCosmetics.activeBadge,
      activeNameColor: userActiveCosmetics.activeNameColor,
      activeNameEffect: userActiveCosmetics.activeNameEffect,
      clanTag: clans.tag,
    })
    .from(users)
    .leftJoin(userActiveCosmetics, eq(users.id, userActiveCosmetics.userId))
    .leftJoin(clans, eq(users.clanId, clans.id))
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
    clanTag: row?.clanTag ?? null,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("5m")
    .sign(secret);

  return NextResponse.json({ token });
}
