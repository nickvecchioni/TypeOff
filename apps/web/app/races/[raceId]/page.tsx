import { notFound } from "next/navigation";
import Link from "next/link";
import { getDb } from "@/lib/db";
import { races, raceParticipants, users } from "@typeoff/db";
import { eq } from "drizzle-orm";
import { ReplayClient } from "@/components/replay/ReplayClient";

export const dynamic = "force-dynamic";

export default async function ReplayPage({
  params,
}: {
  params: Promise<{ raceId: string }>;
}) {
  const { raceId } = await params;
  const db = getDb();

  const [race] = await db
    .select()
    .from(races)
    .where(eq(races.id, raceId))
    .limit(1);

  if (!race) notFound();

  const participantRows = await db
    .select({
      id: raceParticipants.id,
      userId: raceParticipants.userId,
      guestName: raceParticipants.guestName,
      placement: raceParticipants.placement,
      wpm: raceParticipants.wpm,
      rawWpm: raceParticipants.rawWpm,
      accuracy: raceParticipants.accuracy,
      wpmHistory: raceParticipants.wpmHistory,
      replayData: raceParticipants.replayData,
      username: users.username,
      rankTier: users.rankTier,
    })
    .from(raceParticipants)
    .leftJoin(users, eq(raceParticipants.userId, users.id))
    .where(eq(raceParticipants.raceId, raceId));

  const participants = participantRows.map((p) => ({
    id: p.id,
    name: p.username ?? p.guestName ?? "Unknown",
    placement: p.placement ?? 0,
    wpm: p.wpm ?? 0,
    rawWpm: p.rawWpm ?? 0,
    accuracy: p.accuracy ?? 0,
    rankTier: p.rankTier ?? null,
    wpmHistory: p.wpmHistory ? JSON.parse(p.wpmHistory) : null,
    replayData: p.replayData ? JSON.parse(p.replayData) : null,
  }));

  const hasReplayData = participants.some((p) => p.replayData != null);

  return (
    <main className="flex flex-col items-center px-4 py-8 sm:py-12 min-h-[60vh]">
      {hasReplayData ? (
        <ReplayClient
          race={{
            id: race.id,
            seed: race.seed,
            wordCount: race.wordCount,
            wordPool: race.wordPool,
          }}
          participants={participants}
        />
      ) : (
        <div className="flex flex-col items-center gap-4 text-center max-w-md">
          <h1 className="text-lg font-bold text-text">No Replay Available</h1>
          <p className="text-sm text-muted">
            This race was played before replay recording was enabled.
          </p>
          <Link
            href="/"
            className="text-sm text-accent hover:text-accent/80 transition-colors"
          >
            Back to home
          </Link>
        </div>
      )}
    </main>
  );
}
