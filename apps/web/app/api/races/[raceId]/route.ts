import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { races, raceParticipants, users } from "@typeoff/db";
import { eq, desc } from "drizzle-orm";

// GET — race replay data (Pro: unlimited, Free: last 3 own races)
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ raceId: string }> },
) {
  const { raceId } = await params;
  const session = await auth();
  const db = getDb();

  const [race] = await db
    .select()
    .from(races)
    .where(eq(races.id, raceId))
    .limit(1);

  if (!race) {
    return NextResponse.json({ error: "Race not found" }, { status: 404 });
  }

  // Pro gating: free users can only view their most recent 3 race replays
  const isPro = session?.user?.isPro ?? false;
  if (!isPro && session?.user?.id) {
    // Check if this race is in the user's last 3
    const recentRaces = await db
      .select({ raceId: raceParticipants.raceId })
      .from(raceParticipants)
      .where(eq(raceParticipants.userId, session.user.id))
      .orderBy(desc(raceParticipants.finishedAt))
      .limit(3);

    const recentIds = new Set(recentRaces.map((r) => r.raceId));
    if (!recentIds.has(raceId)) {
      return NextResponse.json(
        { error: "Upgrade to Pro to view older replays", requiresPro: true },
        { status: 403 },
      );
    }
  } else if (!isPro && !session?.user?.id) {
    return NextResponse.json(
      { error: "Sign in to view replays" },
      { status: 401 },
    );
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
    participants: participants.map((p) => ({
      id: p.id,
      userId: p.userId,
      name: p.username ?? p.guestName ?? "Unknown",
      placement: p.placement,
      wpm: p.wpm,
      rawWpm: p.rawWpm,
      accuracy: p.accuracy,
      eloBefore: p.eloBefore,
      eloAfter: p.eloAfter,
      wpmHistory: p.wpmHistory ? JSON.parse(p.wpmHistory) : null,
      replayData: p.replayData ? JSON.parse(p.replayData) : null,
      rankTier: p.rankTier,
    })),
  });
}
