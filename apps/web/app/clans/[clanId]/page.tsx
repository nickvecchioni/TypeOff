export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Link from "next/link";
import { getDb } from "@/lib/db";
import { clans, clanMembers, users, clanInvites } from "@typeoff/db";
import { eq, and } from "drizzle-orm";
import { getRankInfo } from "@typeoff/shared";
import { RankBadge } from "@/components/RankBadge";
import { ClanActions } from "./clan-actions";

export default async function ClanProfilePage({
  params,
}: {
  params: Promise<{ clanId: string }>;
}) {
  const { clanId } = await params;
  const db = getDb();

  const [clan] = await db
    .select()
    .from(clans)
    .where(eq(clans.id, clanId))
    .limit(1);

  if (!clan) return notFound();

  const members = await db
    .select({
      userId: clanMembers.userId,
      role: clanMembers.role,
      joinedAt: clanMembers.joinedAt,
      username: users.username,
      eloRating: users.eloRating,
      rankTier: users.rankTier,
    })
    .from(clanMembers)
    .innerJoin(users, eq(clanMembers.userId, users.id))
    .where(eq(clanMembers.clanId, clanId));

  // Check viewer
  const { auth } = await import("@/lib/auth");
  const session = await auth();
  const viewerId = session?.user?.id ?? null;
  const viewerMember = members.find((m) => m.userId === viewerId);
  const isLeaderOrOfficer = viewerMember?.role === "leader" || viewerMember?.role === "officer";

  // Check if viewer has a pending invite
  let pendingInvite = null;
  if (viewerId && !viewerMember) {
    const [invite] = await db
      .select({ id: clanInvites.id })
      .from(clanInvites)
      .where(and(
        eq(clanInvites.clanId, clanId),
        eq(clanInvites.userId, viewerId),
        eq(clanInvites.status, "pending"),
      ))
      .limit(1);
    pendingInvite = invite ?? null;
  }

  const clanRankInfo = getRankInfo(clan.eloRating);

  const ROLE_BADGES: Record<string, string> = {
    leader: "text-amber-400",
    officer: "text-sky-400",
    member: "text-muted/60",
  };

  return (
    <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-8">
      <div className="max-w-3xl mx-auto space-y-4 animate-fade-in">
        {/* Header */}
        <div className="rounded-xl bg-surface/50 ring-1 ring-white/[0.04] px-5 py-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-accent/70">[{clan.tag}]</span>
                <h1 className="text-xl font-bold text-text">{clan.name}</h1>
              </div>
              {clan.description && (
                <p className="text-sm text-muted/60 mt-1">{clan.description}</p>
              )}
            </div>
            <div className="flex items-center gap-4">
              <div className="text-center">
                <div className="text-2xl font-black text-text tabular-nums">{clan.eloRating}</div>
                <div className="text-[10px] text-muted/60 mt-0.5">ELO</div>
              </div>
              <RankBadge tier={clanRankInfo.tier} elo={clan.eloRating} />
            </div>
          </div>
          <div className="flex items-center gap-4 mt-3 text-xs text-muted/50">
            <span>{clan.memberCount} member{clan.memberCount !== 1 ? "s" : ""}</span>
            <span>Created {clan.createdAt.toLocaleDateString()}</span>
          </div>
        </div>

        {/* Actions (client component) */}
        <ClanActions
          clanId={clanId}
          isLeaderOrOfficer={isLeaderOrOfficer}
          isMember={!!viewerMember}
          isLeader={viewerMember?.role === "leader"}
          viewerHasClan={!!session?.user?.clanId}
          pendingInviteId={pendingInvite?.id ?? null}
        />

        {/* Members */}
        <div className="rounded-xl bg-surface/40 ring-1 ring-white/[0.04] overflow-hidden">
          <div className="grid grid-cols-[1fr_5rem_4rem_5rem] text-xs text-muted/50 uppercase tracking-wider px-4 py-2 border-b border-white/[0.06]">
            <span>Member</span>
            <span className="text-right">ELO</span>
            <span className="text-right">Rank</span>
            <span className="text-right">Role</span>
          </div>
          {members
            .sort((a, b) => {
              const roleOrder = { leader: 0, officer: 1, member: 2 };
              const ra = roleOrder[a.role as keyof typeof roleOrder] ?? 2;
              const rb = roleOrder[b.role as keyof typeof roleOrder] ?? 2;
              if (ra !== rb) return ra - rb;
              return b.eloRating - a.eloRating;
            })
            .map((m) => {
              const mRankInfo = getRankInfo(m.eloRating);
              return (
                <div
                  key={m.userId}
                  className="grid grid-cols-[1fr_5rem_4rem_5rem] items-center px-4 py-2 border-b border-white/[0.03] last:border-0 hover:bg-white/[0.015] transition-colors"
                >
                  <Link
                    href={`/profile/${m.username}`}
                    className="text-sm text-text hover:text-accent transition-colors truncate"
                  >
                    {m.username}
                  </Link>
                  <span className="text-right text-sm tabular-nums text-text">
                    {m.eloRating}
                  </span>
                  <span className="text-right">
                    <RankBadge tier={mRankInfo.tier} elo={m.eloRating} showElo={false} size="xs" />
                  </span>
                  <span className={`text-right text-[10px] font-bold uppercase tracking-wider ${ROLE_BADGES[m.role] ?? "text-muted/60"}`}>
                    {m.role}
                  </span>
                </div>
              );
            })}
        </div>
      </div>
    </main>
  );
}
