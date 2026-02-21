"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  PRO_MONTHLY_PRICE,
  PRO_YEARLY_PRICE,
  COSMETIC_REWARDS,
  BADGE_EMOJIS,
  TITLE_TEXTS,
  NAME_COLORS,
  TYPING_THEMES,
  CURSOR_STYLES,
  getXpLevel,
} from "@typeoff/shared";

const COMPARISON_ROWS = [
  { feature: "Ranked Racing",          free: true,             pro: true },
  { feature: "Leaderboard",            free: true,             pro: true },
  { feature: "Level Rewards",          free: "28 cosmetics",   pro: "All 50" },
  { feature: "XP Multiplier",          free: "1×",             pro: "1.5×" },
  { feature: "Race History",           free: "Last 20 races",  pro: "Full Archive" },
  { feature: "WPM Trend",              free: "Last 20",        pro: "All races" },
  { feature: "Advanced Analytics",     free: false,            pro: true },
  { feature: "Race Replays",           free: false,            pro: true },
];

// A cross-type sample of Pro cosmetics to show on the upsell page
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
    title: "Race History",
    description: "Every race preserved forever. Filter by mode, date, opponent, and performance.",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
      </svg>
    ),
  },
  {
    title: "Analytics",
    description: "Full breakdown beyond basic WPM trends. Bigram heatmaps, placement stats, consistency scores, and activity history.",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
  },
  {
    title: "Race Replays",
    description: "Watch any race back keystroke by keystroke. Study and share your best runs.",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="5 3 19 12 5 21 5 3" />
      </svg>
    ),
  },
  {
    title: "Pro Cosmetics",
    description: "22 exclusive rewards in the level track. Yours to keep even if you cancel.",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ),
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
      if (data.url) {
        window.location.href = data.url;
      }
    } finally {
      setPortalLoading(false);
    }
  }

  if (status === "loading") {
    return (
      <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-8">
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="h-8 w-48 rounded bg-surface/40 animate-pulse" />
          <div className="h-6 rounded bg-surface/30 animate-pulse" />
          <div className="h-48 rounded-xl bg-surface/40 animate-pulse" />
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-8">
      <div className="max-w-4xl mx-auto">
        {/* ── Subscriber view ─────────────────────────────── */}
        {isPro ? (
          <SubscriberView
            session={session}
            portalLoading={portalLoading}
            onManage={handleManageSubscription}
          />
        ) : (
          /* ── Non-subscriber view ─────────────────────────── */
          <div className="space-y-8">
            {/* Hero */}
            <div className="text-center pt-2 animate-fade-in">
              <div className="inline-flex items-center gap-1.5 text-[10px] font-bold text-amber-400/60 ring-1 ring-amber-400/20 px-3 py-1 rounded-full uppercase tracking-widest mb-5">
                <span className="w-1 h-1 rounded-full bg-amber-400/60" />
                TypeOff Pro
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-text tracking-tight leading-tight">
                Level up faster.<br className="sm:hidden" /> Look better doing it.
              </h1>
              <p className="text-sm text-muted/40 mt-3 max-w-sm mx-auto leading-relaxed">
                1.5× XP means faster levels and 22 exclusive cosmetics free players never reach — plus advanced analytics, full race history, and replays.
              </p>
            </div>

            {/* Feature strip — unified panel with hairline dividers */}
            <div
              className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-white/[0.04] rounded-xl overflow-hidden ring-1 ring-white/[0.04] animate-slide-up"
            >
              {FEATURES.map((f) => (
                <div
                  key={f.title}
                  className={`p-5 transition-colors group ${
                    "amber" in f && f.amber
                      ? "bg-amber-400/[0.03] hover:bg-amber-400/[0.05]"
                      : "bg-[#0c0c12] hover:bg-white/[0.015]"
                  }`}
                >
                  <div className={`mb-3 transition-colors ${
                    "amber" in f && f.amber
                      ? "text-amber-400/50 group-hover:text-amber-400/70"
                      : "text-muted/30 group-hover:text-muted/50"
                  }`}>
                    {f.icon}
                  </div>
                  <p className="text-xs font-bold text-text mb-1.5">{f.title}</p>
                  <p className="text-[11px] text-muted/40 leading-relaxed">{f.description}</p>
                </div>
              ))}
            </div>

            {/* Pro cosmetics teaser — single unified callout */}
            <div
              className="rounded-xl ring-1 ring-amber-400/10 overflow-hidden animate-slide-up"
              style={{ animationDelay: "40ms" }}
            >
              <div className="px-5 py-2.5 border-b border-amber-400/[0.07] flex items-center justify-between bg-amber-400/[0.02]">
                <span className="text-[10px] font-bold text-amber-400/50 uppercase tracking-widest">
                  22 Pro-exclusive cosmetics
                </span>
                <span className="text-[10px] text-muted/25">Yours to keep on cancel</span>
              </div>
              <div className="grid grid-cols-5 divide-x divide-white/[0.03] bg-[#0c0c12]">
                {TEASER_REWARDS.map((item) => (
                  <div key={item.id} className="flex flex-col items-center justify-center gap-2 py-4 px-2">
                    <div className="opacity-60">
                      <TeaserVisual item={item} />
                    </div>
                    <span className="text-[9px] text-muted/30 text-center truncate w-full px-1">
                      {item.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Comparison + Pricing — side by side at md+ */}
            <div
              className="grid grid-cols-1 md:grid-cols-[1fr_220px] gap-4 items-start animate-slide-up"
              style={{ animationDelay: "60ms" }}
            >
              {/* Comparison table */}
              <div>
                <p className="text-[10px] font-bold text-muted/30 uppercase tracking-widest mb-2.5">
                  Free vs Pro
                </p>
                <div className="rounded-xl bg-surface/30 ring-1 ring-white/[0.04] overflow-hidden">
                  <div className="grid grid-cols-[1fr_4rem_4rem] text-[10px] font-bold text-muted/40 uppercase tracking-wider px-4 py-2 border-b border-white/[0.06]">
                    <span />
                    <span className="text-center">Free</span>
                    <span className="text-center text-amber-400/60">Pro</span>
                  </div>
                  {COMPARISON_ROWS.map((row, i) => (
                    <div
                      key={row.feature}
                      className={`grid grid-cols-[1fr_4rem_4rem] px-4 py-1.5 text-xs ${
                        i < COMPARISON_ROWS.length - 1 ? "border-b border-white/[0.03]" : ""
                      }`}
                    >
                      <span className="text-text/60">{row.feature}</span>
                      <span className="text-center text-muted/30">
                        {row.free === true ? (
                          <span className="text-muted/30">&#10003;</span>
                        ) : row.free === false ? (
                          "—"
                        ) : (
                          <span className="text-muted/40 text-[11px]">{row.free}</span>
                        )}
                      </span>
                      <span className="text-center text-amber-400/70">
                        {row.pro === true ? "✓" : row.pro === false ? "—" : (
                          <span className="text-[11px]">{row.pro}</span>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pricing */}
              <div className="space-y-2.5">
                <PricingCard
                  plan="Monthly"
                  price={PRO_MONTHLY_PRICE}
                  period="/mo"
                  onSubscribe={() => router.push("/pro/checkout?plan=monthly")}
                />
                <PricingCard
                  plan="Yearly"
                  price={PRO_YEARLY_PRICE}
                  period="/yr"
                  perMonth={+(PRO_YEARLY_PRICE / 12).toFixed(2)}
                  badge="Save 33%"
                  highlighted
                  onSubscribe={() => router.push("/pro/checkout?plan=yearly")}
                />
                <p className="text-center text-[10px] text-muted/20 pt-1 leading-relaxed">
                  Cancel anytime. Cosmetics earned<br />while subscribed are yours to keep.
                </p>
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

  // Next Pro cosmetic above current level
  const nextProReward = COSMETIC_REWARDS.find((r) => r.proOnly && r.level > level);

  // How many XP levels away is the next Pro reward?
  let xpToNextPro: number | null = null;
  if (nextProReward) {
    // XP needed to reach nextProReward.level: 100 * N * (N-1)
    const xpNeeded = 100 * nextProReward.level * (nextProReward.level - 1);
    xpToNextPro = Math.max(0, xpNeeded - totalXp);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="animate-fade-in">
        <h1 className="text-lg font-bold text-text tracking-tight flex items-center gap-2">
          TypeOff Pro
          <span className="text-[10px] font-bold text-amber-400/70 bg-amber-400/[0.08] px-2 py-0.5 rounded uppercase tracking-wider">
            Active
          </span>
        </h1>
        <p className="text-xs text-muted/50 mt-0.5">
          Manage your subscription
        </p>
      </div>

      {/* Status card */}
      <div className="rounded-xl bg-surface/50 ring-1 ring-amber-400/10 px-5 py-4 animate-slide-up">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="text-xs font-bold text-amber-400 uppercase tracking-wider">
              Pro Subscription Active
            </div>
            <ul className="space-y-1">
              {[
                "1.5x XP on every race",
                "Full race history & advanced analytics",
                "Unlimited replays",
                "Pro badge in every race",
              ].map((perk) => (
                <li key={perk} className="flex items-center gap-2 text-[11px] text-muted/60">
                  <span className="text-amber-400/60">&#10003;</span>
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

      {/* XP progress + next Pro reward */}
      <div
        className="rounded-xl bg-surface/40 ring-1 ring-white/[0.04] px-5 py-4 animate-slide-up"
        style={{ animationDelay: "40ms" }}
      >
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-bold text-accent tabular-nums">Level {level}</span>
          <span className="text-[11px] text-muted/40 tabular-nums">{currentXp} / {nextLevelXp} XP</span>
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
              <p className="text-[11px] text-muted/50">
                Next Pro cosmetic
              </p>
              <p className="text-xs font-bold text-amber-400/80 mt-0.5">
                {nextProReward.name}
                <span className="text-[10px] font-normal text-muted/40 ml-1">
                  at level {nextProReward.level}
                </span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-[11px] text-muted/40 tabular-nums">{xpToNextPro?.toLocaleString()} XP away</p>
              <p className="text-[10px] text-muted/30 mt-0.5">{xpToNext} to level {level + 1}</p>
            </div>
          </div>
        ) : (
          <p className="text-[11px] text-muted/40">
            You&apos;ve unlocked all Pro cosmetics. Impressive.
          </p>
        )}
      </div>

      {/* Pro feature links */}
      <div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 animate-slide-up"
        style={{ animationDelay: "60ms" }}
      >
        <Link href="/history" className="rounded-xl bg-surface/40 ring-1 ring-white/[0.04] px-4 py-3 hover:ring-accent/20 transition-all group">
          <div className="text-sm font-bold text-text group-hover:text-accent transition-colors">Race History</div>
          <p className="text-[11px] text-muted/50 mt-0.5">Full paginated history with filters</p>
        </Link>
        <Link href="/analytics" className="rounded-xl bg-surface/40 ring-1 ring-white/[0.04] px-4 py-3 hover:ring-accent/20 transition-all group">
          <div className="text-sm font-bold text-text group-hover:text-accent transition-colors">Analytics</div>
          <p className="text-[11px] text-muted/50 mt-0.5">Advanced performance insights</p>
        </Link>
        <Link
          href={`/profile/${session?.user?.username}`}
          className="rounded-xl bg-surface/40 ring-1 ring-white/[0.04] px-4 py-3 hover:ring-accent/20 transition-all group"
        >
          <div className="text-sm font-bold text-text group-hover:text-accent transition-colors">Profile</div>
          <p className="text-[11px] text-muted/50 mt-0.5">View your profile with Pro badge</p>
        </Link>
        <Link href="/items" className="rounded-xl bg-surface/40 ring-1 ring-white/[0.04] px-4 py-3 hover:ring-accent/20 transition-all group">
          <div className="text-sm font-bold text-text group-hover:text-accent transition-colors">Items</div>
          <p className="text-[11px] text-muted/50 mt-0.5">Browse and equip your cosmetics</p>
        </Link>
      </div>
    </div>
  );
}

/* ── Teaser Visual ─────────────────────────────────────── */

function TeaserVisual({ item }: { item: (typeof COSMETIC_REWARDS)[number] }) {
  switch (item.type) {
    case "badge":
      return <span className="text-xl">{BADGE_EMOJIS[item.id] ?? item.value}</span>;
    case "title":
      return <span className="text-xs text-amber-400/70 font-medium">{TITLE_TEXTS[item.id] ?? item.value}</span>;
    case "nameColor": {
      const hex = NAME_COLORS[item.id] ?? item.value;
      return (
        <div className="flex items-center gap-1.5">
          <span className="w-4 h-4 rounded-full ring-1 ring-white/10" style={{ backgroundColor: hex }} />
          <span className="text-xs font-bold" style={{ color: hex }}>Aa</span>
        </div>
      );
    }
    case "typingTheme": {
      const def = TYPING_THEMES[item.id];
      if (!def) return null;
      return (
        <span className="flex gap-1">
          {def.palette.map((c, i) => (
            <span key={i} className="w-3 h-3 rounded-full" style={{ backgroundColor: c }} />
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
            boxShadow: def.glowColor ? `0 0 8px ${def.glowColor}` : undefined,
          }}
        />
      );
    }
    default:
      return <span className="text-lg">✨</span>;
  }
}

/* ── Pricing Card ─────────────────────────────────────── */

function PricingCard({
  plan,
  price,
  period,
  perMonth,
  badge,
  highlighted,
  onSubscribe,
}: {
  plan: string;
  price: number;
  period: string;
  perMonth?: number;
  badge?: string;
  highlighted?: boolean;
  onSubscribe: () => void;
}) {
  return (
    <div
      className={`relative rounded-xl px-5 py-5 ring-1 transition-all ${
        highlighted
          ? "ring-amber-400/20 bg-amber-400/[0.03]"
          : "ring-white/[0.06] bg-surface/40"
      }`}
    >
      {badge && (
        <span className="absolute -top-2.5 right-3 text-[10px] font-bold bg-amber-400 text-bg px-2 py-0.5 rounded-full uppercase tracking-wider">
          {badge}
        </span>
      )}
      <div className="text-xs font-bold text-muted/60 uppercase tracking-wider mb-2">
        {plan}
      </div>
      <div className="text-2xl font-black text-text tabular-nums">
        ${price.toFixed(2)}
        <span className="text-sm font-normal text-muted/50">{period}</span>
      </div>
      {perMonth && (
        <div className="text-[11px] text-muted/40 mt-0.5">
          ${perMonth.toFixed(2)}/mo billed annually
        </div>
      )}
      <button
        onClick={onSubscribe}
        className={`w-full mt-4 rounded-lg py-2.5 text-sm font-bold transition-all ${
          highlighted
            ? "bg-amber-400 text-bg hover:bg-amber-300"
            : "bg-white/[0.06] text-text hover:bg-white/[0.1] ring-1 ring-white/[0.08]"
        }`}
      >
        Get Pro
      </button>
    </div>
  );
}
