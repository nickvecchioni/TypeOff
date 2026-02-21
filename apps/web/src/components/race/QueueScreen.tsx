"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { PartyPanel } from "@/components/social/PartyPanel";
import { RankBadge } from "@/components/RankBadge";
import { ChallengesWidget } from "@/components/race/ChallengesWidget";
import { GuestPlacement } from "@/components/race/GuestPlacement";
import { getXpLevel, COSMETIC_REWARDS, getRankInfo } from "@typeoff/shared";
import type { PartyState, RankTier, ModeCategory } from "@typeoff/shared";

// ── Rank styling maps ───────────────────────────────────────────────────────

const RANK_HEX: Record<RankTier, string> = {
  bronze: "#d97706",
  silver: "#9ca3af",
  gold: "#eab308",
  platinum: "#67e8f9",
  diamond: "#3b82f6",
  master: "#a855f7",
  grandmaster: "#ef4444",
};

const RANK_GLOW: Record<RankTier, string> = {
  bronze: "rgba(217, 119, 6, 0.18)",
  silver: "rgba(156, 163, 175, 0.14)",
  gold: "rgba(234, 179, 8, 0.22)",
  platinum: "rgba(103, 232, 249, 0.18)",
  diamond: "rgba(59, 130, 246, 0.22)",
  master: "rgba(168, 85, 247, 0.22)",
  grandmaster: "rgba(239, 68, 68, 0.22)",
};

// ── Static data ─────────────────────────────────────────────────────────────

const MODES = [
  { id: "words" as const, label: "Words", icon: "Aa", desc: "common english words" },
  { id: "special" as const, label: "Special", icon: "#!", desc: "numbers & punct" },
  { id: "quotes" as const, label: "Quotes", icon: "\u201C\u201D", desc: "famous quotes" },
  { id: "code" as const, label: "Code", icon: "</>", desc: "code snippets" },
] as const;

// ── Props ───────────────────────────────────────────────────────────────────

interface QueueScreenProps {
  isQueuing: boolean;
  queueCount: number;
  queueElapsed: number;
  maxWaitSeconds: number;
  connected: boolean;
  onJoin: (opts?: { privateRace?: boolean; modeCategories?: ModeCategory[] }) => void;
  onLeave: () => void;
  party: PartyState | null;
  partyError: string | null;
  onCreateParty: () => void;
  onInviteToParty: (userId: string) => void;
  onKickFromParty: (userId: string) => void;
  onLeaveParty: () => void;
  onMarkReady?: () => void;
  privateRace?: boolean;
  onSetPrivateRace?: (v: boolean) => void;
}

// ── Sub-components ──────────────────────────────────────────────────────────

function QuickLinks() {
  return (
    <div className="grid grid-cols-5 gap-2">
      {[
        {
          href: "/daily",
          label: "Daily",
          sub: "Challenge",
          color: "text-amber-400",
          icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          ),
        },
        {
          href: "/ghost",
          label: "Ghost",
          sub: "Race",
          color: "text-purple-400",
          icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 10h.01M15 10h.01M12 2a8 8 0 0 0-8 8v10l3-3 2.5 3L12 17l2.5 3L17 17l3 3V10a8 8 0 0 0-8-8z" />
            </svg>
          ),
        },
        {
          href: "/leaderboard",
          label: "Leaders",
          sub: "board",
          color: "text-rank-gold",
          icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 21H5a2 2 0 0 1-2-2v-5" />
              <path d="M16 21h3a2 2 0 0 0 2-2v-5" />
              <path d="M12 21V9" />
              <path d="M5 16V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v11" />
              <path d="M9 9h6" />
            </svg>
          ),
        },
        {
          href: "/analytics",
          label: "Analytics",
          sub: "Stats",
          color: "text-accent",
          icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
          ),
        },
        {
          href: "/spectate",
          label: "Spectate",
          sub: "Live",
          color: "text-correct",
          icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          ),
        },
      ].map(({ href, label, sub, color, icon }) => (
        <Link
          key={href}
          href={href}
          className="group flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl bg-white/[0.02] ring-1 ring-white/[0.04] hover:bg-white/[0.04] hover:ring-white/[0.08] transition-all text-center"
        >
          <span className={`${color} group-hover:scale-110 transition-transform duration-150`}>{icon}</span>
          <div>
            <div className="text-[11px] font-semibold text-text/70 group-hover:text-text/90 transition-colors leading-none">{label}</div>
            <div className="text-[9px] text-muted/35 leading-none mt-0.5">{sub}</div>
          </div>
        </Link>
      ))}
    </div>
  );
}

