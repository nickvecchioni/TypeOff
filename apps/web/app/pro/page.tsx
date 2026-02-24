"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  PRO_MONTHLY_PRICE,
  PRO_YEARLY_PRICE,
  PRO_LIFETIME_PRICE,
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

const COMPARISON_ROWS = [
  { feature: "Ranked Racing",       free: true,                              pro: true },
  { feature: "Leaderboard",         free: true,                              pro: true },
  { feature: "Level Rewards",       free: `${FREE_REWARD_COUNT} cosmetics`,  pro: `All ${TOTAL_REWARD_COUNT}` },
  { feature: "XP Multiplier",       free: "1×",                              pro: "1.5×" },
  { feature: "Race History",        free: "Last 20",                         pro: "Full Archive" },
  { feature: "Advanced Analytics",  free: false,                             pro: true },
  { feature: "Race Replays",        free: false,                             pro: true },
  { feature: "Custom Text Mode",    free: false,                             pro: true },
  { feature: "Focus Drill",         free: false,                             pro: true },
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
        <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
      </svg>
    ),
    title: "Race History",
    description: "Every race preserved forever. Filter by mode, date, opponent, and performance.",
    amber: false,
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
    title: "Analytics",
    description: "Bigram heatmaps, ELO trend, win rate, placement stats, consistency scores, and full WPM history.",
    amber: false,
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="5 3 19 12 5 21 5 3" />
      </svg>
    ),
    title: "Race Replays",
    description: "Watch any race back keystroke by keystroke. Study and share your best runs.",
    amber: false,
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ),
    title: "Pro Cosmetics",
    description: `${PRO_REWARD_COUNT} exclusive rewards in the level track — yours to keep even if you cancel.`,
    amber: true,
  },
] as const;

/* ── Main Page ─────────────────────────────────────────── */

