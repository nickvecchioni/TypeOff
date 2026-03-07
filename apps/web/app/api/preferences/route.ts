import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { userPreferences } from "@typeoff/db";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

// GET — user's preferences (theme + settings)
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const [row] = await db
    .select()
    .from(userPreferences)
    .where(eq(userPreferences.userId, session.user.id));

  return NextResponse.json({
    typingThemeOverride: row?.typingThemeOverride ?? null,
    customThemeJson: row?.customThemeJson ?? null,
    settings: row?.settingsJson ? JSON.parse(row.settingsJson) : null,
  });
}

// PUT — update preferences
export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { typingThemeOverride, customThemeJson, settings } = body;

  const db = getDb();
  const [existing] = await db
    .select()
    .from(userPreferences)
    .where(eq(userPreferences.userId, session.user.id));

  const settingsJson = settings !== undefined ? JSON.stringify(settings) : undefined;

  if (existing) {
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (typingThemeOverride !== undefined) updates.typingThemeOverride = typingThemeOverride ?? null;
    if (customThemeJson !== undefined) updates.customThemeJson = customThemeJson ?? null;
    if (settingsJson !== undefined) updates.settingsJson = settingsJson;

    await db
      .update(userPreferences)
      .set(updates)
      .where(eq(userPreferences.userId, session.user.id));
  } else {
    await db.insert(userPreferences).values({
      userId: session.user.id,
      typingThemeOverride: typingThemeOverride ?? null,
      customThemeJson: customThemeJson ?? null,
      settingsJson: settingsJson ?? null,
    });
  }

  return NextResponse.json({ ok: true });
}
