import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { userPreferences } from "@typeoff/db";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

// GET — user's theme preferences
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = getDb();
    const [row] = await db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, session.user.id));

    return NextResponse.json({
      typingThemeOverride: row?.typingThemeOverride ?? null,
      customThemeJson: row?.customThemeJson ?? null,
    });
  } catch (err) {
    console.error("[preferences] GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT — update theme preferences
export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { typingThemeOverride, customThemeJson } = body;

    const db = getDb();
    const [existing] = await db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, session.user.id));

    if (existing) {
      await db
        .update(userPreferences)
        .set({
          typingThemeOverride: typingThemeOverride ?? null,
          customThemeJson: customThemeJson ?? null,
          updatedAt: new Date(),
        })
        .where(eq(userPreferences.userId, session.user.id));
    } else {
      await db.insert(userPreferences).values({
        userId: session.user.id,
        typingThemeOverride: typingThemeOverride ?? null,
        customThemeJson: customThemeJson ?? null,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[preferences] PUT error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
