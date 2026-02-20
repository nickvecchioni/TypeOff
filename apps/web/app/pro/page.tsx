"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  SEASON_1,
  BADGE_EMOJIS,
  TITLE_TEXTS,
  NAME_COLORS,
  NAME_EFFECT_CLASSES,
  CURSOR_STYLES,
  PROFILE_BORDERS,
  TYPING_THEMES,
  PRO_MONTHLY_PRICE,
  PRO_YEARLY_PRICE,
  type TypePassReward,
  type SeasonDefinition,
} from "@typeoff/shared";

/* ── Types ─────────────────────────────────────────────── */

interface CosmeticsData {
  unlocked: Array<{ cosmeticId: string; seasonId: string }>;
  active: ActiveState;
}

interface ActiveState {
  activeBadge: string | null;
  activeTitle: string | null;
  activeNameColor: string | null;
  activeNameEffect: string | null;
  activeCursorStyle: string | null;
  activeProfileBorder: string | null;
  activeTypingTheme: string | null;
}

interface TypePassData {
  season: SeasonDefinition | null;
  userState: {
    seasonalXp: number;
    currentTier: number;
    isPremium: boolean;
  } | null;
  cosmetics: string[];
}

type Category =
  | "badge"
  | "title"
  | "nameColor"
  | "nameEffect"
  | "cursorStyle"
  | "profileBorder"
  | "typingTheme";

const CATEGORIES: {
  key: Category;
  label: string;
  field: keyof ActiveState;
}[] = [
  { key: "badge", label: "Badges", field: "activeBadge" },
  { key: "title", label: "Titles", field: "activeTitle" },
  { key: "nameColor", label: "Name Colors", field: "activeNameColor" },
  { key: "nameEffect", label: "Name Effects", field: "activeNameEffect" },
  { key: "cursorStyle", label: "Cursor Styles", field: "activeCursorStyle" },
  { key: "profileBorder", label: "Profile Borders", field: "activeProfileBorder" },
  { key: "typingTheme", label: "Typing Themes", field: "activeTypingTheme" },
];

const EMPTY_ACTIVE: ActiveState = {
  activeBadge: null,
  activeTitle: null,
  activeNameColor: null,
  activeNameEffect: null,
  activeCursorStyle: null,
  activeProfileBorder: null,
  activeTypingTheme: null,
};

/* ── Main Page ─────────────────────────────────────────── */

export default function ProPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const isPro = session?.user?.isPro ?? false;

  // Cosmetics state
  const [cosmeticsData, setCosmeticsData] = useState<CosmeticsData | null>(null);
  const [active, setActive] = useState<ActiveState>(EMPTY_ACTIVE);
  const [saving, setSaving] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category>("badge");

  // TypePass state
  const [passData, setPassData] = useState<TypePassData | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/");
  }, [status, router]);

  useEffect(() => {
    if (!session?.user?.id) return;
    Promise.all([
      fetch("/api/cosmetics").then((r) => r.json()),
      fetch("/api/type-pass").then((r) => r.json()),
    ])
      .then(([cosmetics, pass]: [CosmeticsData, TypePassData]) => {
        setCosmeticsData(cosmetics);
        setActive(cosmetics.active);
        setPassData(pass);
      })
      .catch(() => {});
  }, [session?.user?.id]);

  const save = useCallback(async (newActive: ActiveState) => {
    setSaving(true);
    setActive(newActive);
    try {
      await fetch("/api/cosmetics", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newActive),
      });
    } finally {
      setSaving(false);
    }
  }, []);

  const toggleCosmetic = useCallback(
    (field: keyof ActiveState, id: string) => {
      const newActive = {
        ...active,
        [field]: active[field] === id ? null : id,
      };
      save(newActive);
    },
    [active, save],
  );

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

  // Loading
  if (status === "loading" || !cosmeticsData || !passData) {
    return (
      <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-8">
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="h-8 w-48 rounded bg-surface/40 animate-pulse" />
          <div className="h-6 rounded bg-surface/30 animate-pulse" />
          <div className="h-48 rounded-xl bg-surface/40 animate-pulse" />
          <div className="h-64 rounded-xl bg-surface/30 animate-pulse" />
        </div>
      </main>
    );
  }

  const season = passData.season;
  const ownedIds = new Set(cosmeticsData.unlocked.map((u) => u.cosmeticId));
  const categoryInfo = CATEGORIES.find((c) => c.key === selectedCategory)!;
  const allItems = SEASON_1.rewards.filter((r) => r.type === selectedCategory);
  const ownedItems = allItems.filter((r) => ownedIds.has(r.id));
  const lockedItems = allItems.filter((r) => !ownedIds.has(r.id));

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
              {isPro ? "Manage your subscription and cosmetics" : "Unlock advanced features for competitive typists"}
            </p>
          </div>
          {saving && (
            <span className="text-[10px] text-accent/50">saving...</span>
          )}
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
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 animate-slide-up" style={{ animationDelay: "60ms" }}>
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
            </div>

            {/* Season progression */}
            {season && <SeasonProgress season={season} passData={passData} />}

            {/* Cosmetics browser */}
            <CosmeticsBrowser
              selectedCategory={selectedCategory}
              setSelectedCategory={setSelectedCategory}
              categoryInfo={categoryInfo}
              allItems={allItems}
              ownedItems={ownedItems}
              lockedItems={lockedItems}
              ownedIds={ownedIds}
              active={active}
              toggleCosmetic={toggleCosmetic}
            />
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

            {/* Season progression (still free) */}
            {season && <SeasonProgress season={season} passData={passData} />}

            {/* Cosmetics browser (all free now) */}
            <CosmeticsBrowser
              selectedCategory={selectedCategory}
              setSelectedCategory={setSelectedCategory}
              categoryInfo={categoryInfo}
              allItems={allItems}
              ownedItems={ownedItems}
              lockedItems={lockedItems}
              ownedIds={ownedIds}
              active={active}
              toggleCosmetic={toggleCosmetic}
            />
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