function LevelWidget({
  level,
  currentXp,
  nextLevelXp,
  isPro,
}: {
  level: number;
  currentXp: number;
  nextLevelXp: number;
  isPro: boolean;
}) {
  const xpPct = Math.round((currentXp / nextLevelXp) * 100);
  const nextReward = COSMETIC_REWARDS.find((r) => r.level === level + 1);
  const proLocked = nextReward?.proOnly && !isPro;

  const rewardIcon = (() => {
    if (!nextReward) return "✨";
    switch (nextReward.type) {
      case "badge": return nextReward.value;
      case "nameColor": return "🎨";
      case "title": return "🏷️";
      case "cursorStyle": return "🔲";
      case "profileBorder": return "🖼️";
      case "typingTheme": return "🎨";
      default: return "✨";
    }
  })();

  return (
    <Link
      href="/cosmetics"
      className="rounded-xl bg-surface/50 ring-1 ring-white/[0.04] overflow-hidden flex flex-col hover:ring-accent/20 transition-all group"
    >
      <div className="h-px bg-gradient-to-r from-transparent via-accent/20 to-transparent" />
      <div className="p-4 flex-1 flex flex-col justify-center">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-accent uppercase tracking-wider">
            Level {level}
          </span>
          <span className="text-xs text-muted tabular-nums group-hover:text-muted/80 transition-colors">
            {currentXp} / {nextLevelXp} XP
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-surface overflow-hidden mb-3">
          <div
            className="h-full rounded-full bg-accent transition-all"
            style={{ width: `${xpPct}%` }}
          />
        </div>
        {nextReward && (
          <div className="flex items-center gap-2 text-[11px] text-muted/50 group-hover:text-muted/70 transition-colors">
            <span className={`text-sm ${proLocked ? "opacity-40" : ""}`}>{rewardIcon}</span>
            <span>
              <span className="text-text/70 font-medium">{nextReward.name}</span>
              {" "}at Level {nextReward.level}
            </span>
            {proLocked && (
              <span className="text-[8px] font-black tracking-wider text-amber-400 bg-amber-400/10 ring-1 ring-amber-400/30 px-1 py-px rounded leading-none">
                PRO
              </span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}

// ── Main component ──────────────────────────────────────────────────────────

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
  onMarkReady,
  privateRace,
  onSetPrivateRace,
}: QueueScreenProps) {
  const { data: session, status } = useSession();
  const [modeCategories, setModeCategories] = useState<ModeCategory[]>(["words"]);

  function toggleMode(id: ModeCategory) {
    setModeCategories(prev =>
      prev.includes(id)
        ? prev.length > 1 ? prev.filter(m => m !== id) : prev
        : [...prev, id]
    );
  }

  const myUserId = session?.user?.id;
  const isPartyLeader = party?.leaderId === myUserId;
  const inPartyNotLeader = party != null && !isPartyLeader;
  const inParty = party != null && party.members.length >= 2;
  const amReady = myUserId ? party?.readyState[myUserId] ?? false : false;
  const allMembersReady =
    inParty && isPartyLeader
      ? party!.members
          .filter((m) => m.userId !== myUserId)
          .every((m) => party!.readyState[m.userId])
      : true;
  const xpInfo = session?.user ? getXpLevel(session.user.totalXp) : null;

  // Enter key shortcut to join queue (or mark ready for non-leaders)
  React.useEffect(() => {
    if (isQueuing || !session?.user || !connected) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Enter" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (
          tag === "INPUT" ||
          tag === "TEXTAREA" ||
          tag === "SELECT" ||
          tag === "BUTTON" ||
          tag === "A"
        )
          return;
        e.preventDefault();
        if (inPartyNotLeader) {
          if (!amReady) onMarkReady?.();
        } else if (allMembersReady) {
          onJoin({ privateRace, modeCategories });
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    isQueuing,
    session?.user,
    connected,
    inPartyNotLeader,
    amReady,
    allMembersReady,
    onJoin,
    onMarkReady,
    privateRace,
    modeCategories,
  ]);

  /* ── Loading skeleton ─────────────────────────────────────────────────── */
  if (status === "loading") {
    return (
      <div className="flex flex-col items-center w-full max-w-4xl gap-5">
        <div className="w-full h-[68px] rounded-xl bg-surface-bright/10 animate-pulse" />
        <div className="w-full max-w-lg">
          <div className="grid grid-cols-4 gap-1.5 mb-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-[68px] rounded-lg bg-surface-bright/10 animate-pulse" />
            ))}
          </div>
          <div className="w-full h-[60px] rounded-xl bg-surface-bright/15 animate-pulse" />
          <div className="flex justify-center mt-3">
            <div className="w-20 h-4 rounded bg-surface-bright/10 animate-pulse" />
          </div>
        </div>
        <div className="w-full grid grid-cols-5 gap-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="h-[60px] rounded-xl bg-surface-bright/8 animate-pulse" />
          ))}
        </div>
        <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="h-[280px] rounded-xl bg-surface-bright/10 animate-pulse" />
          <div className="h-[280px] rounded-xl bg-surface-bright/10 animate-pulse" />
        </div>
      </div>
    );
  }

  /* ── Queuing state ────────────────────────────────────────────────────── */
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

  /* ── Idle state ───────────────────────────────────────────────────────── */
  return (
    <div className="flex flex-col items-center w-full max-w-4xl gap-5">
      {session?.user ? (
        <>
          {/* ── Player identity card ──────────────────────────────────── */}
          {session.user.placementsCompleted && (
            <div
              className="relative w-full rounded-xl overflow-hidden animate-fade-in"
              style={{ animationFillMode: "both" }}
            >
              {/* Ambient rank glow */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: `radial-gradient(ellipse at 20% 50%, ${RANK_GLOW[session.user.rankTier]} 0%, transparent 65%)`,
                }}
              />

              <div className="relative flex items-center gap-4 sm:gap-5 px-5 py-3.5 ring-1 ring-white/[0.05] rounded-xl bg-surface/40">
                {/* Badge + rank name */}
                <div className="flex items-center gap-3 shrink-0">
                  <RankBadge
                    tier={session.user.rankTier}
                    elo={session.user.eloRating}
                    size="md"
                    showElo={false}
                  />
                  <div className="hidden sm:block">
                    <div className="text-[9px] text-muted/40 uppercase tracking-widest leading-none mb-0.5">
                      rank
                    </div>
                    <div
                      className="text-sm font-bold leading-none"
                      style={{ color: RANK_HEX[session.user.rankTier] }}
                    >
                      {getRankInfo(session.user.eloRating).label}
                    </div>
                  </div>
                </div>

                <div className="w-px h-8 bg-white/[0.05] shrink-0" />

                {/* ELO */}
                <div className="shrink-0">
                  <div className="text-[9px] text-muted/40 uppercase tracking-widest leading-none mb-0.5">
                    elo
                  </div>
                  <div
                    className="text-2xl font-black tabular-nums tracking-tight leading-none"
                    style={{
                      color: RANK_HEX[session.user.rankTier],
                      textShadow: `0 0 24px ${RANK_GLOW[session.user.rankTier]}`,
                    }}
                  >
                    {session.user.eloRating}
                  </div>
                </div>


                {/* Win streak */}
                {session.user.currentStreak > 1 && (
                  <>
                    <div className="w-px h-8 bg-white/[0.05] shrink-0" />
                    <div className="shrink-0">
                      <div className="text-[9px] text-muted/40 uppercase tracking-widest leading-none mb-0.5">
                        streak
                      </div>
                      <div className="text-sm font-bold text-amber-400 tabular-nums leading-none">
                        🔥 {session.user.currentStreak}
                      </div>
                    </div>
                  </>
                )}

                <div className="flex-1" />

                {/* Level + mini XP bar */}
                {xpInfo && (
                  <Link
                    href="/cosmetics"
                    className="hidden sm:flex flex-col items-end gap-1 shrink-0 group"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] text-muted/40 uppercase tracking-widest">lv.</span>
                      <span className="text-sm font-black text-accent tabular-nums">
                        {xpInfo.level}
                      </span>
                    </div>
                    <div className="w-20 h-[3px] bg-surface rounded-full overflow-hidden">
                      <div
                        className="h-full bg-accent/70 rounded-full group-hover:bg-accent transition-colors duration-300"
                        style={{
                          width: `${Math.round((xpInfo.currentXp / xpInfo.nextLevelXp) * 100)}%`,
                        }}
                      />
                    </div>
                    <div className="text-[9px] text-muted/30 group-hover:text-muted/50 transition-colors tabular-nums">
                      {xpInfo.currentXp}/{xpInfo.nextLevelXp} xp
                    </div>
                  </Link>
                )}
              </div>
            </div>
          )}

          {/* ── Action area ───────────────────────────────────────────── */}
          {inPartyNotLeader ? (
            <div
              className="flex flex-col items-center gap-3 w-full animate-fade-in"
              style={{ animationDelay: "50ms", animationFillMode: "both" }}
            >
              <button
                onClick={() => !amReady && onMarkReady?.()}
                disabled={amReady}
                className={`w-full rounded-xl py-5 text-base font-bold tracking-wide transition-all ${
                  amReady
                    ? "bg-correct/[0.08] ring-1 ring-correct/25 text-correct cursor-default"
                    : "bg-accent/[0.08] ring-1 ring-accent/25 text-accent hover:bg-accent hover:text-bg hover:ring-accent"
                }`}
              >
                {amReady ? "Ready!" : "Ready"}
                {!amReady && (
                  <span className="inline-block w-[2px] h-[1.1em] bg-current animate-blink ml-0.5 translate-y-[2px]" />
                )}
              </button>
              <span className="text-[11px] text-muted/40">
                {amReady ? (
                  "Waiting for party leader to start..."
                ) : (
                  <>
                    press{" "}
                    <kbd className="inline-flex items-center px-1.5 py-0.5 rounded bg-white/[0.05] ring-1 ring-white/[0.08] text-muted/60 text-[10px] font-medium">
                      Enter ↵
                    </kbd>
                  </>
                )}
              </span>
              {privateRace && (
                <span className="text-[10px] font-semibold uppercase tracking-wider text-accent/70 bg-accent/[0.08] ring-1 ring-accent/20 rounded px-2 py-0.5">
                  Private
                </span>
              )}
            </div>
          ) : (
            <div
              className="relative flex flex-col items-center w-full animate-fade-in"
              style={{ animationDelay: "50ms", animationFillMode: "both" }}
            >
              {/* Ambient glow behind action area */}
              <div
                className="absolute -inset-24 pointer-events-none"
                style={{
                  background:
                    "radial-gradient(ellipse at center, rgba(77, 158, 255, 0.06) 0%, transparent 70%)",
                }}
              />

              {/* Mode selector */}
              {session.user.placementsCompleted && (
                <div className="relative w-full grid grid-cols-4 gap-1.5 mb-4">
                  {MODES.map(({ id, label, icon, desc }) => {
                    const active = modeCategories.includes(id);
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => toggleMode(id)}
                        className={`flex flex-col items-center gap-1 px-2 py-2.5 rounded-lg text-center transition-all ${
                          active
                            ? "ring-1 ring-accent bg-accent/[0.08] text-accent"
                            : "ring-1 ring-white/[0.06] bg-white/[0.02] text-muted/60 hover:text-muted hover:ring-white/[0.1] hover:bg-white/[0.04]"
                        }`}
                      >
                        <span
                          className={`text-sm font-bold font-mono leading-none ${active ? "text-accent" : ""}`}
                        >
                          {icon}
                        </span>
                        <span className="text-[11px] font-semibold leading-none">{label}</span>
                        <span
                          className={`text-[9px] leading-tight hidden sm:block ${active ? "text-accent/70" : "text-muted/40"}`}
                        >
                          {desc}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Find Race button */}
              <button
                onClick={() => onJoin({ privateRace, modeCategories })}
                disabled={!connected || (inParty && !allMembersReady)}
                className="relative w-full rounded-xl bg-accent/[0.08] ring-1 ring-accent/25 text-accent py-5 text-base font-bold tracking-wide glow-accent hover:bg-accent hover:text-bg hover:ring-accent hover:glow-accent-strong transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-accent/[0.08] disabled:hover:text-accent disabled:hover:ring-accent/25"
              >
                {session.user.placementsCompleted
                  ? privateRace
                    ? "Start Private Race"
                    : "Find Race"
                  : "Start Placement"}
                <span className="inline-block w-[2px] h-[1.1em] bg-current animate-blink ml-0.5 translate-y-[2px]" />
              </button>

              {/* Hint row + secondary actions */}
              <div className="relative flex items-center justify-between w-full mt-3">
                <span className="text-[11px] text-muted/40">
                  {inParty && !allMembersReady ? (
                    "waiting for party to ready up..."
                  ) : (
                    <>
                      press{" "}
                      <kbd className="inline-flex items-center px-1.5 py-0.5 rounded bg-white/[0.05] ring-1 ring-white/[0.08] text-muted/60 text-[10px] font-medium">
                        Enter ↵
                      </kbd>
                    </>
                  )}
                </span>

                {session.user.placementsCompleted && !party && (
                  <div className="flex items-center gap-2">
                    <Link
                      href="/solo"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted/70 bg-white/[0.04] ring-1 ring-white/[0.08] hover:text-text hover:bg-white/[0.06] hover:ring-white/[0.12] transition-all"
                    >
                      <svg
                        width="10"
                        height="10"
                        viewBox="0 0 16 16"
                        fill="none"
                        className="opacity-70"
                      >
                        <circle cx="8" cy="5" r="3" stroke="currentColor" strokeWidth="1.5" />
                        <path d="M2 14c0-3.314 2.686-6 6-6s6 2.686 6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                      Solo
                    </Link>
                    <button
                      onClick={onCreateParty}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted/70 bg-white/[0.04] ring-1 ring-white/[0.08] hover:text-text hover:bg-white/[0.06] hover:ring-white/[0.12] transition-all"
                    >
                      <svg
                        width="10"
                        height="10"
                        viewBox="0 0 16 16"
                        fill="none"
                        className="opacity-70"
                      >
                        <circle cx="6" cy="6" r="3" stroke="currentColor" strokeWidth="1.5" />
                        <circle cx="11" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.5" />
                      </svg>
                      Party
                    </button>
                  </div>
                )}
              </div>

              {/* Private race toggle */}
              {party &&
                isPartyLeader &&
                party.members.length >= 2 &&
                session.user.placementsCompleted && (
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
                  complete a placement test to unlock ranked
                </p>
              )}
            </div>
          )}

          {/* ── Party panel ───────────────────────────────────────────── */}
          {session.user.placementsCompleted && party && (
            <div
              className="w-full max-w-lg mt-1 animate-fade-in"
              style={{ animationDelay: "100ms", animationFillMode: "both" }}
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

          {/* ── Quick links ───────────────────────────────────────────── */}
          {session.user.placementsCompleted && (
            <div
              className="w-full animate-fade-in"
              style={{ animationDelay: "80ms", animationFillMode: "both" }}
            >
              <QuickLinks />
            </div>
          )}

          {/* ── Dashboard ─────────────────────────────────────────────── */}
          {session.user.placementsCompleted && xpInfo && (
            <div
              className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3 animate-fade-in"
              style={{ animationDelay: "120ms", animationFillMode: "both" }}
            >
              <ChallengesWidget />
              <LevelWidget
                level={xpInfo.level}
                currentXp={xpInfo.currentXp}
                nextLevelXp={xpInfo.nextLevelXp}
                isPro={session.user.isPro ?? false}
              />
            </div>
          )}
        </>
      ) : (
        /* ── Signed-out: Guest Placement ───────────────────────────── */
        <div className="w-full max-w-4xl">
          <GuestPlacement />
        </div>
      )}
    </div>
  );
}
