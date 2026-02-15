import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { seasons } from "@typeoff/db";
import { desc } from "drizzle-orm";

export async function GET() {
  const db = getDb();
  const rows = await db
    .select()
    .from(seasons)
    .orderBy(desc(seasons.number));

  return NextResponse.json(rows);
}
