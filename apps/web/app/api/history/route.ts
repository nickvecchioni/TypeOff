import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { raceParticipants, races, userSubscription } from "@typeoff/db";
import { eq, desc, lt, and, gte, lte, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;
const FREE_LIMIT = 10;

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();

  // Check Pro status
  const [subRow] = await db
    .select({ status: userSubscription.status })
    .from(userSubscription)
    .where(eq(userSubscription.userId, session.user.id))
    .limit(1);
  const isPro = subRow?.status === "active" || subRow?.status === "lifetime";

  const params = req.nextUrl.searchParams;
  const cursor = params.get("cursor"); // ISO date string
  const sort = params.get("sort") ?? "date";
  const minWpm = isPro && params.get("minWpm") ? Number(params.get("minWpm")) : undefined;
  const dateFrom = isPro ? params.get("dateFrom") : null;
  const dateTo = isPro ? params.get("dateTo") : null;
  const isExport = isPro && params.get("export") === "true";

  const limit = isExport ? undefined : isPro ? PAGE_SIZE : FREE_LIMIT;

  // Build conditions
  const conditions = [eq(raceParticipants.userId, session.user.id)];

  if (cursor && !isExport) {
    conditions.push(lt(raceParticipants.finishedAt, new Date(cursor)));
  }
  if (minWpm != null && !isNaN(minWpm)) {
    conditions.push(gte(raceParticipants.wpm, minWpm));
  }
  if (dateFrom) {
    conditions.push(gte(raceParticipants.finishedAt, new Date(dateFrom)));
  }
  if (dateTo) {
    conditions.push(lte(raceParticipants.finishedAt, new Date(dateTo)));
  }

  // Determine sort order
  const orderBy =
    sort === "wpm"
      ? desc(raceParticipants.wpm)
      : sort === "accuracy"
        ? desc(raceParticipants.accuracy)
        : sort === "elo"
          ? desc(sql`${raceParticipants.eloAfter} - ${raceParticipants.eloBefore}`)
          : desc(raceParticipants.finishedAt);

  const query = db
    .select({
      raceId: raceParticipants.raceId,
      placement: raceParticipants.placement,
      wpm: raceParticipants.wpm,
      rawWpm: raceParticipants.rawWpm,
      accuracy: raceParticipants.accuracy,
      eloBefore: raceParticipants.eloBefore,
      eloAfter: raceParticipants.eloAfter,
      finishedAt: raceParticipants.finishedAt,
      playerCount: races.playerCount,
      mode: races.wordPool,
      seed: races.seed,
    })
    .from(raceParticipants)
    .innerJoin(races, eq(raceParticipants.raceId, races.id))
    .where(and(...conditions))
    .orderBy(orderBy);

  const rows = limit != null
    ? await query.limit(limit + 1)
    : await query;

  const hasMore = limit != null && rows.length > limit;
  const raceRows = limit != null ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore && raceRows.length > 0
    ? raceRows[raceRows.length - 1].finishedAt?.toISOString()
    : undefined;

  // Get total count
  const [countRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(raceParticipants)
    .where(eq(raceParticipants.userId, session.user.id));

  return NextResponse.json({
    races: raceRows.map((r) => ({
      raceId: r.raceId,
      placement: r.placement,
      wpm: r.wpm,
      rawWpm: r.rawWpm,
      accuracy: r.accuracy,
      eloChange: r.eloBefore != null && r.eloAfter != null ? r.eloAfter - r.eloBefore : null,
      finishedAt: r.finishedAt?.toISOString() ?? null,
      playerCount: r.playerCount,
      mode: r.mode,
      seed: r.seed,
      date: r.finishedAt?.toISOString() ?? null,
    })),
    nextCursor,
    total: countRow?.count ?? 0,
    isPro,
  });
}
