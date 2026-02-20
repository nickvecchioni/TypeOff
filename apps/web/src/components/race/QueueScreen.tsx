"use client";

import React from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { PartyPanel } from "@/components/social/PartyPanel";
import { RankBadge } from "@/components/RankBadge";
import { ChallengesWidget } from "@/components/race/ChallengesWidget";
import { TypePassWidget } from "@/components/race/TypePassWidget";
import { GuestPlacement } from "@/components/race/GuestPlacement";
import { getXpLevel } from "@typeoff/shared";
import type { PartyState, RankTier } from "@typeoff/shared";

const RANK_GLOW: Record<RankTier, string> = {
  bronze: "0 0 40px rgba(217, 119, 6, 0.15)",
  silver: "0 0 40px rgba(156, 163, 175, 0.12)",
  gold: "0 0 40px rgba(234, 179, 8, 0.2)",
  platinum: "0 0 40px rgba(103, 232, 249, 0.15)",
  diamond: "0 0 40px rgba(59, 130, 246, 0.2)",
  master: "0 0 40px rgba(168, 85, 247, 0.2)",
  grandmaster: "0 0 40px rgba(239, 68, 68, 0.2)",
};

interface QueueScreenProps {
  isQueuing: boolean;
  queueCount: number;
  queueElapsed: number;
  maxWaitSeconds: number;
  connected: boolean;
  onJoin: (opts?: { privateRace?: boolean }) => void;
  onLeave: () => void;
  party: PartyState | null;
  partyError: string | null;
  onCreateParty: () => void;
  onInviteToParty: (userId: string) => void;
  onKickFromParty: (userId: string) => void;
  onLeaveParty: () => void;
  privateRace?: boolean;
  onSetPrivateRace?: (v: boolean) => void;
}