/* ── Season Progress ──────────────────────────────────── */

function SeasonProgress({
  season,
  passData,
}: {
  season: SeasonDefinition;
  passData: TypePassData;
}) {
  const tier = passData.userState?.currentTier ?? 0;
  const xp = passData.userState?.seasonalXp ?? 0;
  const xpInTier = xp % season.xpPerTier;
  const xpPct = tier >= season.maxTier ? 100 : (xpInTier / season.xpPerTier) * 100;

  return (
    <div className="animate-slide-up" style={{ animationDelay: "120ms" }}>
      <h2 className="text-xs font-bold text-muted/60 uppercase tracking-wider mb-3 flex items-center gap-3">
        Season Progression
        <span className="flex-1 h-px bg-white/[0.03]" />
      </h2>
      <div className="rounded-xl bg-surface/40 ring-1 ring-white/[0.04] px-5 py-4">
        <div className="flex items-baseline justify-between mb-2">
          <span className="text-xs font-bold text-text tabular-nums">
            Tier {tier}
            <span className="text-muted/40 font-normal"> / {season.maxTier}</span>
          </span>
          <span className="text-[11px] text-muted/50 tabular-nums">
            {tier >= season.maxTier
              ? "Max tier"
              : `${xpInTier} / ${season.xpPerTier} XP`}
          </span>
        </div>
        <div className="flex gap-px">
          {Array.from({ length: season.maxTier }, (_, i) => {
            const t = i + 1;
            const filled = t <= tier;
            const partial = t === tier + 1 && tier < season.maxTier;
            return (
              <div
                key={t}
                className="flex-1 h-1.5 rounded-[1px] bg-white/[0.06] overflow-hidden"
              >
                {filled && <div className="h-full w-full bg-amber-400" />}
                {partial && (
                  <div
                    className="h-full bg-amber-400/50"
                    style={{ width: `${Math.round(xpPct)}%` }}
                  />
                )}
              </div>
            );
          })}
        </div>
        <p className="text-[11px] text-muted/40 mt-2">
          {season.name} &middot; All cosmetics are free to earn through gameplay
        </p>
      </div>
    </div>
  );
}

/* ── Cosmetics Browser ────────────────────────────────── */

function CosmeticsBrowser({
  selectedCategory,
  setSelectedCategory,
  categoryInfo,
  allItems,
  ownedItems,
  lockedItems,
  ownedIds,
  active,
  toggleCosmetic,
}: {
  selectedCategory: Category;
  setSelectedCategory: (c: Category) => void;
  categoryInfo: { key: Category; label: string; field: keyof ActiveState };
  allItems: TypePassReward[];
  ownedItems: TypePassReward[];
  lockedItems: TypePassReward[];
  ownedIds: Set<string>;
  active: ActiveState;
  toggleCosmetic: (field: keyof ActiveState, id: string) => void;
}) {
  return (
    <div className="animate-slide-up" style={{ animationDelay: "180ms" }}>
      <h2 className="text-xs font-bold text-muted/60 uppercase tracking-wider mb-3 flex items-center gap-3">
        Cosmetics
        <span className="flex-1 h-px bg-white/[0.03]" />
      </h2>

      {/* Category Tabs */}
      <div className="flex flex-wrap gap-1 mb-4">
        {CATEGORIES.map((cat) => {
          const count = SEASON_1.rewards.filter(
            (r) => r.type === cat.key && ownedIds.has(r.id),
          ).length;
          const total = SEASON_1.rewards.filter(
            (r) => r.type === cat.key,
          ).length;
          return (
            <button
              key={cat.key}
              onClick={() => setSelectedCategory(cat.key)}
              className={`text-xs px-3 py-2 rounded-lg transition-all ${
                selectedCategory === cat.key
                  ? "bg-accent/15 text-accent ring-1 ring-accent/20"
                  : "text-muted hover:text-text hover:bg-white/[0.04]"
              }`}
            >
              {cat.label}
              <span
                className={`ml-1.5 tabular-nums ${
                  selectedCategory === cat.key ? "text-accent/50" : "text-muted/40"
                }`}
              >
                {count}/{total}
              </span>
            </button>
          );
        })}
      </div>

      {/* Items Grid */}
      <div className="space-y-4">
        {ownedItems.length > 0 && (
          <section>
            <h3 className="text-[11px] font-bold text-correct/70 uppercase tracking-widest mb-2">
              Unlocked
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {ownedItems.map((item) => (
                <ItemCard
                  key={item.id}
                  item={item}
                  active={active[categoryInfo.field] === item.id}
                  locked={false}
                  onToggle={() => toggleCosmetic(categoryInfo.field, item.id)}
                />
              ))}
            </div>
          </section>
        )}

        {lockedItems.length > 0 && (
          <section>
            <h3 className="text-[11px] font-bold text-muted/50 uppercase tracking-widest mb-2">
              Locked
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {lockedItems.map((item) => (
                <ItemCard
                  key={item.id}
                  item={item}
                  active={false}
                  locked
                  onToggle={() => {}}
                />
              ))}
            </div>
          </section>
        )}

        {allItems.length === 0 && (
          <p className="text-sm text-muted/40 py-8 text-center">
            No items in this category yet.
          </p>
        )}
      </div>
    </div>
  );
}

