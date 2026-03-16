import { NextResponse } from "next/server";
import { SignJWT } from "jose";
import { eq, desc } from "drizzle-orm";
import { users, userActiveCosmetics, userModeStats, userStats, soloResults } from "@typeoff/db";
import { createRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const getLimit = createRateLimit({ windowMs: 10_000, max: 10 });

export async function GET() {
  try {
    const { auth } = await import("@/lib/auth");
    const { getDb } = await import("@/lib/db");
    const secret = new TextEncoder().encode(process.env.AUTH_SECRET);
    const session = await auth();

    // Guest token — unauthenticated users can still race (no persistence)
    if (!session?.user?.id) {
      const guestId = `guest_${crypto.randomUUID()}`;
      const token = await new SignJWT({
        sub: guestId,
        name: "Guest",
        isGuest: true,
        elo: 1000,
        modeElos: {},
        modeRacesPlayed: {},
      })
        .setProtectedHeader({ alg: "HS256" })
        .setExpirationTime("30m")
        .sign(secret);

      return NextResponse.json({ token });
    }

    const { limited, retryAfter } = getLimit.check(session.user.id);
    if (limited) {
      return NextResponse.json({ error: "Too many requests", retryAfter }, { status: 429 });
    }

    const db = getDb();

    // Read display ELO + active cosmetics + per-mode ELOs + per-mode races played + avgWpm
    const [[row], modeRows, [statsRow]] = await Promise.all([
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
          racesPlayed: userModeStats.racesPlayed,
        })
        .from(userModeStats)
        .where(eq(userModeStats.userId, session.user.id)),
      db
        .select({ avgWpm: userStats.avgWpm })
        .from(userStats)
        .where(eq(userStats.userId, session.user.id))
        .limit(1),
    ]);

    // Derive avgWpm for bot calibration during placements
    let avgWpm = statsRow?.avgWpm ?? 0;
    if (avgWpm === 0) {
      const soloRows = await db
        .select({ wpm: soloResults.wpm })
        .from(soloResults)
        .where(eq(soloResults.userId, session.user.id))
        .orderBy(desc(soloResults.createdAt))
        .limit(10);
      if (soloRows.length > 0) {
        avgWpm = soloRows.reduce((sum, r) => sum + r.wpm, 0) / soloRows.length;
      }
    }

    // Build per-mode ELO and racesPlayed maps
    const displayElo = row?.eloRating ?? 1000;
    const modeElos: Record<string, number> = {};
    const modeRacesPlayed: Record<string, number> = {};
    for (const m of modeRows) {
      modeElos[m.modeCategory] = m.eloRating;
      modeRacesPlayed[m.modeCategory] = m.racesPlayed;
    }

    const token = await new SignJWT({
      sub: session.user.id,
      name: row?.username ?? "Anonymous",
      elo: displayElo,
      modeElos,
      modeRacesPlayed,
      avgWpm,
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
