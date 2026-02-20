"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PRO_MONTHLY_PRICE, PRO_YEARLY_PRICE } from "@typeoff/shared";

const COMPARISON_ROWS = [
  { feature: "Ranked Racing", free: true, pro: true },
  { feature: "Leaderboard", free: true, pro: true },
  { feature: "Cosmetic Rewards", free: true, pro: true },
  { feature: "XP Multiplier", free: "1x", pro: "1.5x" },
  { feature: "Race History", free: "Recent", pro: "Full Archive" },
  { feature: "Performance Analytics", free: false, pro: true },
  { feature: "Race Replays", free: false, pro: true },
  { feature: "Pro Badge", free: false, pro: true },
];

/* ── Main Page ─────────────────────────────────────────── */

export default function ProPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const isPro = session?.user?.isPro ?? false;

  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/");
  }, [status, router]);

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

            {/* Subscription status card */}
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
                  onClick={handleManageSubscription}
                  disabled={portalLoading}
                  className="shrink-0 text-xs text-muted hover:text-text transition-colors px-3 py-1.5 rounded-lg ring-1 ring-white/[0.08] hover:ring-white/[0.15] disabled:opacity-50"
                >
                  {portalLoading ? "Loading..." : "Manage"}
                </button>
              </div>
            </div>

            {/* Pro feature links */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 animate-slide-up" style={{ animationDelay: "60ms" }}>
              <Link
                href="/history"
                className="rounded-xl bg-surface/40 ring-1 ring-white/[0.04] px-4 py-3 hover:ring-accent/20 transition-all group"
              >
                <div className="text-sm font-bold text-text group-hover:text-accent transition-colors">Race History</div>
                <p className="text-[11px] text-muted/50 mt-0.5">Full paginated history with filters</p>
              </Link>
              <Link
                href="/analytics"
                className="rounded-xl bg-surface/40 ring-1 ring-white/[0.04] px-4 py-3 hover:ring-accent/20 transition-all group"
              >
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
              <Link
                href="/cosmetics"
                className="rounded-xl bg-surface/40 ring-1 ring-white/[0.04] px-4 py-3 hover:ring-accent/20 transition-all group"
              >
                <div className="text-sm font-bold text-text group-hover:text-accent transition-colors">Cosmetics</div>
                <p className="text-[11px] text-muted/50 mt-0.5">Browse and equip cosmetics</p>
              </Link>
            </div>
          </div>
        ) : (
          /* ── Non-subscriber view ─────────────────────────── */
          <div className="space-y-10">
            {/* Hero */}
            <div className="text-center animate-fade-in">
              <div className="inline-block text-[10px] font-bold text-amber-400/70 bg-amber-400/[0.08] px-3 py-1 rounded-full uppercase tracking-widest mb-4">
                TypeOff Pro
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-text tracking-tight">
                Your competitive edge
              </h1>
              <p className="text-sm text-muted/50 mt-2 max-w-md mx-auto leading-relaxed">
                The tools top typists use to break through plateaus, analyze weaknesses, and climb the ranks faster.
              </p>
            </div>

            {/* Feature cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 animate-slide-up">
              {/* Race History */}
              <div className="rounded-xl bg-surface/50 ring-1 ring-white/[0.06] p-5 hover:ring-amber-400/15 transition-all">
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-400/[0.08] flex items-center justify-center text-amber-400/70">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 6v6l4 2" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-bold text-text">Race History</h3>
                </div>
                <p className="text-xs text-muted/50 leading-relaxed mb-3">
                  Every race, preserved forever. Filter by mode, date, opponents, and performance.
                </p>
                <ul className="space-y-1.5">
                  <li className="flex items-center gap-2 text-[11px] text-muted/40">
                    <span className="text-amber-400/60 text-[9px]">&#9679;</span>
                    Full paginated archive
                  </li>
                  <li className="flex items-center gap-2 text-[11px] text-muted/40">
                    <span className="text-amber-400/60 text-[9px]">&#9679;</span>
                    Sort by any stat
                  </li>
                  <li className="flex items-center gap-2 text-[11px] text-muted/40">
                    <span className="text-amber-400/60 text-[9px]">&#9679;</span>
                    Opponent match history
                  </li>
                </ul>
              </div>

              {/* Analytics */}
              <div className="rounded-xl bg-surface/50 ring-1 ring-white/[0.06] p-5 hover:ring-amber-400/15 transition-all">
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-400/[0.08] flex items-center justify-center text-amber-400/70">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-bold text-text">Advanced Analytics</h3>
                </div>
                <p className="text-xs text-muted/50 leading-relaxed mb-3">
                  See exactly where you lose speed and what to improve. Data-driven practice.
                </p>
                <ul className="space-y-1.5">
                  <li className="flex items-center gap-2 text-[11px] text-muted/40">
                    <span className="text-amber-400/60 text-[9px]">&#9679;</span>
                    WPM trends over time
                  </li>
                  <li className="flex items-center gap-2 text-[11px] text-muted/40">
                    <span className="text-amber-400/60 text-[9px]">&#9679;</span>
                    Consistency analysis
                  </li>
                  <li className="flex items-center gap-2 text-[11px] text-muted/40">
                    <span className="text-amber-400/60 text-[9px]">&#9679;</span>
                    Personal records tracker
                  </li>
                </ul>
              </div>

              {/* Replays */}
              <div className="rounded-xl bg-surface/50 ring-1 ring-white/[0.06] p-5 hover:ring-amber-400/15 transition-all">
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-400/[0.08] flex items-center justify-center text-amber-400/70">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-bold text-text">Race Replays</h3>
                </div>
                <p className="text-xs text-muted/50 leading-relaxed mb-3">
                  Watch any race back keystroke by keystroke. Study your technique and learn from every match.
                </p>
                <ul className="space-y-1.5">
                  <li className="flex items-center gap-2 text-[11px] text-muted/40">
                    <span className="text-amber-400/60 text-[9px]">&#9679;</span>
                    Keystroke-level replay
                  </li>
                  <li className="flex items-center gap-2 text-[11px] text-muted/40">
                    <span className="text-amber-400/60 text-[9px]">&#9679;</span>
                    All race modes
                  </li>
                  <li className="flex items-center gap-2 text-[11px] text-muted/40">
                    <span className="text-amber-400/60 text-[9px]">&#9679;</span>
                    Shareable links
                  </li>
                </ul>
              </div>
            </div>

            {/* Free vs Pro comparison */}
            <div
              className="max-w-md mx-auto animate-slide-up"
              style={{ animationDelay: "60ms" }}
            >
              <h3 className="text-xs font-bold text-muted/30 uppercase tracking-wider text-center mb-3">
                Free vs Pro
              </h3>
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
                    <span className="text-text/70">{row.feature}</span>
                    <span className="text-center text-muted/30">
                      {row.free === true ? (
                        <span className="text-muted/30">&#10003;</span>
                      ) : row.free === false ? (
                        "—"
                      ) : (
                        <span className="text-muted/40">{row.free}</span>
                      )}
                    </span>
                    <span className="text-center text-amber-400/70">
                      {row.pro === true ? (
                        <span>&#10003;</span>
                      ) : row.pro === false ? (
                        "—"
                      ) : (
                        row.pro
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Pricing */}
            <div className="animate-slide-up" style={{ animationDelay: "100ms" }}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg mx-auto">
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
              </div>
              <p className="text-center text-[10px] text-muted/25 mt-4">
                Cancel anytime. Your Pro badge appears next to your name in every race.
              </p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
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
