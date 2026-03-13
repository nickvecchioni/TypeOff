import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { races, raceParticipants, users } from "@typeoff/db";
import { eq } from "drizzle-orm";

// GET — race replay data
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ raceId: string }> },
) {
  const { raceId } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Sign in to view replays" }, { status: 401 });
  }
  const db = getDb();

  const [race] = await db
    .select()
    .from(races)
    .where(eq(races.id, raceId))
    .limit(1);

  if (!race) {
    return NextResponse.json({ error: "Race not found" }, { status: 404 });
  }

  const participants = await db
    .select({
      id: raceParticipants.id,
      userId: raceParticipants.userId,
      guestName: raceParticipants.guestName,
      placement: raceParticipants.placement,
      wpm: raceParticipants.wpm,
      rawWpm: raceParticipants.rawWpm,
      accuracy: raceParticipants.accuracy,
      eloBefore: raceParticipants.eloBefore,
      eloAfter: raceParticipants.eloAfter,
      wpmHistory: raceParticipants.wpmHistory,
      replayData: raceParticipants.replayData,
      username: users.username,
      rankTier: users.rankTier,
    })
    .from(raceParticipants)
    .leftJoin(users, eq(raceParticipants.userId, users.id))
    .where(eq(raceParticipants.raceId, raceId));

  return NextResponse.json({
    race: {
      id: race.id,
      seed: race.seed,
      wordCount: race.wordCount,
      wordPool: race.wordPool,
      playerCount: race.playerCount,
      startedAt: race.startedAt.toISOString(),
      finishedAt: race.finishedAt?.toISOString() ?? null,
    },
    participants: participants.map((p) => {
      let wpmHistory = null;
      let replayData = null;
      try { if (p.wpmHistory) wpmHistory = JSON.parse(p.wpmHistory); } catch { /* malformed data */ }
      try { if (p.replayData) replayData = JSON.parse(p.replayData); } catch { /* malformed data */ }
      return {
        id: p.id,
        userId: p.userId,
        name: p.username ?? p.guestName ?? "Unknown",
        placement: p.placement,
        wpm: p.wpm,
        rawWpm: p.rawWpm,
        accuracy: p.accuracy,
        eloBefore: p.eloBefore,
        eloAfter: p.eloAfter,
        wpmHistory,
        replayData,
        rankTier: p.rankTier,
      };
    }),
  });
}
