import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { userActiveCosmetics } from "@typeoff/db";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

// GET — public: a user's active cosmetics
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const { userId } = await params;

  const db = getDb();
  const [active] = await db
    .select()
    .from(userActiveCosmetics)
    .where(eq(userActiveCosmetics.userId, userId))
    .limit(1);

  return NextResponse.json({
    active: active ?? {
      activeBadge: null,
      activeTitle: null,
      activeNameColor: null,
      activeNameEffect: null,
    },
  });
}
