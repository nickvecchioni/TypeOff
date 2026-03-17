"use client";

import React from "react";
import Link from "next/link";
import { useSession, signIn } from "next-auth/react";
import { PartyPanel } from "@/components/social/PartyPanel";
import { ChallengesWidget } from "@/components/race/ChallengesWidget";
import { getXpLevel, COSMETIC_REWARDS, getRankInfo, getRankProgress, getNextDivisionElo, TYPING_THEMES, NAME_COLORS, CURSOR_STYLES, PLACEMENT_RACES_REQUIRED } from "@typeoff/shared";
import { AdBanner } from "@/components/AdBanner";
import type { PartyState, RankTier, ModeCategory, CosmeticReward } from "@typeoff/shared";

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
  { id: "words" as const, label: "Words", icon: "aa", desc: "plain lowercase words" },
  { id: "special" as const, label: "Mixed", icon: "Aa.", desc: "punctuation & numbers" },
  { id: "quotes" as const, label: "Quotes", icon: "\u201C\u201D", desc: "famous quotations" },
  { id: "code" as const, label: "Code", icon: "</>", desc: "real syntax, real pain" },
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
  modeCategories: ModeCategory[];
  onSetModeCategories: (categories: ModeCategory[]) => void;
}

// ── Sub-components ──────────────────────────────────────────────────────────

function EloProgressBar({ elo, tier }: { elo: number; tier: RankTier }) {
  const progress = getRankProgress(elo);
  const nextElo = getNextDivisionElo(elo);
  const currentRankInfo = getRankInfo(elo);

  if (nextElo == null) {
    return (
      <div className="flex-1 min-w-0 flex items-center">
        <span className="text-sm font-bold" style={{ color: RANK_HEX[tier] }}>
          {currentRankInfo.label}
        </span>
      </div>
    );
  }

  const nextRankInfo = getRankInfo(nextElo);
  const eloNeeded = nextElo - elo;

  return (
    <div className="flex-1 min-w-0 flex flex-col gap-1.5 justify-center">
      <div className="flex items-center justify-between gap-2">
        <span
          className="text-xs font-bold leading-none"
          style={{ color: RANK_HEX[currentRankInfo.tier] }}
        >
          {currentRankInfo.label}
        </span>
        <div className="flex items-center gap-1 leading-none">
          <span className="text-xs text-muted/65 tabular-nums">{eloNeeded} away</span>
          <span className="text-xs text-muted/65">·</span>
          <span
            className="text-xs font-bold"
            style={{ color: RANK_HEX[nextRankInfo.tier] }}
          >
            {nextRankInfo.label}
          </span>
        </div>
      </div>
      <div className="h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${Math.round(progress * 100)}%`,
            backgroundColor: RANK_HEX[tier],
            boxShadow: progress > 0.7 ? `0 0 8px ${RANK_GLOW[tier]}` : undefined,
          }}
        />
      </div>
    </div>
  );
}

const BORDER_COLORS: Record<string, string> = {
  s1_border_ember:    "#f97316",
  s1_border_ice:      "#67e8f9",
  s1_border_diamond:  "#3b82f6",
  s1_border_void:     "#818cf8",
  pro_border_inferno: "#ef4444",
  pro_border_aurora:  "#34d399",
  pro_border_obsidian:"#a78bfa",
};