export function QueueScreen({
  isQueuing,
  queueCount,
  queueElapsed,
  maxWaitSeconds,
  connected,
  onJoin,
  onLeave,
  party,
  partyError,
  onCreateParty,
  onInviteToParty,
  onKickFromParty,
  onLeaveParty,
  privateRace,
  onSetPrivateRace,
}: QueueScreenProps) {
  const { data: session } = useSession();

  const myUserId = session?.user?.id;
  const isPartyLeader = party?.leaderId === myUserId;
  const inPartyNotLeader = party != null && !isPartyLeader;
  const xpInfo = session?.user ? getXpLevel(session.user.totalXp) : null;

  // Enter key shortcut to join queue
  React.useEffect(() => {
    if (isQueuing || !session?.user || !connected || inPartyNotLeader) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Enter" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || tag === "BUTTON" || tag === "A") return;
        e.preventDefault();
        onJoin({ privateRace });
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isQueuing, session?.user, connected, inPartyNotLeader, onJoin, privateRace]);

  /* ── Queuing state ──────────────────────────────────────── */
  if (isQueuing) {
    return (
      <div className="flex flex-col items-center gap-8 animate-fade-in">
        <div className="flex flex-col items-center gap-1">
          <div className="text-5xl font-black text-accent tabular-nums text-glow-accent">
            {queueCount}
          </div>
          <p className="text-muted text-sm">
            {queueCount === 1 ? "player" : "players"} in queue
          </p>
        </div>

        {party && (
          <div className="text-xs text-muted">
            Queuing with {party.members.length} party{" "}
            {party.members.length === 1 ? "member" : "members"}
          </div>
        )}

        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
          <span className="text-muted text-sm">
            {queueElapsed < maxWaitSeconds
              ? `Match starts in ${maxWaitSeconds - queueElapsed}s...`
              : "Starting match..."}
          </span>
        </div>
        <button
          onClick={onLeave}
          className="text-sm text-muted hover:text-error transition-colors"
        >
          Leave queue
        </button>
      </div>
    );
  }

  /* ── Idle state ─────────────────────────────────────────── */
  return (
    <div className="flex flex-col items-center w-full max-w-3xl">
      {session?.user ? (
        <>
          {/* Player identity */}
          {session.user.placementsCompleted && (
            <div
              className="flex flex-col items-center gap-1.5 mb-6 opacity-0 animate-fade-in"
              style={{ animationDelay: "0ms", animationFillMode: "both" }}
            >
              <RankBadge
                tier={session.user.rankTier}
                elo={session.user.eloRating}
                size="md"
                showElo={false}
              />
              <div
                className="text-3xl font-black tabular-nums tracking-tight"
                style={{ textShadow: RANK_GLOW[session.user.rankTier] }}
              >
                {session.user.eloRating}
              </div>
              {session.user.currentStreak > 0 && (
                <div className="flex items-center gap-3 text-xs text-muted">
                  <span className="text-amber-400 font-semibold tabular-nums">
                    {"\uD83D\uDD25"} {session.user.currentStreak}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Action area */}
          {inPartyNotLeader ? (
            <div
              className="flex flex-col items-center gap-2 py-3 opacity-0 animate-fade-in"
              style={{ animationDelay: "80ms", animationFillMode: "both" }}
            >
              <span className="text-sm text-muted">
                Waiting for party leader to start...
              </span>
              {privateRace && (
                <span className="text-[10px] font-semibold uppercase tracking-wider text-accent/70 bg-accent/[0.08] ring-1 ring-accent/20 rounded px-2 py-0.5">
                  Private
                </span>
              )}
            </div>
          ) : (
            <div
              className="relative flex flex-col items-center w-full max-w-lg opacity-0 animate-fade-in"
              style={{ animationDelay: "80ms", animationFillMode: "both" }}
            >
              {/* Ambient glow */}
              <div
                className="absolute -inset-24 pointer-events-none"
                style={{
                  background:
                    "radial-gradient(ellipse at center, rgba(77, 158, 255, 0.06) 0%, transparent 70%)",
                }}
              />
              <button
                onClick={() => onJoin({ privateRace })}
                disabled={!connected}
                className="relative w-full rounded-xl bg-accent/[0.08] ring-1 ring-accent/25 text-accent py-5 text-base font-bold tracking-wide glow-accent hover:bg-accent hover:text-bg hover:ring-accent hover:glow-accent-strong transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {session.user.placementsCompleted
                  ? privateRace ? "Start Private Race" : "Find Race"
                  : "Start Placement"}
                <span className="inline-block w-[2px] h-[1.1em] bg-current animate-blink ml-0.5 translate-y-[2px]" />
              </button>
              <div className="relative flex items-center gap-3 mt-3">
                <span className="text-[11px] text-muted/40">
                  press{" "}
                  <kbd className="inline-flex items-center px-1.5 py-0.5 rounded bg-white/[0.05] ring-1 ring-white/[0.08] text-muted/60 text-[10px] font-medium">
                    Enter ↵
                  </kbd>
                </span>
              </div>
              {session.user.placementsCompleted && !party && (
                <div className="relative flex items-center gap-2 mt-4">
                  <Link
                    href="/solo"
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium text-muted/70 bg-white/[0.04] ring-1 ring-white/[0.08] hover:text-text hover:bg-white/[0.06] hover:ring-white/[0.12] transition-all"
                  >
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" className="opacity-70">
                      <path d="M8 1v14M1 8h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                    Solo Practice
                  </Link>
                  <button
                    onClick={onCreateParty}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium text-muted/70 bg-white/[0.04] ring-1 ring-white/[0.08] hover:text-text hover:bg-white/[0.06] hover:ring-white/[0.12] transition-all"
                  >
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" className="opacity-70">
                      <circle cx="6" cy="6" r="3" stroke="currentColor" strokeWidth="1.5"/>
                      <circle cx="11" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.5"/>
                    </svg>
                    Create Party
                  </button>
                </div>
              )}
              {/* Private race toggle — visible to party leaders with 2+ members */}
              {party && isPartyLeader && party.members.length >= 2 && session.user.placementsCompleted && (
                <label className="relative flex items-center gap-2 mt-3 cursor-pointer select-none group">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={!!privateRace}
                    onClick={() => onSetPrivateRace?.(!privateRace)}
                    className={`relative w-8 h-[18px] rounded-full transition-colors ${
                      privateRace ? "bg-accent" : "bg-white/[0.08]"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-3.5 h-3.5 rounded-full bg-white transition-transform ${
                        privateRace ? "translate-x-3.5" : ""
                      }`}
                    />
                  </button>
                  <span className="text-[11px] text-muted/50 group-hover:text-muted transition-colors">
                    Private race
                  </span>
                </label>
              )}
              {!session.user.placementsCompleted && (
                <p className="relative text-[11px] text-muted/30 mt-1">
                  complete a placement race to unlock ranked
                </p>
              )}
            </div>
          )}

          {/* Party panel */}
          {session.user.placementsCompleted && party && (
            <div
              className="w-full max-w-lg mt-5 opacity-0 animate-fade-in"
              style={{ animationDelay: "160ms", animationFillMode: "both" }}
            >
              <PartyPanel
                party={party}
                error={partyError}
                onCreateParty={onCreateParty}
                onInvite={onInviteToParty}
                onKick={onKickFromParty}
                onLeave={onLeaveParty}
              />
            </div>
          )}

          {/* Dashboard */}
          {session.user.placementsCompleted && (
            <div
              className="w-full mt-10 grid grid-cols-1 sm:grid-cols-2 gap-3 items-start opacity-0 animate-fade-in"
              style={{ animationDelay: "220ms", animationFillMode: "both" }}
            >
              <ChallengesWidget />
              <div className="grid grid-rows-2 gap-3">
                {/* User XP */}
                <Link
                  href={session.user.username ? `/profile/${session.user.username}` : "#"}
                  className="rounded-xl bg-surface/50 ring-1 ring-white/[0.04] overflow-hidden flex flex-col hover:ring-accent/20 transition-all group"
                >
                  <div className="h-px bg-gradient-to-r from-transparent via-accent/20 to-transparent" />
                  <div className="p-4 flex-1 flex flex-col justify-center">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-accent uppercase tracking-wider">
                        Level {xpInfo!.level}
                      </span>
                      <span className="text-xs text-muted tabular-nums group-hover:text-muted/80 transition-colors">
                        {xpInfo!.currentXp} / {xpInfo!.nextLevelXp} XP
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-surface overflow-hidden">
                      <div
                        className="h-full rounded-full bg-accent transition-all"
                        style={{ width: `${Math.round((xpInfo!.currentXp / xpInfo!.nextLevelXp) * 100)}%` }}
                      />
                    </div>
                  </div>
                </Link>
                {/* Season XP */}
                <TypePassWidget />
              </div>
            </div>
          )}
        </>
      ) : (
        /* ── Signed-out: Guest Placement ─────────────────── */
        <div className="w-full max-w-xl">
          <GuestPlacement />
        </div>
      )}
    </div>
  );
}
