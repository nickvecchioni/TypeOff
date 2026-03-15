import { NextResponse } from "next/server";
import { SignJWT } from "jose";
import { eq } from "drizzle-orm";
import { users, userActiveCosmetics, userModeStats } from "@typeoff/db";
import { createRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const getLimit = createRateLimit({ windowMs: 10_000, max: 10 });

export async function GET() {
  try {
    const { auth } = await import("@/lib/auth");
    const { getDb } = await import("@/lib/db");
    const secret = new TextEncoder().encode(process.env.AUTH_SECRET);
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { limited, retryAfter } = getLimit.check(session.user.id);
    if (limited) {
      return NextResponse.json({ error: "Too many requests", retryAfter }, { status: 429 });
    }

    const db = getDb();

    // Read display ELO + active cosmetics + per-mode ELOs
    const [[row], modeRows] = await Promise.all([
      db
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
        .limit(1),
      db
        .select({
          modeCategory: userModeStats.modeCategory,
          eloRating: userModeStats.eloRating,
        })
        .from(userModeStats)
        .where(eq(userModeStats.userId, session.user.id)),
    ]);

    // Build per-mode ELO map, defaulting to display ELO for modes without stats
    const displayElo = row?.eloRating ?? 1000;
    const modeElos: Record<string, number> = {};
    for (const m of modeRows) {
      modeElos[m.modeCategory] = m.eloRating;
    }

    const token = await new SignJWT({
      sub: session.user.id,
      name: row?.username ?? "Anonymous",
      elo: displayElo,
      modeElos,
      username: row?.username ?? null,
      isPro: session.user.isPro ?? false,
      activeBadge: row?.activeBadge ?? null,
      activeNameColor: row?.activeNameColor ?? null,
      activeNameEffect: row?.activeNameEffect ?? null,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("30m")
      .sign(secret);

    return NextResponse.json({ token });
  } catch (err) {
    console.error("[ws-token] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
