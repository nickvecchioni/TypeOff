import { notFound } from "next/navigation";
import Link from "next/link";
import { getDb } from "@/lib/db";
import { races, raceParticipants, users } from "@typeoff/db";
import { eq, desc } from "drizzle-orm";
import { ReplayClient } from "@/components/replay/ReplayClient";

export const dynamic = "force-dynamic";

const FREE_REPLAY_LIMIT = 3;

export default async function ReplayPage({
  params,
}: {
  params: Promise<{ raceId: string }>;
}) {
  const { auth } = await import("@/lib/auth");
  const session = await auth();
  const isPro = session?.user?.isPro ?? false;

  const { raceId } = await params;
  const db = getDb();

  const [race] = await db
    .select()
    .from(races)
    .where(eq(races.id, raceId))
    .limit(1);

  if (!race) notFound();

  // Free users can view replays for their last N races
  let replayLocked = false;
  if (!isPro && session?.user?.id) {
    const recentRaces = await db
      .select({ raceId: raceParticipants.raceId })
      .from(raceParticipants)
      .where(eq(raceParticipants.userId, session.user.id))
      .orderBy(desc(raceParticipants.finishedAt))
      .limit(FREE_REPLAY_LIMIT);
    const recentIds = new Set(recentRaces.map((r) => r.raceId));
    replayLocked = !recentIds.has(raceId);
  } else if (!isPro && !session?.user?.id) {
    replayLocked = true;
  }

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
    <main className="flex-1 flex flex-col items-center px-4 py-8 sm:py-12 min-h-0 overflow-y-auto animate-fade-in">
      {hasReplayData && replayLocked ? (
        <div className="flex flex-col items-center gap-6 text-center max-w-sm py-4">
          <div className="w-14 h-14 rounded-2xl bg-accent/10 ring-1 ring-accent/20 flex items-center justify-center text-2xl">
            ▶
          </div>
          <div>
            <h1 className="text-lg font-bold text-text">Replay is Pro Only</h1>
            <p className="text-sm text-muted/65 mt-2 leading-relaxed">
              Upgrade to TypeOff Pro to watch full race replays with keystroke-by-keystroke playback and WPM graphs.
            </p>
          </div>
          <Link
            href="/pro"
            className="px-5 py-2.5 rounded-xl bg-accent text-white text-sm font-semibold hover:bg-accent/90 transition-colors"
          >
            Upgrade to Pro
          </Link>
          <Link
            href="/"
            className="text-xs text-muted/65 hover:text-muted/65 transition-colors"
          >
            Back to home
          </Link>
        </div>
      ) : hasReplayData ? (
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
