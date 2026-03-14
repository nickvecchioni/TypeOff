"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  PRO_PRICE,
  COSMETIC_REWARDS,
  BADGE_EMOJIS,
  TITLE_TEXTS,
  NAME_COLORS,
  NAME_EFFECT_CLASSES,
  TYPING_THEMES,
  CURSOR_STYLES,
  getXpLevel,
} from "@typeoff/shared";

const PRO_REWARD_COUNT = COSMETIC_REWARDS.filter((r) => r.proOnly).length;
const TOTAL_REWARD_COUNT = COSMETIC_REWARDS.length;
const FREE_REWARD_COUNT = TOTAL_REWARD_COUNT - PRO_REWARD_COUNT;

const COMPARISON_ROWS: { feature: string; desc?: string; free: boolean | string; pro: boolean | string }[] = [
  { feature: "Ranked Racing",       desc: "ELO-rated matches with skill-based matchmaking",            free: true,                              pro: true },
  { feature: "Adaptive Practice",   desc: "Targets your weakest keys & bigrams",                      free: true,                              pro: true },
  { feature: "Advanced Analytics",  desc: "Per-key heatmaps, bigram breakdown, WPM trends",           free: false,                             pro: true },
  { feature: "Race Replays",        desc: "Rewatch any race keystroke by keystroke",                   free: "Last 3",                          pro: "Unlimited" },
  { feature: "Race History",        desc: "Browse, filter, sort, and export past results",             free: "Last 10",                         pro: "Unlimited" },
  { feature: "Featured Race",       desc: "Pin your best race on your profile",                        free: false,                             pro: true },
  { feature: "XP Multiplier",       desc: "Earn XP faster to unlock cosmetics sooner",                 free: "1×",                              pro: "1.5×" },
  { feature: "Level Rewards",       desc: "Exclusive themes, cursors, effects, and more",              free: `${FREE_REWARD_COUNT} cosmetics`,  pro: `All ${TOTAL_REWARD_COUNT}` },
  { feature: "Pro Badge & Effects", desc: "Stand out with exclusive name effects and Pro badge",       free: false,                             pro: true },
];

const TEASER_IDS = [
  "pro_badge_diamond",
  "pro_title_typemaster",
  "pro_color_aurora",
  "pro_theme_obsidian",
  "pro_cursor_void",
];
const TEASER_REWARDS = COSMETIC_REWARDS.filter((r) => TEASER_IDS.includes(r.id));

const FEATURES = [
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
    title: "Advanced Analytics",
    description: "Per-key heatmaps, bigram accuracy, WPM trends, and personalized practice insights to sharpen your weaknesses.",
    amber: true,
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ),
    title: "Pro Cosmetics",
    description: `${PRO_REWARD_COUNT} exclusive rewards in the level track: badges, name effects, themes, cursors, and more. Yours forever.`,
    amber: false,
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 8v4l3 3" /><circle cx="12" cy="12" r="10" />
      </svg>
    ),
    title: "Full History",
    description: "Unlimited race history with sorting, filtering, and CSV/JSON export. Free users see their last 10.",
    amber: false,
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="13 17 18 12 13 7" /><polyline points="6 17 11 12 6 7" />
      </svg>
    ),
    title: "1.5x XP",
    description: "Earn XP 50% faster on every race and solo session. Unlock cosmetics sooner and climb the level track.",
    amber: false,
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
      </svg>
    ),
    title: "Pro Badge & Effects",
    description: "Stand out in races with a Pro badge, exclusive name effects, and animated styling that free users can't get.",
    amber: false,
  },
] as const;

/* ── Main Page ─────────────────────────────────────────── */