/* ── Item Card ─────────────────────────────────────────── */

function ItemCard({
  item,
  active,
  locked,
  onToggle,
}: {
  item: TypePassReward;
  active: boolean;
  locked: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      disabled={locked}
      className={`group relative text-left rounded-lg px-4 py-3.5 ring-1 transition-all ${
        locked
          ? "ring-white/[0.05] bg-surface/30 cursor-default opacity-60"
          : active
            ? "ring-accent/40 bg-accent/[0.08]"
            : "ring-white/[0.06] bg-surface/40 hover:ring-white/[0.12] hover:bg-white/[0.03]"
      }`}
    >
      {active && (
        <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-accent shadow-[0_0_6px_rgba(77,158,255,0.5)]" />
      )}
      {locked && (
        <span className="absolute top-2.5 right-2.5 text-muted/20">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </span>
      )}

      <div className={`mb-2 ${locked ? "saturate-[0.4]" : ""}`}>
        <ItemVisual item={item} />
      </div>

      <p className={`text-xs font-medium truncate ${
        active ? "text-accent" : locked ? "text-muted/60" : "text-text"
      }`}>
        {item.name}
      </p>
      <p className="text-[10px] text-muted/40 mt-0.5">
        {locked ? `Tier ${item.tier}` : active ? "Equipped" : "Click to equip"}
      </p>
    </button>
  );
}

/* ── Item Visual ───────────────────────────────────────── */

function ItemVisual({ item }: { item: TypePassReward }) {
  switch (item.type) {
    case "badge":
      return <span className="text-2xl">{BADGE_EMOJIS[item.id] ?? item.value}</span>;
    case "title":
      return <span className="text-sm text-amber-400/80 font-medium">{TITLE_TEXTS[item.id] ?? item.value}</span>;
    case "nameColor": {
      const hex = NAME_COLORS[item.id] ?? item.value;
      return (
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded-full ring-1 ring-white/10" style={{ backgroundColor: hex }} />
          <span className="text-sm font-medium" style={{ color: hex }}>Aa</span>
        </div>
      );
    }
    case "nameEffect": {
      const effectClass = NAME_EFFECT_CLASSES[item.id] ?? "";
      return <span className={`text-sm font-medium text-text ${effectClass}`}>Effect</span>;
    }
    case "cursorStyle": {
      const def = CURSOR_STYLES[item.id];
      if (!def) return <span className="text-muted text-xs">?</span>;
      return (
        <div className="flex items-center gap-2 h-6">
          <span
            className="rounded-sm"
            style={{
              width: def.shape === "block" || def.shape === "underline" ? "1ch" : 2,
              height: def.shape === "underline" ? 2 : 18,
              backgroundColor: def.color,
              boxShadow: def.glowColor ? `0 0 8px ${def.glowColor}` : undefined,
              opacity: def.shape === "block" ? 0.4 : 1,
              animation: def.animation ? `${def.animation} 2s ease-in-out infinite` : undefined,
            }}
          />
          <span className="text-[10px] text-muted/60 capitalize">{def.shape}</span>
        </div>
      );
    }
    case "profileBorder": {
      const def = PROFILE_BORDERS[item.id];
      if (!def) return null;
      return <div className={`w-10 h-7 rounded-md bg-surface/60 ring-1 ring-white/[0.06] ${def.className}`} />;
    }
    case "typingTheme": {
      const def = TYPING_THEMES[item.id];
      if (!def) return null;
      return (
        <div className="flex items-center gap-2">
          <span className="flex gap-1">
            {def.palette.map((c, i) => (
              <span key={i} className="w-3 h-3 rounded-full" style={{ backgroundColor: c }} />
            ))}
          </span>
        </div>
      );
    }
    default:
      return null;
  }
}
