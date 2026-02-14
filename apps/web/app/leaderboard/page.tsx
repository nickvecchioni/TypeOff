export const dynamic = "force-dynamic";

import Link from "next/link";
import { getDb } from "@/lib/db";
import { users, userStats } from "@typeoff/db";
import { desc, isNotNull, sql } from "drizzle-orm";
import type { RankTier } from "@typeoff/shared";
import { RankBadge } from "@/components/RankBadge";

export default async function LeaderboardPage() {
  const db = getDb();
  const { auth } = await import("@/lib/auth");
  const session = await auth();

  const rows = await db
    .select({
      id: users.id,
      username: users.username,
      name: users.name,
      image: users.image,
      eloRating: users.eloRating,
      rankTier: users.rankTier,
      racesPlayed: userStats.racesPlayed,
      avgWpm: userStats.avgWpm,
    })
    .from(users)
    .leftJoin(userStats, sql`${users.id} = ${userStats.userId}`)
    .where(isNotNull(users.username))
    .orderBy(desc(users.eloRating))
    .limit(100);

  const PODIUM_COLORS = ["text-rank-gold", "text-rank-silver", "text-rank-bronze"];

  return (
    <main className="flex-1 overflow-y-auto px-6 py-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-accent mb-6">Leaderboard</h1>

        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-muted border-b border-surface">
              <th className="pb-2 w-12">#</th>
              <th className="pb-2">Player</th>
              <th className="pb-2 text-right">ELO</th>
              <th className="pb-2 text-right">Rank</th>
              <th className="pb-2 text-right">Races</th>
              <th className="pb-2 text-right">Avg WPM</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const rank = i + 1;
              const isMe = session?.user?.id === row.id;
              const podiumColor = rank <= 3 ? PODIUM_COLORS[rank - 1] : "";

              return (
                <tr
                  key={row.id}
                  className={`border-b border-surface/50 ${
                    isMe ? "bg-accent/5 text-accent" : "text-text"
                  }`}
                >
                  <td className={`py-2 font-bold ${podiumColor}`}>{rank}</td>
                  <td className="py-2">
                    <Link
                      href={`/profile/${row.username}`}
                      className="flex items-center gap-2 hover:text-accent transition-colors"
                    >
                      {row.image && (
                        <img
                          src={row.image}
                          alt=""
                          className="w-6 h-6 rounded-full"
                        />
                      )}
                      <span>{row.username}</span>
                    </Link>
                  </td>
                  <td className="py-2 text-right tabular-nums font-bold">
                    {row.eloRating}
                  </td>
                  <td className="py-2 text-right">
                    <RankBadge tier={row.rankTier as RankTier} />
                  </td>
                  <td className="py-2 text-right tabular-nums text-muted">
                    {row.racesPlayed ?? 0}
                  </td>
                  <td className="py-2 text-right tabular-nums text-muted">
                    {row.avgWpm != null ? Math.round(row.avgWpm) : 0}
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-muted">
                  No players yet. Be the first!
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