export default function ProPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const isPro = session?.user?.isPro ?? false;

  if (status === "loading") {
    return (
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden px-4 sm:px-5 py-4">
        <div className="flex-1 min-h-0 max-w-5xl mx-auto w-full space-y-3">
          <div className="h-6 w-40 rounded bg-surface/40 animate-pulse" />
          <div className="h-4 w-64 rounded bg-surface/30 animate-pulse" />
          <div className="h-32 rounded-xl bg-surface/40 animate-pulse" />
        </div>
      </main>
    );
  }

  if (status === "unauthenticated") {
    router.push("/signin");
    return null;
  }

  return (
    <main className="flex-1 flex flex-col min-h-0 overflow-y-auto px-4 sm:px-6 py-6">
      <div className="max-w-5xl mx-auto w-full">
        {isPro ? (
          <SubscriberView session={session} />
        ) : (
          <div className="flex flex-col gap-8 pb-8">

            {/* ── Hero ── */}
            <div className="relative animate-fade-in">
              <div className="relative text-center pt-8 pb-6 px-4">
                <div className="inline-flex items-center text-xs font-bold leading-none text-accent/70 ring-1 ring-accent/20 px-4 py-2 rounded-full uppercase tracking-widest mb-5">
                  TypeOff Pro
                </div>

                <h1 className="text-4xl sm:text-5xl font-black tracking-tight leading-tight mb-4">
                  <span className="text-text">Type fast.</span>
                  <br />
                  <span className="text-accent">Look even faster.</span>
                </h1>

                <p className="text-sm text-muted/65 max-w-md mx-auto leading-relaxed">
                  Pro unlocks advanced analytics, {PRO_REWARD_COUNT} exclusive cosmetics,
                  1.5x XP, and unlimited history.
                  <br />
                  One-time purchase, yours forever.
                </p>

                {/* Stat highlights */}
                <div className="flex justify-center gap-10 mt-8">
                  {[
                    { value: "∞",                        label: "History"       },
                    { value: "1.5×",                     label: "XP Multiplier" },
                    { value: String(PRO_REWARD_COUNT),   label: "Pro Cosmetics" },
                    { value: `$${PRO_PRICE}`,            label: "One-Time"      },
                  ].map((s) => (
                    <div key={s.label} className="text-center">
                      <div className="text-2xl font-black tabular-nums text-accent flex items-center justify-center h-9">
                        {s.value === "∞" ? (
                          <svg width="28" height="20" viewBox="0 0 24 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 8C10.5 5.5 8.5 3.5 6 3.5C3.24 3.5 1 5.74 1 8.5C1 11.26 3.24 13.5 6 13.5C8.5 13.5 10.5 11.5 12 8.5V8ZM12 8C13.5 5.5 15.5 3.5 18 3.5C20.76 3.5 23 5.74 23 8.5C23 11.26 20.76 13.5 18 13.5C15.5 13.5 13.5 11.5 12 8.5V8Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        ) : s.value}
                      </div>
                      <div className="text-xs text-muted/55 uppercase tracking-wider mt-0.5">
                        {s.label}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Features ── */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 animate-slide-up">
              {FEATURES.map((f) => (
                <div
                  key={f.title}
                  className={`rounded-xl p-4 ring-1 transition-all group ${
                    "amber" in f && f.amber
                      ? "bg-accent/[0.04] ring-accent/15 hover:bg-accent/[0.07] hover:ring-accent/25"
                      : "bg-surface/40 ring-white/[0.05] hover:bg-surface/60 hover:ring-white/[0.08]"
                  }`}
                >
                  <div
                    className={`mb-3 transition-colors ${
                      "amber" in f && f.amber
                        ? "text-accent/60 group-hover:text-accent/90"
                        : "text-muted/65 group-hover:text-muted/55"
                    }`}
                  >
                    {f.icon}
                  </div>
                  <p className="text-sm font-bold text-text mb-1.5">{f.title}</p>
                  <p className="text-xs text-muted/60 leading-relaxed">{f.description}</p>
                </div>
              ))}
            </div>

            {/* ── Cosmetics showcase ── */}
            <div className="animate-slide-up" style={{ animationDelay: "40ms" }}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-[11px] font-bold text-muted/65 uppercase tracking-widest">
                  {PRO_REWARD_COUNT} Pro Cosmetics
                </p>
                <p className="text-[11px] text-muted/50">yours forever</p>
              </div>
              <div className="rounded-xl ring-1 ring-accent/10 overflow-hidden bg-[#0c0c12]" style={{ boxShadow: "0 0 60px rgba(77,158,255,0.04)" }}>
                {/* Live name preview */}
                <NamePreview username={session?.user?.username ?? session?.user?.name ?? "TypeOff"} />
                {/* Teaser items grid */}
                <div className="grid grid-cols-5 border-t border-white/[0.06]">
                  {TEASER_REWARDS.map((item, i) => (
                    <div
                      key={item.id}
                      className={`flex flex-col items-center justify-center py-6 gap-2.5 group hover:bg-accent/[0.05] transition-all ${
                        i < TEASER_REWARDS.length - 1 ? "border-r border-white/[0.04]" : ""
                      }`}
                    >
                      <div className="group-hover:scale-110 transition-transform duration-200">
                        <TeaserVisual item={item} />
                      </div>
                      <div className="text-center">
                        <span className="block text-xs text-text/70 font-medium leading-tight">
                          {item.name}
                        </span>
                        <span className="block text-[10px] text-accent/60 uppercase tracking-wider mt-0.5">
                          {item.type === "nameColor" ? "color" : item.type === "cursorStyle" ? "cursor" : item.type === "typingTheme" ? "theme" : item.type}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Comparison table ── */}
            <div className="animate-slide-up" style={{ animationDelay: "60ms" }}>
              <p className="text-xs font-bold text-muted/65 uppercase tracking-widest mb-4">
                Free vs Pro
              </p>
              <div className="rounded-xl ring-1 ring-white/[0.06] overflow-hidden">
                {/* Header */}
                <div className="grid grid-cols-[1fr_7rem_7rem] text-xs font-bold uppercase tracking-wider border-b border-white/[0.08]">
                  <span className="px-5 py-3.5 bg-surface/30" />
                  <span className="px-3 py-3.5 text-center text-muted/50 bg-surface/30">Free</span>
                  <span className="px-3 py-3.5 text-center text-accent bg-accent/[0.06]">Pro</span>
                </div>
                {/* Rows */}
                {COMPARISON_ROWS.map((row, i) => {
                  const isProExclusive = row.free === false;
                  return (
                    <div
                      key={row.feature}
                      className={`grid grid-cols-[1fr_7rem_7rem] ${
                        i < COMPARISON_ROWS.length - 1 ? "border-b border-white/[0.04]" : ""
                      }`}
                    >
                      <div className="px-5 py-3.5 bg-surface/30">
                        <span className={`text-[13px] block ${isProExclusive ? "text-text/80 font-medium" : "text-text/50"}`}>
                          {row.feature}
                        </span>
                        {row.desc && (
                          <span className="text-xs text-muted/60 leading-snug block mt-0.5">
                            {row.desc}
                          </span>
                        )}
                      </div>
                      <span className="px-3 py-3.5 text-center text-[13px] bg-surface/30 flex items-center justify-center">
                        {row.free === true ? (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted/55">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        ) : row.free === false ? (
                          <span className="text-muted/50">-</span>
                        ) : (
                          <span className="text-muted/45 text-[12px]">{row.free}</span>
                        )}
                      </span>
                      <span className="px-3 py-3.5 text-center text-[13px] bg-accent/[0.06] flex items-center justify-center">
                        {row.pro === true ? (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-accent drop-shadow-[0_0_6px_rgba(77,158,255,0.5)]">
                            <polyline points="20 6 9 17 4 12" stroke="currentColor" />
                          </svg>
                        ) : (
                          <span className="text-accent font-bold text-[12px]">{row.pro}</span>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── Pricing ── */}
            <div className="animate-slide-up flex flex-col items-center" style={{ animationDelay: "80ms" }}>
              <div
                className="relative rounded-xl px-8 py-6 ring-1 ring-accent/25 bg-accent/[0.04] w-full max-w-sm text-center"
                style={{ boxShadow: "0 0 40px rgba(77,158,255,0.08), inset 0 1px 0 rgba(77,158,255,0.12)" }}
              >
                <div className="text-xs font-bold text-accent/60 uppercase tracking-wider mb-3">
                  One-Time Purchase
                </div>
                <div className="text-4xl font-black text-text tabular-nums leading-none mb-1">
                  ${PRO_PRICE.toFixed(2)}
                </div>
                <div className="text-xs text-accent/60 mb-6">
                  Pay once, keep forever
                </div>
                <button
                  onClick={() => router.push("/pro/checkout")}
                  className="w-full rounded-lg py-3 text-sm font-black tracking-wide overflow-hidden transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                  style={{
                    background: "linear-gradient(135deg, #3d7ed4 0%, #5a9de6 50%, #3d7ed4 100%)",
                    color: "rgba(255,255,255,0.95)",
                    boxShadow: "0 2px 16px rgba(77,158,255,0.2)",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.boxShadow =
                      "0 4px 24px rgba(77,158,255,0.4)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.boxShadow =
                      "0 2px 16px rgba(77,158,255,0.2)";
                  }}
                >
                  Get Pro →
                </button>
              </div>
              <p className="text-center text-xs text-muted/55 mt-3 leading-relaxed">
                One-time purchase. No subscription. Yours forever.
              </p>
            </div>

          </div>
        )}
      </div>
    </main>
  );
}

/* ── Subscriber View ───────────────────────────────────── */

const PRO_PERKS = [
  { label: "Analytics", detail: "Full insights" },
  { label: "1.5× XP", detail: "Every race & solo" },
  { label: "Pro Cosmetics", detail: "Exclusive rewards" },
  { label: "Pro Badge", detail: "Stand out in races" },
  { label: "Full History", detail: "Unlimited + export" },
  { label: "Name Effects", detail: "Animated styling" },
];

function SubscriberView({
  session,
}: {
  session: ReturnType<typeof useSession>["data"];
}) {
  const totalXp = session?.user?.totalXp ?? 0;
  const { level, currentXp, nextLevelXp } = getXpLevel(totalXp);
  const xpPct = (currentXp / nextLevelXp) * 100;
  const username = session?.user?.username ?? session?.user?.name ?? "TypeOff";
  const trackRef = useRef<HTMLDivElement>(null);

  const unlockedProCount = COSMETIC_REWARDS.filter((r) => r.proOnly && r.level <= level).length;
  const totalProCount = COSMETIC_REWARDS.filter((r) => r.proOnly).length;
  const nextProReward = COSMETIC_REWARDS.find((r) => r.proOnly && r.level > level);

  // Window of rewards around the current level for the track
  const currentIdx = COSMETIC_REWARDS.reduce((acc, r, i) => (r.level <= level ? i : acc), 0);
  const trackStart = Math.max(0, currentIdx - 5);
  const trackEnd = Math.min(COSMETIC_REWARDS.length, trackStart + 15);
  const trackRewards = COSMETIC_REWARDS.slice(trackStart, trackEnd);

  // Auto-scroll track to center on the current level
  useEffect(() => {
    if (!trackRef.current) return;
    const el = trackRef.current.querySelector('[data-current="true"]') as HTMLElement | null;
    if (el) {
      const container = trackRef.current;
      container.scrollLeft = el.offsetLeft - container.clientWidth / 2 + el.clientWidth / 2;
    }
  }, []);

  return (
    <div className="space-y-4 pb-8">
      {/* ── Membership Card ── */}
      <div className="relative animate-fade-in">
        {/* Gradient accent border */}
        <div
          className="absolute -inset-px rounded-2xl"
          style={{
            background:
              "linear-gradient(135deg, rgba(77,158,255,0.35) 0%, rgba(77,158,255,0.06) 40%, rgba(77,158,255,0.06) 60%, rgba(77,158,255,0.3) 100%)",
          }}
        />
        <div className="relative rounded-2xl bg-[#0e0e16] overflow-hidden">
          {/* Ambient glow */}
          <div
            className="absolute top-0 right-0 w-72 h-72 rounded-full blur-[80px] -translate-y-1/3 translate-x-1/4 pointer-events-none"
            style={{ background: "radial-gradient(circle, rgba(77,158,255,0.07) 0%, transparent 70%)" }}
          />

          <div className="relative px-6 py-5">
            {/* Top row */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2.5">
                <span
                  className="text-lg"
                  style={{ filter: "drop-shadow(0 0 10px rgba(77,158,255,0.6))" }}
                >
                  ⭐
                </span>
                <span className="text-[11px] font-black text-accent uppercase tracking-[0.2em]">
                  TypeOff Pro
                </span>
              </div>
              <span className="text-[11px] text-correct/60 font-medium px-3 py-1.5 rounded-lg ring-1 ring-correct/15 bg-correct/[0.04]">
                Lifetime Pro
              </span>
            </div>

            {/* Level + username */}
            <div className="flex items-end gap-4 mb-5">
              <div
                className="text-[3.5rem] font-black tabular-nums leading-none tracking-tighter"
                style={{
                  background: "linear-gradient(180deg, #e8e8ed 30%, #4d9eff 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                {level}
              </div>
              <div className="pb-2 space-y-0.5">
                <div className="text-[10px] text-muted/60 uppercase tracking-widest">Level</div>
                <div className="text-sm font-bold text-text/80">{username}</div>
              </div>
            </div>

            {/* XP bar */}
            <div className="mb-4">
              <div className="flex items-baseline justify-between mb-1.5">
                <span className="text-[11px] font-bold text-accent/70 tabular-nums">
                  {currentXp.toLocaleString()}{" "}
                  <span className="text-muted/55 font-normal">
                    / {nextLevelXp.toLocaleString()} XP
                  </span>
                </span>
                <span className="text-[11px] text-muted/55 tabular-nums">
                  {(nextLevelXp - currentXp).toLocaleString()} to next
                </span>
              </div>
              <div className="h-2 rounded-full bg-white/[0.04] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-1000 ease-out"
                  style={{
                    width: `${Math.min(100, Math.round(xpPct))}%`,
                    background: "linear-gradient(90deg, #2563eb, #4d9eff, #60a5fa)",
                    boxShadow: "0 0 16px rgba(77,158,255,0.4)",
                  }}
                />
              </div>
            </div>

            {/* Active status strip */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-correct animate-pulse" />
                <span className="text-[11px] text-correct/70 font-medium">1.5× XP</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-correct animate-pulse" />
                <span className="text-[11px] text-correct/70 font-medium">Analytics</span>
              </div>
              <span className="text-white/[0.08]">|</span>
              <span className="text-[11px] text-muted/60 tabular-nums">
                {unlockedProCount}/{totalProCount} Pro cosmetics unlocked
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Reward Track ── */}
      <div className="animate-slide-up" style={{ animationDelay: "30ms" }}>
        <div className="flex items-center justify-between mb-2.5">
          <p className="text-[11px] font-bold text-muted/50 uppercase tracking-widest">
            Reward Track
          </p>
          {nextProReward && (
            <p className="text-[11px] text-muted/55">
              Next Pro:{" "}
              <span className="text-accent/50 font-medium">{nextProReward.name}</span>
              <span className="text-muted/55"> · Level {nextProReward.level}</span>
            </p>
          )}
        </div>
        <div className="relative rounded-xl ring-1 ring-white/[0.06] bg-surface/30 overflow-hidden">
          {/* Edge fades */}
          <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-surface/90 to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-surface/90 to-transparent z-10 pointer-events-none" />

          <div
            ref={trackRef}
            className="flex items-center px-10 py-5 overflow-x-auto"
            style={{ scrollbarWidth: "none" }}
          >
            {trackRewards.map((item, i) => {
              const unlocked = item.level <= level;
              const isCurrent = item.level === level;
              return (
                <div
                  key={item.id}
                  className="flex items-center shrink-0"
                  data-current={isCurrent ? "true" : undefined}
                >
                  {/* Connector */}
                  {i > 0 && (
                    <div
                      className={`w-5 sm:w-8 h-[2px] shrink-0 ${
                        unlocked ? "bg-accent/25" : "bg-white/[0.05]"
                      }`}
                    />
                  )}
                  {/* Node */}
                  <div className="relative group">
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-300 ${
                        isCurrent
                          ? "bg-accent/[0.12] ring-2 ring-accent/40 scale-110"
                          : unlocked
                            ? "bg-accent/[0.06] ring-1 ring-accent/15"
                            : "bg-white/[0.02] ring-1 ring-white/[0.05]"
                      }`}
                      style={
                        isCurrent
                          ? { boxShadow: "0 0 20px rgba(77,158,255,0.15)" }
                          : undefined
                      }
                    >
                      <div
                        className={`transition-opacity ${unlocked ? "opacity-100" : "opacity-25"}`}
                      >
                        <TrackRewardIcon item={item} />
                      </div>
                    </div>
                    {/* Level number */}
                    <div
                      className={`text-center mt-1.5 text-[9px] tabular-nums ${
                        isCurrent
                          ? "text-accent font-bold"
                          : unlocked
                            ? "text-muted/60"
                            : "text-muted/50"
                      }`}
                    >
                      {item.level}
                    </div>
                    {/* PRO tag */}
                    {item.proOnly && (
                      <span
                        className={`absolute -top-1.5 -right-1.5 text-[6px] font-black px-[4px] py-[1px] rounded-sm uppercase ${
                          unlocked
                            ? "text-accent bg-accent/[0.12]"
                            : "text-muted/50 bg-white/[0.03]"
                        }`}
                      >
                        Pro
                      </span>
                    )}
                    {/* Hover tooltip */}
                    <div className="absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
                      <div className="bg-[#1c1c28] text-[10px] text-text/80 px-2.5 py-1 rounded-lg shadow-xl ring-1 ring-white/[0.1]">
                        {item.name}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Pro Perks ── */}
      <div className="animate-slide-up" style={{ animationDelay: "50ms" }}>
        <p className="text-[11px] font-bold text-muted/50 uppercase tracking-widest mb-2.5">
          Your Pro Perks
        </p>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {PRO_PERKS.map((perk) => (
            <div
              key={perk.label}
              className="rounded-xl bg-surface/30 ring-1 ring-white/[0.04] px-3 py-2.5 hover:ring-accent/15 hover:bg-surface/50 transition-all group flex items-start gap-2"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-accent/40 group-hover:bg-accent/60 mt-[5px] shrink-0 transition-colors" />
              <div>
                <div className="text-[11px] font-bold text-text/65 leading-tight group-hover:text-text/85 transition-colors">
                  {perk.label}
                </div>
                <div className="text-[9px] text-muted/55 mt-0.5">{perk.detail}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Quick Links ── */}
      <div
        className="grid grid-cols-2 sm:grid-cols-4 gap-2 animate-slide-up"
        style={{ animationDelay: "70ms" }}
      >
        {[
          { href: "/analytics", title: "Analytics", desc: "Performance insights" },
          { href: "/history", title: "Race History", desc: "Full archive" },
          { href: `/profile/${username}`, title: "Profile", desc: "Your Pro profile" },
          { href: "/cosmetics", title: "Cosmetics", desc: "Browse & equip" },
        ].map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="rounded-xl bg-surface/30 ring-1 ring-white/[0.04] px-4 py-3.5 hover:ring-accent/20 hover:bg-surface/50 transition-all group"
          >
            <div className="text-sm font-bold text-text/75 group-hover:text-accent transition-colors">
              {link.title}
            </div>
            <p className="text-[11px] text-muted/60 mt-0.5">{link.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

/* ── Track Reward Icon ─────────────────────────────────── */

function TrackRewardIcon({ item }: { item: (typeof COSMETIC_REWARDS)[number] }) {
  switch (item.type) {
    case "badge":
      return <span className="text-sm leading-none">{BADGE_EMOJIS[item.id] ?? "✨"}</span>;
    case "nameColor": {
      const hex = NAME_COLORS[item.id] ?? item.value;
      return (
        <span
          className="block w-4 h-4 rounded-full ring-1 ring-white/10"
          style={{ backgroundColor: hex }}
        />
      );
    }
    case "typingTheme": {
      const def = TYPING_THEMES[item.id];
      if (!def) return <span className="text-[10px]">🎨</span>;
      return (
        <span className="flex gap-[2px]">
          {def.palette.map((c, i) => (
            <span
              key={i}
              className="w-[6px] h-[6px] rounded-full"
              style={{ backgroundColor: c }}
            />
          ))}
        </span>
      );
    }
    case "cursorStyle": {
      const def = CURSOR_STYLES[item.id];
      if (!def) return <span className="text-[10px]">▎</span>;
      return (
        <span
          className="block rounded-sm"
          style={{
            width: 2,
            height: 14,
            backgroundColor: def.color,
            boxShadow: def.glowColor ? `0 0 6px ${def.glowColor}` : undefined,
          }}
        />
      );
    }
    case "title":
      return (
        <span className="text-[9px] font-black text-accent/60 uppercase tracking-wide">T</span>
      );
    case "nameEffect":
      return (
        <span className="text-[8px] font-black text-purple-400/60 uppercase tracking-wide">
          FX
        </span>
      );
    case "profileBorder":
      return <span className="block w-4 h-4 rounded border-2 border-accent/30" />;
    default:
      return <span className="text-xs">✦</span>;
  }
}

/* ── Showcase ──────────────────────────────────────────── */

const SHOWCASE_STATES = [
  { effectId: "pro_effect_fire",  badgeId: "pro_badge_diamond",  titleId: "pro_title_typemaster", label: "Fire" },
  { effectId: "pro_effect_ice",   badgeId: "pro_badge_comet",    titleId: "pro_title_velocity",   label: "Ice" },
  { effectId: "s2_effect_storm",  badgeId: "pro_badge_fire_god", titleId: "s2_title_ascendant",   label: "Storm" },
  { effectId: "s2_effect_void",   badgeId: "pro_badge_ghost",    titleId: "s2_title_immortal",    label: "Void" },
];

function NamePreview({ username }: { username: string }) {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setIdx((i) => (i + 1) % SHOWCASE_STATES.length), 3000);
    return () => clearInterval(id);
  }, []);

  const state = SHOWCASE_STATES[idx];
  const effectClass = NAME_EFFECT_CLASSES[state.effectId] ?? "";
  const badge = BADGE_EMOJIS[state.badgeId] ?? "";
  const title = TITLE_TEXTS[state.titleId] ?? "";

  return (
    <div className="py-6 px-4 flex flex-col items-center gap-1.5">
      <p className="text-[10px] font-bold text-muted/55 uppercase tracking-widest mb-1">preview</p>
      <div className="flex items-center gap-2 text-base font-bold">
        <span>{badge}</span>
        <span className={effectClass}>{username}</span>
      </div>
      {title && <span className="text-xs text-muted/50">{title}</span>}
      <div className="flex items-center gap-1.5 mt-2">
        {SHOWCASE_STATES.map((s, i) => (
          <button
            key={s.label}
            onClick={() => setIdx(i)}
            className={`h-1 rounded-full transition-all duration-300 ${
              i === idx ? "w-4 bg-accent" : "w-1.5 bg-white/20 hover:bg-white/35"
            }`}
          />
        ))}
      </div>
      <p className="text-[11px] text-accent/45 uppercase tracking-wider mt-0.5">
        {state.label} · Pro Only
      </p>
    </div>
  );
}

/* ── Teaser Visual ─────────────────────────────────────── */

function TeaserVisual({ item }: { item: (typeof COSMETIC_REWARDS)[number] }) {
  switch (item.type) {
    case "badge":
      return <span className="text-xl">{BADGE_EMOJIS[item.id] ?? item.value}</span>;
    case "title":
      return (
        <span className="text-xs text-accent/70 font-medium">
          {TITLE_TEXTS[item.id] ?? item.value}
        </span>
      );
    case "nameColor": {
      const hex = NAME_COLORS[item.id] ?? item.value;
      return (
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full ring-1 ring-white/10" style={{ backgroundColor: hex }} />
          <span className="text-xs font-bold" style={{ color: hex }}>Aa</span>
        </div>
      );
    }
    case "nameEffect": {
      const className = NAME_EFFECT_CLASSES[item.id] ?? "";
      return <span className={`text-sm font-bold ${className}`}>TypeOff</span>;
    }
    case "typingTheme": {
      const def = TYPING_THEMES[item.id];
      if (!def) return null;
      return (
        <span className="flex gap-0.5">
          {def.palette.map((c, i) => (
            <span key={i} className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c }} />
          ))}
        </span>
      );
    }
    case "cursorStyle": {
      const def = CURSOR_STYLES[item.id];
      if (!def) return null;
      return (
        <span
          className="rounded-sm"
          style={{
            width: 2,
            height: 18,
            backgroundColor: def.color,
            boxShadow: def.glowColor ? `0 0 10px ${def.glowColor}` : undefined,
          }}
        />
      );
    }
    default:
      return <span className="text-base">✨</span>;
  }
}