export default function ProPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const isPro = session?.user?.isPro ?? false;

  const [portalLoading, setPortalLoading] = useState(false);

  async function handleManageSubscription() {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/pro/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } finally {
      setPortalLoading(false);
    }
  }

  if (status === "loading") {
    return (
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden px-4 sm:px-5 py-4">
        <div className="flex-1 min-h-0 max-w-[960px] mx-auto w-full space-y-3">
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
      <div className="max-w-[960px] mx-auto w-full">
        {isPro ? (
          <SubscriberView
            session={session}
            portalLoading={portalLoading}
            onManage={handleManageSubscription}
          />
        ) : (
          <div className="flex flex-col gap-8 pb-8">

            {/* ── Hero ── */}
            <div className="relative animate-fade-in">
              <div className="relative text-center pt-8 pb-6 px-4">
                <div className="inline-flex items-center text-[11px] font-bold leading-none text-accent/70 ring-1 ring-accent/20 px-4 py-2 rounded-full uppercase tracking-widest mb-5">
                  TypeOff Pro
                </div>

                <h1 className="text-4xl sm:text-5xl font-black tracking-tight leading-tight mb-4">
                  <span className="text-text">Type at the top.</span>
                  <br />
                  <span className="text-accent">Look the part.</span>
                </h1>

                <p className="text-sm text-muted/65 max-w-md mx-auto leading-relaxed">
                  1.5× XP on every race. {PRO_REWARD_COUNT} exclusive cosmetics. Full archive,
                  advanced analytics, and keystroke replays.
                </p>

                {/* Stat highlights */}
                <div className="flex justify-center gap-10 mt-8">
                  {[
                    { value: "1.5×",                     label: "XP Multiplier" },
                    { value: String(PRO_REWARD_COUNT),   label: "Pro Cosmetics" },
                    { value: "∞",                        label: "Race History"  },
                  ].map((s) => (
                    <div key={s.label} className="text-center">
                      <div className="text-2xl font-black tabular-nums text-accent flex items-center justify-center h-9">
                        {s.value === "∞" ? (
                          <svg width="36" height="20" viewBox="0 0 36 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M18 10C16 6.5 13 4 9.5 4C5.36 4 2 6.91 2 10C2 13.09 5.36 16 9.5 16C13 16 16 13.5 18 10ZM18 10C20 6.5 23 4 26.5 4C30.64 4 34 6.91 34 10C34 13.09 30.64 16 26.5 16C23 16 20 13.5 18 10Z" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                          </svg>
                        ) : s.value}
                      </div>
                      <div className="text-[10px] text-muted/55 uppercase tracking-wider mt-0.5">
                        {s.label}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Features ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 animate-slide-up">
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
                  <p className="text-[11px] text-muted/60 leading-relaxed">{f.description}</p>
                </div>
              ))}
            </div>

            {/* ── Pricing ── */}
            <div className="animate-slide-up" style={{ animationDelay: "40ms" }}>
              <p className="text-[9px] font-bold text-muted/65 uppercase tracking-widest mb-4 text-center">
                Choose your plan
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">

                {/* Monthly */}
                <div className="rounded-xl px-5 py-5 ring-1 ring-white/[0.06] bg-surface/30 flex flex-col">
                  <div className="text-[10px] font-bold text-muted/60 uppercase tracking-wider mb-3">
                    Monthly
                  </div>
                  <div className="text-3xl font-black text-text tabular-nums leading-none mb-0.5">
                    ${PRO_MONTHLY_PRICE.toFixed(2)}
                    <span className="text-sm font-normal text-muted/60">/mo</span>
                  </div>
                  <div className="text-[10px] text-muted/45 mb-6">Billed monthly, cancel anytime</div>
                  <button
                    onClick={() => router.push("/pro/checkout?plan=monthly")}
                    className="mt-auto w-full rounded-lg py-2.5 text-[13px] font-bold ring-1 ring-white/[0.10] bg-white/[0.04] text-text/70 hover:ring-accent/30 hover:bg-accent/[0.05] hover:text-accent/80 transition-all duration-200 hover:scale-[1.01] active:scale-[0.99]"
                  >
                    Get Pro
                  </button>
                </div>

                {/* Yearly — highlighted */}
                <div
                  className="relative rounded-xl px-5 py-5 ring-1 ring-accent/25 bg-accent/[0.04] flex flex-col"
                  style={{ boxShadow: "0 0 40px rgba(77,158,255,0.08), inset 0 1px 0 rgba(77,158,255,0.12)" }}
                >
                  <div className="absolute -top-3 left-0 right-0 flex justify-center">
                    <span className="text-[9px] font-black bg-accent text-white px-3 py-1 rounded-full uppercase tracking-wider shadow-[0_2px_12px_rgba(77,158,255,0.5)]">
                      Save 33%
                    </span>
                  </div>
                  <div className="text-[10px] font-bold text-accent/60 uppercase tracking-wider mb-3">
                    Yearly
                  </div>
                  <div className="text-3xl font-black text-text tabular-nums leading-none mb-0.5">
                    ${PRO_YEARLY_PRICE.toFixed(2)}
                    <span className="text-sm font-normal text-muted/60">/yr</span>
                  </div>
                  <div className="text-[10px] text-accent/40 mb-6">
                    ${(PRO_YEARLY_PRICE / 12).toFixed(2)}/mo billed annually
                  </div>
                  <button
                    onClick={() => router.push("/pro/checkout?plan=yearly")}
                    className="mt-auto relative w-full rounded-lg py-2.5 text-[13px] font-black tracking-wide overflow-hidden transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                    style={{
                      background: "linear-gradient(135deg, #4d9eff 0%, #80bbff 50%, #4d9eff 100%)",
                      color: "#ffffff",
                      boxShadow: "0 2px 20px rgba(77,158,255,0.35)",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.boxShadow =
                        "0 4px 32px rgba(77,158,255,0.55)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.boxShadow =
                        "0 2px 20px rgba(77,158,255,0.35)";
                    }}
                  >
                    Get Pro →
                  </button>
                </div>

                {/* Lifetime */}
                <div className="rounded-xl px-5 py-5 ring-1 ring-white/[0.06] bg-surface/30 flex flex-col">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-[10px] font-bold text-muted/60 uppercase tracking-wider">
                      Lifetime
                    </div>
                    <span className="text-[9px] font-bold text-muted/55 ring-1 ring-white/[0.08] px-2 py-0.5 rounded-full uppercase tracking-wider">
                      Forever
                    </span>
                  </div>
                  <div className="text-3xl font-black text-text tabular-nums leading-none mb-0.5">
                    ${PRO_LIFETIME_PRICE.toFixed(2)}
                    <span className="text-sm font-normal text-muted/60"> one-time</span>
                  </div>
                  <div className="text-[10px] text-muted/45 mb-6">Pay once, Pro forever</div>
                  <button
                    onClick={() => router.push("/pro/checkout?plan=lifetime")}
                    className="mt-auto w-full rounded-lg py-2.5 text-[13px] font-bold ring-1 ring-white/[0.10] bg-white/[0.04] text-text/70 hover:ring-accent/30 hover:bg-accent/[0.05] hover:text-accent/80 transition-all duration-200 hover:scale-[1.01] active:scale-[0.99]"
                  >
                    Get Pro
                  </button>
                </div>

              </div>
              <p className="text-center text-[9px] text-muted/20 mt-3 leading-relaxed">
                Subscriptions cancel anytime. Lifetime is permanent.{" "}
                Cosmetics earned are yours to keep.
              </p>
            </div>

            {/* ── Cosmetics showcase ── */}
            <div className="animate-slide-up" style={{ animationDelay: "60ms" }}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-[9px] font-bold text-muted/65 uppercase tracking-widest">
                  {PRO_REWARD_COUNT} Pro Cosmetics
                </p>
                <p className="text-[9px] text-muted/20">yours to keep on cancel</p>
              </div>
              <div className="rounded-xl ring-1 ring-white/[0.06] overflow-hidden bg-[#0c0c12]">
                {/* Live name preview */}
                <NamePreview username={session?.user?.username ?? session?.user?.name ?? "TypeOff"} />
                {/* Teaser items strip */}
                <div className="flex divide-x divide-white/[0.03] border-t border-white/[0.03]">
                  {TEASER_REWARDS.map((item) => (
                    <div
                      key={item.id}
                      className="flex-1 flex flex-col items-center justify-center py-5 gap-2 group hover:bg-accent/[0.03] transition-colors"
                    >
                      <div className="opacity-60 group-hover:opacity-100 transition-opacity">
                        <TeaserVisual item={item} />
                      </div>
                      <span className="text-[9px] text-muted/45 capitalize">
                        {item.type === "nameColor" ? "color" : item.type === "cursorStyle" ? "cursor" : item.type === "typingTheme" ? "theme" : item.type}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Comparison table ── */}
            <div className="animate-slide-up" style={{ animationDelay: "80ms" }}>
              <p className="text-[9px] font-bold text-muted/65 uppercase tracking-widest mb-3">
                Free vs Pro
              </p>
              <div className="rounded-xl bg-surface/30 ring-1 ring-white/[0.04] overflow-hidden">
                <div className="grid grid-cols-[1fr_5rem_5rem] text-[9px] font-bold text-muted/60 uppercase tracking-wider px-4 py-2.5 border-b border-white/[0.06]">
                  <span />
                  <span className="text-center">Free</span>
                  <span className="text-center text-accent/60">Pro</span>
                </div>
                {COMPARISON_ROWS.map((row, i) => (
                  <div
                    key={row.feature}
                    className={`grid grid-cols-[1fr_5rem_5rem] px-4 py-2.5 ${
                      i < COMPARISON_ROWS.length - 1 ? "border-b border-white/[0.03]" : ""
                    }`}
                  >
                    <span className="text-[11px] text-text/60">{row.feature}</span>
                    <span className="text-center text-[11px] text-muted/65">
                      {row.free === true ? "✓" : row.free === false ? "—" : row.free}
                    </span>
                    <span className="text-center text-[11px] text-accent/70">
                      {row.pro === true ? "✓" : row.pro === false ? "—" : row.pro}
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}
      </div>
    </main>
  );
}

/* ── Subscriber View ───────────────────────────────────── */

function SubscriberView({
  session,
  portalLoading,
  onManage,
}: {
  session: ReturnType<typeof useSession>["data"];
  portalLoading: boolean;
  onManage: () => void;
}) {
  const totalXp = session?.user?.totalXp ?? 0;
  const { level, currentXp, nextLevelXp } = getXpLevel(totalXp);
  const xpPct = (currentXp / nextLevelXp) * 100;
  const xpToNext = nextLevelXp - currentXp;

  const nextProReward = COSMETIC_REWARDS.find((r) => r.proOnly && r.level > level);

  let xpToNextPro: number | null = null;
  if (nextProReward) {
    const xpNeeded = 100 * nextProReward.level * (nextProReward.level - 1);
    xpToNextPro = Math.max(0, xpNeeded - totalXp);
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="animate-fade-in">
        <h1 className="text-lg font-bold text-text tracking-tight flex items-center gap-2">
          TypeOff Pro
          <span className="text-[9px] font-bold text-accent/70 bg-accent/[0.08] px-2 py-0.5 rounded uppercase tracking-wider">
            Active
          </span>
        </h1>
        <p className="text-xs text-muted/65 mt-0.5">Manage your subscription</p>
      </div>

      {/* Status card */}
      <div className="rounded-xl bg-surface/50 ring-1 ring-white/[0.06] px-5 py-4 animate-slide-up">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="text-xs font-bold text-accent uppercase tracking-wider">
              Pro Subscription Active
            </div>
            <ul className="space-y-0.5">
              {[
                "1.5x XP on every race",
                "Full race history & advanced analytics",
                "Unlimited replays",
                "Custom text & focus drill modes",
                "Pro badge in every race",
              ].map((perk) => (
                <li key={perk} className="flex items-center gap-2 text-[11px] text-muted/60">
                  <span className="text-accent/60">✓</span>
                  {perk}
                </li>
              ))}
            </ul>
          </div>
          <button
            onClick={onManage}
            disabled={portalLoading}
            className="shrink-0 text-xs text-muted hover:text-text transition-colors px-3 py-1.5 rounded-lg ring-1 ring-white/[0.08] hover:ring-white/[0.15] disabled:opacity-50"
          >
            {portalLoading ? "Loading..." : "Manage"}
          </button>
        </div>
      </div>

      {/* XP progress */}
      <div
        className="rounded-xl bg-surface/40 ring-1 ring-white/[0.04] px-5 py-4 animate-slide-up"
        style={{ animationDelay: "40ms" }}
      >
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-bold text-accent tabular-nums">Level {level}</span>
          <span className="text-[11px] text-muted/60 tabular-nums">
            {currentXp} / {nextLevelXp} XP
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-surface overflow-hidden mb-3">
          <div
            className="h-full rounded-full bg-accent transition-all"
            style={{ width: `${Math.round(xpPct)}%` }}
          />
        </div>
        {nextProReward ? (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] text-muted/65">Next Pro cosmetic</p>
              <p className="text-xs font-bold text-accent/80 mt-0.5">
                {nextProReward.name}
                <span className="text-[10px] font-normal text-muted/60 ml-1">
                  at level {nextProReward.level}
                </span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-[11px] text-muted/60 tabular-nums">
                {xpToNextPro?.toLocaleString()} XP away
              </p>
              <p className="text-[10px] text-muted/65 mt-0.5">
                {xpToNext} to level {level + 1}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-[11px] text-muted/60">
            You&apos;ve unlocked all Pro cosmetics. Impressive.
          </p>
        )}
      </div>

      {/* Pro feature links */}
      <div
        className="grid grid-cols-2 sm:grid-cols-4 gap-2 animate-slide-up"
        style={{ animationDelay: "60ms" }}
      >
        {[
          { href: "/history",  title: "Race History", desc: "Full paginated history with filters" },
          { href: "/analytics", title: "Analytics",    desc: "Advanced performance insights" },
          { href: `/profile/${session?.user?.username}`, title: "Profile", desc: "View your profile with Pro badge" },
          { href: "/cosmetics", title: "Items",        desc: "Browse and equip your cosmetics" },
        ].map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="rounded-xl bg-surface/40 ring-1 ring-white/[0.04] px-4 py-3 hover:ring-accent/20 transition-all group"
          >
            <div className="text-sm font-bold text-text group-hover:text-accent transition-colors">
              {link.title}
            </div>
            <p className="text-[11px] text-muted/65 mt-0.5">{link.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
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
      <p className="text-[8px] font-bold text-muted/30 uppercase tracking-widest mb-1">preview</p>
      <div className="flex items-center gap-2 text-base font-bold">
        <span>{badge}</span>
        <span className={effectClass}>{username}</span>
      </div>
      {title && <span className="text-[10px] text-muted/50">{title}</span>}
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
      <p className="text-[9px] text-accent/45 uppercase tracking-wider mt-0.5">
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
        <span className="text-[10px] text-accent/70 font-medium">
          {TITLE_TEXTS[item.id] ?? item.value}
        </span>
      );
    case "nameColor": {
      const hex = NAME_COLORS[item.id] ?? item.value;
      return (
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full ring-1 ring-white/10" style={{ backgroundColor: hex }} />
          <span className="text-[10px] font-bold" style={{ color: hex }}>Aa</span>
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
