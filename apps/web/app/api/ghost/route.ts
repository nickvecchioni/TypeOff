import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { raceParticipants, races, soloResults, users } from "@typeoff/db";
import { eq, and, desc, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

// GET — returns replay data for ghost racing
// ?raceId=X — specific race replay
// ?userId=X&seed=Y&mode=Z — PB replay for a text
// ?userId=X — user's latest race with replay data
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const raceId = searchParams.get("raceId");
  const userId = searchParams.get("userId");
  const seed = searchParams.get("seed");
  const mode = searchParams.get("mode");

  const db = getDb();

  // Case 1: Specific race replay
  if (raceId) {
    const [participant] = await db
      .select({
        userId: raceParticipants.userId,
        replayData: raceParticipants.replayData,
        wpm: raceParticipants.wpm,
        accuracy: raceParticipants.accuracy,
      })
      .from(raceParticipants)
      .where(
        and(
          eq(raceParticipants.raceId, raceId),
          sql`${raceParticipants.replayData} IS NOT NULL`,
        ),
      )
      .orderBy(desc(raceParticipants.wpm))
      .limit(1);

    if (!participant) {
      return NextResponse.json({ error: "No replay data found" }, { status: 404 });
    }

    const [race] = await db
      .select({ seed: races.seed, mode: races.wordPool, wordCount: races.wordCount })
      .from(races)
      .where(eq(races.id, raceId))
      .limit(1);

    const [user] = participant.userId
      ? await db.select({ username: users.username }).from(users).where(eq(users.id, participant.userId)).limit(1)
      : [null];

    return NextResponse.json({
      replayData: JSON.parse(participant.replayData!),
      seed: race?.seed,
      mode: race?.mode,
      wordCount: race?.wordCount,
      wpm: participant.wpm,
      accuracy: participant.accuracy,
      username: user?.username ?? "Unknown",
    });
  }

  // Case 2: PB for a specific text (seed + mode)
  if (userId && seed && mode) {
    const [participant] = await db
      .select({
        replayData: raceParticipants.replayData,
        wpm: raceParticipants.wpm,
        accuracy: raceParticipants.accuracy,
        raceId: raceParticipants.raceId,
      })
      .from(raceParticipants)
      .innerJoin(races, eq(raceParticipants.raceId, races.id))
      .where(
        and(
          eq(raceParticipants.userId, userId),
          eq(races.seed, Number(seed)),
          eq(races.wordPool, mode),
          sql`${raceParticipants.replayData} IS NOT NULL`,
        ),
      )
      .orderBy(desc(raceParticipants.wpm))
      .limit(1);

    if (!participant) {
      return NextResponse.json({ error: "No PB replay found" }, { status: 404 });
    }

    const [user] = await db
      .select({ username: users.username })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    return NextResponse.json({
      replayData: JSON.parse(participant.replayData!),
      seed: Number(seed),
      mode,
      wpm: participant.wpm,
      accuracy: participant.accuracy,
      username: user?.username ?? "Unknown",
    });
  }

  // Case 3: User's best solo result with replay data
  if (userId) {
    const [result] = await db
      .select({
        replayData: soloResults.replayData,
        wpm: soloResults.wpm,
        accuracy: soloResults.accuracy,
        seed: soloResults.seed,
        mode: soloResults.mode,
      })
      .from(soloResults)
      .where(
        and(
          eq(soloResults.userId, userId),
          sql`${soloResults.replayData} IS NOT NULL`,
        ),
      )
      .orderBy(desc(soloResults.wpm))
      .limit(1);

    if (!result) {
      return NextResponse.json({ error: "No replay data found" }, { status: 404 });
    }

    const [user] = await db
      .select({ username: users.username })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    return NextResponse.json({
      replayData: JSON.parse(result.replayData!),
      seed: result.seed,
      mode: result.mode,
      wpm: result.wpm,
      accuracy: result.accuracy,
      username: user?.username ?? "Unknown",
    });
  }

  return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
}
