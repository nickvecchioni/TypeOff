"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PRO_MONTHLY_PRICE, PRO_YEARLY_PRICE } from "@typeoff/shared";

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
        {/* ── Header ──────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4 mb-6 animate-fade-in">
          <div>
            <h1 className="text-lg font-bold text-text tracking-tight flex items-center gap-2">
              TypeOff Pro
              {isPro && (
                <span className="text-[10px] font-bold text-amber-400/70 bg-amber-400/[0.08] px-2 py-0.5 rounded uppercase tracking-wider">
                  Active
                </span>
              )}
            </h1>
            <p className="text-xs text-muted/50 mt-0.5">
              {isPro ? "Manage your subscription" : "Unlock advanced features for competitive typists"}
            </p>
          </div>
        </div>

        {/* ── Subscriber view ─────────────────────────────── */}
        {isPro ? (
          <div className="space-y-6">
            {/* Subscription status card */}
            <div className="rounded-xl bg-surface/50 ring-1 ring-amber-400/10 px-5 py-4 animate-slide-up">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-1">
                    Pro Subscription
                  </div>
                  <p className="text-sm text-text">
                    You have full access to race history, analytics, and replays.
                  </p>
                </div>
                <button
                  onClick={handleManageSubscription}
                  disabled={portalLoading}
                  className="text-xs text-muted hover:text-text transition-colors px-3 py-1.5 rounded-lg ring-1 ring-white/[0.08] hover:ring-white/[0.15] disabled:opacity-50"
                >
                  {portalLoading ? "Loading..." : "Manage Subscription"}
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
          <div className="space-y-8">
            {/* Feature showcase */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 animate-slide-up">
              <FeatureCard
                icon={
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 8v4l3 3" />
                    <circle cx="12" cy="12" r="10" />
                  </svg>
                }
                title="Race History"
                description="Full paginated history with sorting and filters. Relive every race."
              />
              <FeatureCard
                icon={
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                  </svg>
                }
                title="Advanced Analytics"
                description="WPM trends, consistency scores, session breakdowns, and personal records."
              />
              <FeatureCard
                icon={
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                }
                title="Race Replays"
                description="Watch unlimited replays of your races to analyze your technique."
              />
            </div>

            {/* Pricing cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg mx-auto animate-slide-up" style={{ animationDelay: "100ms" }}>
              <PricingCard
                plan="monthly"
                price={PRO_MONTHLY_PRICE}
                period="/mo"
                onSubscribe={() => router.push("/pro/checkout?plan=monthly")}
              />
              <PricingCard
                plan="yearly"
                price={PRO_YEARLY_PRICE}
                period="/yr"
                badge="Save 33%"
                highlighted
                onSubscribe={() => router.push("/pro/checkout?plan=yearly")}
              />
            </div>

            {/* Link to cosmetics */}
            <div className="text-center animate-slide-up" style={{ animationDelay: "160ms" }}>
              <Link
                href="/cosmetics"
                className="text-xs text-muted/50 hover:text-accent transition-colors"
              >
                Browse free cosmetics &rarr;
              </Link>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

/* ── Feature Card ─────────────────────────────────────── */

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl bg-surface/40 ring-1 ring-white/[0.04] px-4 py-4">
      <div className="text-accent/70 mb-2">{icon}</div>
      <div className="text-sm font-bold text-text">{title}</div>
      <p className="text-[11px] text-muted/50 mt-1 leading-relaxed">{description}</p>
    </div>
  );
}

/* ── Pricing Card ─────────────────────────────────────── */

function PricingCard({
  plan,
  price,
  period,
  badge,
  highlighted,
  onSubscribe,
}: {
  plan: string;
  price: number;
  period: string;
  badge?: string;
  highlighted?: boolean;
  onSubscribe: () => void;
}) {
  return (
    <div
      className={`relative rounded-xl px-5 py-5 ring-1 transition-all ${
        highlighted
          ? "ring-accent/30 bg-accent/[0.04]"
          : "ring-white/[0.06] bg-surface/40"
      }`}
    >
      {badge && (
        <span className="absolute -top-2.5 right-3 text-[10px] font-bold bg-accent text-bg px-2 py-0.5 rounded-full uppercase tracking-wider">
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
      <button
        onClick={onSubscribe}
        className={`w-full mt-4 rounded-lg py-2 text-sm font-medium transition-all ${
          highlighted
            ? "bg-accent text-bg hover:bg-accent/90"
            : "bg-white/[0.06] text-text hover:bg-white/[0.1] ring-1 ring-white/[0.08]"
        }`}
      >
        Subscribe
      </button>
    </div>
  );
}
