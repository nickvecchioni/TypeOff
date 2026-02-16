import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { users } from "@typeoff/db";
import { desc, isNotNull } from "drizzle-orm";

export const dynamic = "force-dynamic";

function validateSecret(secret: unknown): boolean {
  const expected = process.env.ADMIN_SECRET;
  if (!expected || typeof secret !== "string") return false;
  return secret === expected;
}

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("adminSecret");
  if (!validateSecret(secret)) {
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
