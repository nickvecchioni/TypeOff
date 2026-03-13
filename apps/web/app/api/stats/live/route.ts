import { getDb } from "@/lib/db";
import { races } from "@typeoff/db";
import { sql, gte } from "drizzle-orm";

export async function GET() {
  try {
    const db = getDb();
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const result = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(races)
      .where(gte(races.startedAt, oneWeekAgo));

    return Response.json(
      { racesThisWeek: result[0]?.count ?? 0 },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        },
      }
    );
  } catch {
    return Response.json({ racesThisWeek: 0 });
  }
}