function RewardIcon({ reward }: { reward: CosmeticReward }) {
  switch (reward.type) {
    case "typingTheme": {
      const theme = TYPING_THEMES[reward.id];
      if (!theme) return <span className="text-sm leading-none">🎨</span>;
      const [c, e, m] = theme.palette;
      return (
        <span className="flex gap-[3px] items-center shrink-0">
          <span className="w-2.5 h-2.5 rounded-[2px]" style={{ backgroundColor: c }} />
          <span className="w-2.5 h-2.5 rounded-[2px]" style={{ backgroundColor: e }} />
          <span className="w-2.5 h-2.5 rounded-[2px]" style={{ backgroundColor: m }} />
        </span>
      );
    }
    case "nameColor": {
      const color = NAME_COLORS[reward.id] ?? reward.value;
      return (
        <span
          className="w-3.5 h-3.5 rounded-full shrink-0 block"
          style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}90` }}
        />
      );
    }
    case "badge":
      return <span className="text-sm leading-none shrink-0">{reward.value}</span>;
    case "cursorStyle": {
      const cursor = CURSOR_STYLES[reward.id];
      if (!cursor) return <span className="text-sm leading-none">▌</span>;
      const { shape, color } = cursor;
      if (shape === "block")
        return (
          <span
            className="w-2.5 h-3.5 rounded-[2px] shrink-0 block"
            style={{ backgroundColor: color, boxShadow: `0 0 5px ${color}90` }}
          />
        );
      if (shape === "underline")
        return (
          <span className="shrink-0 flex flex-col justify-end w-3 h-3.5">
            <span
              className="h-[2px] w-full rounded-full"
              style={{ backgroundColor: color, boxShadow: `0 0 4px ${color}90` }}
            />
          </span>
        );
      return (
        <span
          className="w-[2px] h-3.5 rounded-full shrink-0 block"
          style={{ backgroundColor: color, boxShadow: `0 0 5px ${color}90` }}
        />
      );
    }
    case "title":
      return (
        <span className="text-xs font-black tracking-wide text-accent/80 bg-accent/[0.12] ring-1 ring-accent/20 px-1.5 py-[3px] rounded leading-none shrink-0">
          Tt
        </span>
      );
    case "nameEffect":
      return (
        <span className="text-xs font-black leading-none shrink-0 text-accent [text-shadow:0_0_8px_rgba(77,158,255,0.8)]">
          Aa
        </span>
      );
    case "profileBorder": {
      const color = BORDER_COLORS[reward.id] ?? "#4d9eff";
      return (
        <span
          className="w-3.5 h-3.5 rounded-full shrink-0 block border-2"
          style={{ borderColor: color, boxShadow: `0 0 6px ${color}70` }}
        />
      );
    }
    default:
      return <span className="text-sm leading-none">✨</span>;
  }
}

const REWARD_TYPE_META: Record<string, { label: string; color: string; bg: string; ring: string }> = {
  badge:         { label: "Badge",   color: "#fbbf24", bg: "rgba(251,191,36,0.10)", ring: "rgba(251,191,36,0.25)" },
  title:         { label: "Title",   color: "#4d9eff", bg: "rgba(77,158,255,0.10)", ring: "rgba(77,158,255,0.25)" },
  nameColor:     { label: "Color",   color: "#34d399", bg: "rgba(52,211,153,0.10)", ring: "rgba(52,211,153,0.25)" },
  nameEffect:    { label: "Effect",  color: "#a78bfa", bg: "rgba(167,139,250,0.10)", ring: "rgba(167,139,250,0.25)" },
  cursorStyle:   { label: "Cursor",  color: "#22d3ee", bg: "rgba(34,211,238,0.10)", ring: "rgba(34,211,238,0.25)" },
  profileBorder: { label: "Border",  color: "#fb923c", bg: "rgba(251,146,60,0.10)", ring: "rgba(251,146,60,0.25)" },
  typingTheme:   { label: "Theme",   color: "#f472b6", bg: "rgba(244,114,182,0.10)", ring: "rgba(244,114,182,0.25)" },
};

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
  const upcomingRewards = COSMETIC_REWARDS.filter((r) => r.level > level).slice(0, 6);
  const xpRemaining = nextLevelXp - currentXp;
  const nextReward = upcomingRewards[0];

  return (
    <Link
      href="/cosmetics"
      className="rounded-xl bg-surface/50 ring-1 ring-white/[0.04] overflow-hidden flex flex-col hover:ring-accent/20 transition-all group relative"
    >
      {/* Top shimmer line */}
      <div className="h-px bg-gradient-to-r from-transparent via-accent/30 to-transparent" />

      <div className="px-4 py-3 flex-1 flex flex-col gap-3">

        {/* Level badge + XP bar */}
        <div className="flex items-center gap-3.5">
          <div className="shrink-0 relative">
            <div
              className="w-12 h-12 rounded-lg flex flex-col items-center justify-center"
              style={{
                background: "linear-gradient(135deg, rgba(77,158,255,0.12) 0%, rgba(77,158,255,0.04) 100%)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04), 0 0 20px rgba(77,158,255,0.06)",
              }}
            >
              <div className="text-[9px] font-black text-accent/50 uppercase tracking-widest leading-none">LVL</div>
              <div className="text-xl font-black text-accent tabular-nums leading-none mt-0.5">{level}</div>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline justify-between mb-1">
              <span className="text-sm font-bold text-accent tabular-nums">
                {currentXp.toLocaleString()}
                <span className="text-muted/60 font-normal"> / {nextLevelXp.toLocaleString()} XP</span>
              </span>
              <span className="text-sm font-bold text-accent/60 tabular-nums">{xpPct}%</span>
            </div>
            <div className="h-2 rounded-full bg-white/[0.04] overflow-hidden relative">
              <div
                className="h-full rounded-full transition-all relative overflow-hidden"
                style={{
                  width: `${xpPct}%`,
                  background: "linear-gradient(90deg, #4d9eff, #6db3ff)",
                  boxShadow: "0 0 12px rgba(77,158,255,0.35)",
                }}
              >
                <div
                  className="absolute inset-0 opacity-40"
                  style={{
                    background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)",
                    animation: "shimmer 2s ease-in-out infinite",
                  }}
                />
              </div>
            </div>
            <div className="text-xs text-muted/65 mt-0.5 tabular-nums">
              {xpRemaining.toLocaleString()} XP to level {level + 1}
            </div>
          </div>
        </div>

        {/* Next unlock highlight */}
        {nextReward && (() => {
          const meta = REWARD_TYPE_META[nextReward.type];
          const proLocked = nextReward.proOnly && !isPro;
          return (
            <div
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg relative overflow-hidden"
              style={{
                background: `linear-gradient(135deg, ${meta.bg} 0%, transparent 60%)`,
                boxShadow: `inset 0 0 0 1px ${meta.ring}`,
              }}
            >
              <div
                className="absolute top-0 left-0 h-full w-[3px] rounded-full"
                style={{ backgroundColor: meta.color, boxShadow: `0 0 8px ${meta.color}60` }}
              />
              <span className={`shrink-0 flex items-center justify-center w-8 ${proLocked ? "opacity-40" : ""}`}>
                <RewardIcon reward={nextReward} />
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold uppercase tracking-wider leading-none mb-1" style={{ color: meta.color }}>
                  Next unlock · Lvl {nextReward.level}
                </div>
                <div className="text-sm font-semibold text-text/90 truncate leading-none">{nextReward.name}</div>
              </div>
              <span
                className="text-xs font-black tracking-wider px-1.5 py-[3px] rounded leading-none shrink-0"
                style={{ color: meta.color, backgroundColor: meta.bg, border: `1px solid ${meta.ring}` }}
              >
                {meta.label.toUpperCase()}
              </span>
              {proLocked && (
                <span className="text-xs font-black tracking-wider text-accent bg-accent/10 ring-1 ring-accent/30 px-1.5 py-[3px] rounded shrink-0 leading-none">
                  PRO
                </span>
              )}
            </div>
          );
        })()}

        {/* Upcoming unlocks */}
        {upcomingRewards.length > 1 && (
          <div className="space-y-0.5">
            <div className="text-xs font-bold text-muted/60 uppercase tracking-wider mb-0.5">Coming up</div>
            {upcomingRewards.slice(1).map((reward) => {
              const meta = REWARD_TYPE_META[reward.type];
              const proLocked = reward.proOnly && !isPro;
              return (
                <div
                  key={reward.id}
                  className="flex items-center gap-2.5 px-2.5 py-[6px] rounded-lg bg-white/[0.015] ring-1 ring-white/[0.04] group-hover:ring-white/[0.06] transition-colors"
                >
                  <span className={`shrink-0 flex items-center justify-center w-7 ${proLocked ? "opacity-30" : ""}`}>
                    <RewardIcon reward={reward} />
                  </span>
                  <span className="text-sm font-semibold text-text/70 truncate leading-none flex-1">
                    {reward.name}
                  </span>
                  <span
                    className="text-xs font-bold tracking-wide px-1.5 py-[2px] rounded leading-none shrink-0"
                    style={{ color: meta.color, backgroundColor: meta.bg }}
                  >
                    {meta.label.toUpperCase()}
                  </span>
                  {proLocked && (
                    <span className="text-xs font-black tracking-wider text-accent bg-accent/10 ring-1 ring-accent/30 px-1.5 py-[2px] rounded shrink-0 leading-none">
                      PRO
                    </span>
                  )}
                  <span className="text-sm text-muted/60 leading-none shrink-0 tabular-nums">
                    {reward.level}
                  </span>
                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* Browse all link hint */}
      <div className="px-4 pb-2.5 pt-0">
        <div className="text-xs text-muted/65 group-hover:text-accent/50 transition-colors text-center">
          Browse all cosmetics →
        </div>
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
  modeCategories,
  onSetModeCategories,
}: QueueScreenProps) {
  const { data: session, status } = useSession();
  const tabPressedRef = React.useRef(false);
  const [modeElos, setModeElos] = React.useState<Record<string, number>>({});
  const [modeRacesPlayed, setModeRacesPlayed] = React.useState<Record<string, number>>({});
  const isGuest = !session?.user;

  // Refresh counter — incremented each time QueueScreen is shown after idle
  const [fetchKey, setFetchKey] = React.useState(0);
  React.useEffect(() => {
    if (!isQueuing) setFetchKey((k) => k + 1);
  }, [isQueuing]);

  // Fetch per-mode ELOs + races played
  React.useEffect(() => {
    if (status === "loading") return;
    if (!session?.user?.id) return;
    fetch("/api/mode-elos")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.modeElos) setModeElos(data.modeElos);
        if (data?.modeRacesPlayed) setModeRacesPlayed(data.modeRacesPlayed);
      })
      .catch(() => {});
  }, [session?.user?.id, status, fetchKey]);

  function toggleMode(id: ModeCategory) {
    onSetModeCategories(
      modeCategories.includes(id)
        ? modeCategories.length > 1 ? modeCategories.filter(m => m !== id) : modeCategories
        : [...modeCategories, id]
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

  // Tab+Enter shortcut to join queue (or mark ready for non-leaders)
  React.useEffect(() => {
    if (isQueuing || !connected) return;

    function handleKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || tag === "BUTTON" || tag === "A") return;

      if (e.key === "Tab") {
        e.preventDefault();
        tabPressedRef.current = true;
        return;
      }
      if (e.key === "Enter" && tabPressedRef.current && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        tabPressedRef.current = false;
        if (inPartyNotLeader) {
          if (!amReady) onMarkReady?.();
        } else if (allMembersReady) {
          onJoin({ privateRace, modeCategories });
        }
        return;
      }
      tabPressedRef.current = false;
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    isQueuing,
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
      <div className="flex flex-col items-center w-full max-w-5xl gap-5">
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
          <div className="w-full max-w-md">
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
    <div className="flex flex-col items-center w-full max-w-5xl gap-3">
        <>
          {/* ── Guest hero + banner ────────────────────────────────────── */}
          {isGuest && (
            <div
              className="w-full flex flex-col items-center gap-3 animate-fade-in"
              style={{ animationDelay: "0ms", animationFillMode: "both" }}
            >
              {/* Hero */}
              <div className="relative flex flex-col items-center gap-1.5 mb-1">
                <div
                  className="absolute -inset-16 pointer-events-none"
                  style={{
                    background: "radial-gradient(ellipse 70% 50% at 50% 40%, rgba(77,158,255,0.07) 0%, transparent 70%)",
                  }}
                />
                <h1 className="relative text-2xl sm:text-3xl font-black text-text tracking-tight text-center leading-tight">
                  Competitive typing, <span className="text-accent">ranked.</span>
                </h1>
                <p className="relative text-text/50 text-base text-center">
                  Race against players at your skill level. Try it now as a guest.
                </p>
              </div>

              {/* Sign-in banner */}
              <div className="w-full rounded-lg bg-accent/[0.06] ring-1 ring-accent/15 px-4 py-2.5 flex items-center justify-between">
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-semibold text-text/90">
                    Playing as Guest
                  </span>
                  <span className="text-sm text-text/50">
                    Sign in to save your progress and climb the ranks
                  </span>
                </div>
                <button
                  onClick={() => signIn("google")}
                  className="shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-accent bg-accent/[0.08] ring-1 ring-accent/20 hover:bg-accent hover:text-bg hover:ring-accent transition-all"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="shrink-0">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Sign in
                </button>
              </div>
            </div>
          )}

          {/* ── Action area ───────────────────────────────────────────── */}
          {!isGuest && inPartyNotLeader ? (
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
              <span className="text-xs text-muted/60">
                {amReady ? (
                  "Waiting for party leader to start..."
                ) : (
                  <>
                    press{" "}
                    <kbd className="inline-flex items-center px-1.5 py-0.5 rounded bg-white/[0.05] ring-1 ring-white/[0.08] text-muted/80 text-xs font-medium">Tab</kbd>
                    {" + "}
                    <kbd className="inline-flex items-center px-1.5 py-0.5 rounded bg-white/[0.05] ring-1 ring-white/[0.08] text-muted/80 text-xs font-medium">Enter ↵</kbd>
                  </>
                )}
              </span>
              {privateRace && (
                <span className="text-xs font-semibold uppercase tracking-wider text-accent/70 bg-accent/[0.08] ring-1 ring-accent/20 rounded px-2 py-0.5">
                  Private
                </span>
              )}
              {party && (
                <div className="w-full mt-1">
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
              <div className="relative w-full mb-2">
                <div className="grid grid-cols-4 gap-1.5">
                  {MODES.map(({ id, label, icon, desc }) => {
                    const active = modeCategories.includes(id);
                    const modeElo = modeElos[id];
                    const modeRank = modeElo != null ? getRankInfo(modeElo) : null;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => toggleMode(id)}
                        className={`flex flex-col items-center gap-1.5 px-2 py-3 rounded-lg text-center transition-all ${
                          active
                            ? "ring-1 ring-accent bg-accent/[0.08] text-accent"
                            : "ring-1 ring-white/[0.09] bg-white/[0.02] text-text/70 hover:text-text/90 hover:ring-white/[0.15] hover:bg-white/[0.04]"
                        }`}
                      >
                        <span className="text-xs font-semibold leading-none">{label}</span>
                        <span
                          className={`text-xs leading-tight hidden sm:block ${active ? "text-accent/80" : "text-text/60"}`}
                        >
                          {desc}
                        </span>
                        {(() => {
                          const racesInMode = modeRacesPlayed[id] ?? 0;
                          const inPlacement = !isGuest && racesInMode < PLACEMENT_RACES_REQUIRED;
                          if (isGuest) {
                            return (
                              <div className="flex flex-col items-center gap-0.5 mt-0.5">
                                <span className="text-xs text-text/40 leading-none">
                                  unranked
                                </span>
                              </div>
                            );
                          }
                          if (inPlacement) {
                            return (
                              <div className="flex flex-col items-center gap-0.5 mt-0.5">
                                <span className="text-xs font-bold text-accent/80 leading-none tabular-nums">
                                  {racesInMode}/{PLACEMENT_RACES_REQUIRED}
                                </span>
                                <span className="text-xs text-accent/60 leading-none">
                                  placements
                                </span>
                              </div>
                            );
                          }
                          if (modeRank) {
                            return (
                              <div className="flex flex-col items-center gap-0.5 mt-0.5">
                                <span
                                  className="text-sm font-black tabular-nums leading-none"
                                  style={{ color: RANK_HEX[modeRank.tier] }}
                                >
                                  {modeElo}
                                </span>
                                <span
                                  className="text-xs font-bold leading-none"
                                  style={{ color: RANK_HEX[modeRank.tier] }}
                                >
                                  {modeRank.label}
                                </span>
                              </div>
                            );
                          }
                          return (
                            <div className="flex flex-col items-center gap-0.5 mt-0.5">
                              <span className="text-[10px] text-muted/40 leading-none">
                                unranked
                              </span>
                            </div>
                          );
                        })()}
                      </button>
                    );
                  })}
                </div>
                  <p className="text-sm text-text/50 mt-2 leading-relaxed text-center">
                    Select one or more modes. One is picked at random each race. Each mode has its own ELO rating.
                  </p>
                </div>

              {/* Find Race button */}
              <button
                onClick={() => onJoin({ privateRace, modeCategories })}
                disabled={!connected || (inParty && !allMembersReady)}
                className="relative w-full rounded-xl bg-accent/[0.08] ring-1 ring-accent/25 text-accent py-4 text-base font-bold tracking-wide glow-accent hover:bg-accent hover:text-bg hover:ring-accent hover:glow-accent-strong transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-accent/[0.08] disabled:hover:text-accent disabled:hover:ring-accent/25"
              >
                {privateRace ? "Start Private Race" : "Find Race"}
              </button>

              {/* Hint row + secondary actions */}
              <div className="relative flex items-center justify-between w-full mt-2">
                <span className="text-xs text-muted/60">
                  {inParty && !allMembersReady ? (
                    "waiting for party to ready up..."
                  ) : (
                    <>
                      press{" "}
                      <kbd className="inline-flex items-center px-1.5 py-0.5 rounded bg-white/[0.05] ring-1 ring-white/[0.08] text-muted/80 text-xs font-medium">Tab</kbd>
                      {" + "}
                      <kbd className="inline-flex items-center px-1.5 py-0.5 rounded bg-white/[0.05] ring-1 ring-white/[0.08] text-muted/80 text-xs font-medium">Enter ↵</kbd>
                    </>
                  )}
                </span>

                {!party && !isGuest && (
                  <div className="flex items-center gap-2">
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

              {/* Party bar + private race toggle */}
              {party && (
                <div className="relative w-full mt-1 flex flex-col items-center gap-2 animate-fade-in">
                  <PartyPanel
                    party={party}
                    error={partyError}
                    onCreateParty={onCreateParty}
                    onInvite={onInviteToParty}
                    onKick={onKickFromParty}
                    onLeave={onLeaveParty}
                  />
                  {isPartyLeader && party.members.length >= 2 && (
                    <label className="flex items-center gap-2 cursor-pointer select-none group">
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
                      <span className="text-xs text-muted/65 group-hover:text-muted transition-colors">
                        Private race
                      </span>
                    </label>
                  )}
                </div>
              )}

            </div>
          )}

          {/* ── Dashboard (signed-in) ──────────────────────────────────── */}
          {xpInfo && !isGuest && (
            <div className="w-full border-t border-white/[0.05] pt-2 shrink-0">
            <div
              className="w-full grid grid-cols-1 sm:grid-cols-2 gap-2 animate-fade-in"
              style={{ animationDelay: "120ms", animationFillMode: "both" }}
            >
              <ChallengesWidget />
              <LevelWidget
                level={xpInfo.level}
                currentXp={xpInfo.currentXp}
                nextLevelXp={xpInfo.nextLevelXp}
                isPro={session!.user.isPro ?? false}
              />
            </div>
            <AdBanner slot="queue_screen" format="horizontal" className="w-full mt-3" />
            </div>
          )}

          {/* ── Guest dashboard ────────────────────────────────────────── */}
          {isGuest && (
            <div
              className="w-full border-t border-white/[0.05] pt-3 flex flex-col gap-3 animate-fade-in"
              style={{ animationDelay: "150ms", animationFillMode: "both" }}
            >
              {/* Feature highlights */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {[
                  {
                    icon: (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                      </svg>
                    ),
                    title: "ELO Matchmaking",
                    desc: "Every race matches you against players at your exact skill level",
                  },
                  {
                    icon: (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M6 9H3.5a2.5 2.5 0 010-5H6" />
                        <path d="M18 9h2.5a2.5 2.5 0 000-5H18" />
                        <path d="M6 4h12v6a6 6 0 01-12 0V4z" />
                        <line x1="12" y1="16" x2="12" y2="20" />
                        <line x1="8" y1="20" x2="16" y2="20" />
                      </svg>
                    ),
                    title: "Ranked Climbing",
                    desc: "3 placement races per mode, then climb from Bronze to Grandmaster",
                  },
                  {
                    icon: (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 3l1.5 4 4 1.5-4 1.5L12 14l-1.5-4-4-1.5 4-1.5L12 3z" />
                        <path d="M5 3v4M3 5h4" />
                        <path d="M19 17v4M17 19h4" />
                      </svg>
                    ),
                    title: "Cosmetics & XP",
                    desc: "Unlock titles, cursors, name effects, and typing themes as you level up",
                  },
                ].map((item) => (
                  <div
                    key={item.title}
                    className="rounded-xl bg-surface/40 ring-1 ring-white/[0.04] px-4 py-3.5 flex flex-col gap-2"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-accent/60">{item.icon}</span>
                      <span className="text-sm font-bold text-text/90">{item.title}</span>
                    </div>
                    <p className="text-sm text-text/50 leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>

              {/* Rank tier strip */}
              <div className="rounded-xl bg-surface/30 ring-1 ring-white/[0.04] px-4 py-3">
                <div className="text-sm font-bold text-text/50 uppercase tracking-wider mb-2.5">7 Ranks to climb</div>
                <div className="flex items-center gap-1.5">
                  {([
                    { tier: "bronze" as const, label: "Bronze", elo: "0" },
                    { tier: "silver" as const, label: "Silver", elo: "1000" },
                    { tier: "gold" as const, label: "Gold", elo: "1300" },
                    { tier: "platinum" as const, label: "Plat", elo: "1600" },
                    { tier: "diamond" as const, label: "Diamond", elo: "1900" },
                    { tier: "master" as const, label: "Master", elo: "2200" },
                    { tier: "grandmaster" as const, label: "GM", elo: "2500" },
                  ]).map((r) => (
                    <div
                      key={r.tier}
                      className="flex-1 flex flex-col items-center gap-1 py-1.5 rounded-lg"
                      style={{ background: `${RANK_HEX[r.tier]}08` }}
                    >
                      <span
                        className="text-xs font-black leading-none"
                        style={{ color: RANK_HEX[r.tier] }}
                      >
                        {r.label}
                      </span>
                      <span className="text-xs text-text/40 tabular-nums leading-none">{r.elo}+</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Solo practice link */}
              <div className="flex items-center justify-center gap-4 pt-1">
                <Link
                  href="/solo"
                  className="text-sm text-text/45 hover:text-accent/70 transition-colors"
                >
                  or try Solo Practice →
                </Link>
              </div>
            </div>
          )}
        </>
    </div>
  );
}
