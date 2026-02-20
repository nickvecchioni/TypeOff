import Link from "next/link";
import { getRankInfo } from "@typeoff/shared";
import { RankBadge } from "@/components/RankBadge";
import { LiveBadge } from "@/components/WatchLiveButton";
import { ClanActions } from "../../clans/[clanId]/clan-actions";
import { ClanSectionCollapse } from "./clan-section-collapse";

/* ── Types ─────────────────────────────────────────────── */

interface ClanData {
  id: string;
  name: string;
  tag: string;
  description: string | null;
  eloRating: number;
  memberCount: number;
  createdAt: Date;
}

interface ClanMember {
  userId: string;
  role: string;
  joinedAt: Date;
  username: string | null;
  eloRating: number;
  rankTier: string;
}

interface ClanSectionProps {
  clan: ClanData;
  members: ClanMember[];
  viewerMember: ClanMember | null;
  isLeaderOrOfficer: boolean;
  viewerHasClan: boolean;
  pendingInviteId: string | null;
}

/* ── Clan Section ──────────────────────────────────────── */

const ROLE_BADGES: Record<string, string> = {
  leader: "text-amber-400",
  officer: "text-sky-400",
  member: "text-muted/60",
};

export function ClanSection({
  clan,
  members,
  viewerMember,
  isLeaderOrOfficer,
  viewerHasClan,
  pendingInviteId,
}: ClanSectionProps) {
  const clanRankInfo = getRankInfo(clan.eloRating);

  const sortedMembers = [...members].sort((a, b) => {
    const roleOrder = { leader: 0, officer: 1, member: 2 };
    const ra = roleOrder[a.role as keyof typeof roleOrder] ?? 2;
    const rb = roleOrder[b.role as keyof typeof roleOrder] ?? 2;
    if (ra !== rb) return ra - rb;
    return b.eloRating - a.eloRating;
  });

  return (
    <ClanSectionCollapse>
      <div className="space-y-3 animate-fade-in">
        {/* Clan Header */}
        <div className="rounded-xl bg-surface/40 ring-1 ring-white/[0.04] px-5 py-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-accent/70">[{clan.tag}]</span>
                <Link
                  href={`/clans/${clan.id}`}
                  className="text-lg font-bold text-text hover:text-accent transition-colors"
                >
                  {clan.name}
                </Link>
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
          </div>
        </div>

        {/* Actions */}
        <ClanActions
          clanId={clan.id}
          isLeaderOrOfficer={isLeaderOrOfficer}
          isMember={!!viewerMember}
          isLeader={viewerMember?.role === "leader"}
          viewerHasClan={viewerHasClan}
          pendingInviteId={pendingInviteId}
        />

        {/* Members Table */}
        <div className="rounded-xl bg-surface/40 ring-1 ring-white/[0.04] overflow-hidden">
          <div className="grid grid-cols-[1fr_5rem_4rem_5rem] text-xs text-muted/50 uppercase tracking-wider px-4 py-2 border-b border-white/[0.06]">
            <span>Member</span>
            <span className="text-right">ELO</span>
            <span className="text-right">Rank</span>
            <span className="text-right">Role</span>
          </div>
          {sortedMembers.map((m) => {
            const mRankInfo = getRankInfo(m.eloRating);
            return (
              <div
                key={m.userId}
                className="grid grid-cols-[1fr_5rem_4rem_5rem] items-center px-4 py-2 border-b border-white/[0.03] last:border-0 hover:bg-white/[0.015] transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Link
                    href={`/profile/${m.username}`}
                    className="text-sm text-text hover:text-accent transition-colors truncate"
                  >
                    {m.username}
                  </Link>
                  <LiveBadge userId={m.userId} />
                </div>
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
    </ClanSectionCollapse>
  );
}
