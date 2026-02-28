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

  try {
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
        activeCursorStyle: null,
        activeProfileBorder: null,
        activeTypingTheme: null,
      },
    });
  } catch (err) {
    console.error("[cosmetics] GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT — set active cosmetics
export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      activeBadge,
      activeTitle,
      activeNameColor,
      activeNameEffect,
      activeCursorStyle,
      activeProfileBorder,
      activeTypingTheme,
    } = body;

    const db = getDb();

    // Verify ownership of selected cosmetics
    const cosmeticIds = [
      activeBadge,
      activeTitle,
      activeNameColor,
      activeNameEffect,
      activeCursorStyle,
      activeProfileBorder,
      activeTypingTheme,
    ].filter(Boolean);

    if (cosmeticIds.length > 0) {
      const owned = await db
        .select({ cosmeticId: userCosmetics.cosmeticId })
        .from(userCosmetics)
        .where(eq(userCosmetics.userId, session.user.id));
      const ownedSet = new Set(owned.map((r) => r.cosmeticId));

      for (const id of cosmeticIds) {
        if (!ownedSet.has(id)) {
          return NextResponse.json(
            { error: "Cosmetic not owned" },
            { status: 403 },
          );
        }
      }
    }

    const values = {
      userId: session.user.id,
      activeBadge: activeBadge ?? null,
      activeTitle: activeTitle ?? null,
      activeNameColor: activeNameColor ?? null,
      activeNameEffect: activeNameEffect ?? null,
      activeCursorStyle: activeCursorStyle ?? null,
      activeProfileBorder: activeProfileBorder ?? null,
      activeTypingTheme: activeTypingTheme ?? null,
    };

    await db
      .insert(userActiveCosmetics)
      .values(values)
      .onConflictDoUpdate({
        target: userActiveCosmetics.userId,
        set: {
          activeBadge: values.activeBadge,
          activeTitle: values.activeTitle,
          activeNameColor: values.activeNameColor,
          activeNameEffect: values.activeNameEffect,
          activeCursorStyle: values.activeCursorStyle,
          activeProfileBorder: values.activeProfileBorder,
          activeTypingTheme: values.activeTypingTheme,
        },
      });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[cosmetics] PUT error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
