import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { userCosmetics, userActiveCosmetics } from "@typeoff/db";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

// GET — user's unlocked cosmetics + active selections
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();

  const unlocked = await db
    .select({
      cosmeticId: userCosmetics.cosmeticId,
      seasonId: userCosmetics.seasonId,
      unlockedAt: userCosmetics.unlockedAt,
    })
    .from(userCosmetics)
    .where(eq(userCosmetics.userId, session.user.id));

  const [active] = await db
    .select()
    .from(userActiveCosmetics)
    .where(eq(userActiveCosmetics.userId, session.user.id))
    .limit(1);

  return NextResponse.json({
    unlocked,
    active: active ?? {
      activeBadge: null,
      activeTitle: null,
      activeNameColor: null,
      activeNameEffect: null,
    },
  });
}

// PUT — set active cosmetics
export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { activeBadge, activeTitle, activeNameColor, activeNameEffect } = body;

  const db = getDb();

  // Verify ownership of selected cosmetics
  if (activeBadge || activeTitle || activeNameColor || activeNameEffect) {
    const owned = await db
      .select({ cosmeticId: userCosmetics.cosmeticId })
      .from(userCosmetics)
      .where(eq(userCosmetics.userId, session.user.id));
    const ownedSet = new Set(owned.map((r) => r.cosmeticId));

    for (const id of [activeBadge, activeTitle, activeNameColor, activeNameEffect]) {
      if (id && !ownedSet.has(id)) {
        return NextResponse.json(
          { error: `Cosmetic not owned: ${id}` },
          { status: 403 },
        );
      }
    }
  }

  await db
    .insert(userActiveCosmetics)
    .values({
      userId: session.user.id,
      activeBadge: activeBadge ?? null,
      activeTitle: activeTitle ?? null,
      activeNameColor: activeNameColor ?? null,
      activeNameEffect: activeNameEffect ?? null,
    })
    .onConflictDoUpdate({
      target: userActiveCosmetics.userId,
      set: {
        activeBadge: activeBadge ?? null,
        activeTitle: activeTitle ?? null,
        activeNameColor: activeNameColor ?? null,
        activeNameEffect: activeNameEffect ?? null,
      },
    });

  return NextResponse.json({ success: true });
}
