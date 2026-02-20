export const dynamic = "force-dynamic";

import Link from "next/link";
import { getDb } from "@/lib/db";
import { clans } from "@typeoff/db";
import { desc } from "drizzle-orm";
import { getRankInfo } from "@typeoff/shared";
import { RankBadge } from "@/components/RankBadge";
import { CreateClanButton } from "./create-clan-button";

export default async function ClansPage() {
  const db = getDb();

  const topClans = await db
    .select()
    .from(clans)
    .orderBy(desc(clans.eloRating))
    .limit(50);

  return (
    <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-8">
      <div className="max-w-3xl mx-auto space-y-4 animate-fade-in">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-text">Clans</h1>
          <CreateClanButton />
        </div>

        <div className="rounded-xl bg-surface/40 ring-1 ring-white/[0.04] overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-[2rem_1fr_4rem_3.5rem] sm:grid-cols-[2.5rem_1fr_5rem_4rem_4rem] text-xs text-muted/50 uppercase tracking-wider px-3 sm:px-4 py-2 border-b border-white/[0.06]">
            <span>#</span>
            <span>Clan</span>
            <span className="text-right">ELO</span>
            <span className="text-right hidden sm:block">Rank</span>
            <span className="text-right">Members</span>
          </div>

          {topClans.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-sm text-muted/40">
              No clans yet
            </div>
          ) : (
            topClans.map((clan, i) => {
              const rankInfo = getRankInfo(clan.eloRating);
              return (
                <Link
                  key={clan.id}
                  href={`/clans/${clan.id}`}
                  className="grid grid-cols-[2rem_1fr_4rem_3.5rem] sm:grid-cols-[2.5rem_1fr_5rem_4rem_4rem] items-center px-3 sm:px-4 py-2.5 border-b border-white/[0.03] last:border-0 hover:bg-white/[0.02] transition-colors"
                >
                  <span className="text-sm font-bold text-muted tabular-nums">
                    {i + 1}
                  </span>
                  <span className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                    <span className="text-xs font-bold text-accent/70">[{clan.tag}]</span>
                    <span className="text-sm font-medium text-text truncate">
                      {clan.name}
                    </span>
                  </span>
                  <span className="text-right text-sm tabular-nums text-text font-bold">
                    {clan.eloRating}
                  </span>
                  <span className="text-right hidden sm:block">
                    <RankBadge tier={rankInfo.tier} elo={clan.eloRating} showElo={false} size="xs" />
                  </span>
                  <span className="text-right text-sm tabular-nums text-muted">
                    {clan.memberCount}
                  </span>
                </Link>
              );
            })
          )}
        </div>
      </div>
    </main>
  );
}
