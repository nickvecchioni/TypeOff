import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { users } from "@typeoff/db";
import { desc, isNotNull } from "drizzle-orm";
import { validateAdmin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await validateAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const rows = await db
    .select({
      id: users.id,
      username: users.username,
      email: users.email,
      eloRating: users.eloRating,
      rankTier: users.rankTier,
      placementsCompleted: users.placementsCompleted,
    })
    .from(users)
    .where(isNotNull(users.email))
    .orderBy(desc(users.eloRating));

  return NextResponse.json(rows);
}
