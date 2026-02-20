"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  COSMETIC_REWARDS,
  BADGE_EMOJIS,
  TITLE_TEXTS,
  NAME_COLORS,
  NAME_EFFECT_CLASSES,
  CURSOR_STYLES,
  PROFILE_BORDERS,
  TYPING_THEMES,
  getXpLevel,
  type CosmeticReward,
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

export default function CosmeticsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [cosmeticsData, setCosmeticsData] = useState<CosmeticsData | null>(null);
  const [active, setActive] = useState<ActiveState>(EMPTY_ACTIVE);
  const [saving, setSaving] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category>("badge");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/");
  }, [status, router]);

  useEffect(() => {
    if (!session?.user?.id) return;
    fetch("/api/cosmetics")
      .then((r) => r.json())
      .then((data: CosmeticsData) => {
        setCosmeticsData(data);
        setActive(data.active);
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

  if (status === "loading" || !cosmeticsData) {
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

  const totalXp = session?.user?.totalXp ?? 0;
  const isPro = session?.user?.isPro ?? false;
  const { level: cosmeticLevel, currentXp: xpInLevel, nextLevelXp } = getXpLevel(totalXp);
  const levelPct = (xpInLevel / nextLevelXp) * 100;

  const ownedIds = new Set(cosmeticsData.unlocked.map((u) => u.cosmeticId));
  const categoryInfo = CATEGORIES.find((c) => c.key === selectedCategory)!;
  const allItems = COSMETIC_REWARDS.filter((r) => r.type === selectedCategory);
  const ownedItems = allItems.filter((r) => ownedIds.has(r.id));
  const proLockedItems = allItems.filter((r) => !ownedIds.has(r.id) && r.proOnly && !isPro);
  const lockedItems = allItems.filter((r) => !ownedIds.has(r.id) && (!r.proOnly || isPro));

  return (
    <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-8">
      <div className="max-w-4xl mx-auto">
        {/* ── Header ──────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4 mb-6 animate-fade-in">
          <div>
            <h1 className="text-lg font-bold text-text tracking-tight">
              Cosmetics
            </h1>
            <p className="text-xs text-muted/50 mt-0.5">
              Earn cosmetics by leveling up through gameplay
            </p>
          </div>
          {saving && (
            <span className="text-[10px] text-accent/50">saving...</span>
          )}
        </div>

        {/* ── Level Progress ──────────────────────────────── */}
        <div className="animate-slide-up mb-6">
          <div className="rounded-xl bg-surface/40 ring-1 ring-white/[0.04] px-5 py-4">
            <div className="flex items-baseline justify-between mb-2">
              <span className="text-xs font-bold text-accent tabular-nums">
                Level {cosmeticLevel}
              </span>
              <span className="text-[11px] text-muted/50 tabular-nums">
                {xpInLevel} / {nextLevelXp} XP
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-surface overflow-hidden">
              <div
                className="h-full rounded-full bg-accent transition-all"
                style={{ width: `${Math.round(levelPct)}%` }}
              />
            </div>
            <p className="text-[11px] text-muted/40 mt-2">
              {isPro
                ? "Pro active — 1.5× XP and exclusive cosmetics unlocked"
                : "Some cosmetics require Pro — subscribe to unlock them as you level up"}
            </p>
          </div>
        </div>

        {/* ── Cosmetics Browser ───────────────────────────── */}
        <div className="animate-slide-up" style={{ animationDelay: "60ms" }}>
          <h2 className="text-xs font-bold text-muted/60 uppercase tracking-wider mb-3 flex items-center gap-3">
            Cosmetics
            <span className="flex-1 h-px bg-white/[0.03]" />
          </h2>

          {/* Category Tabs */}
          <div className="flex flex-wrap gap-1 mb-4">
            {CATEGORIES.map((cat) => {
              const count = COSMETIC_REWARDS.filter(
                (r) => r.type === cat.key && ownedIds.has(r.id),
              ).length;
              const total = COSMETIC_REWARDS.filter(
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

            {proLockedItems.length > 0 && (
              <section>
                <h3 className="text-[11px] font-bold text-amber-400/70 uppercase tracking-widest mb-2 flex items-center gap-2">
                  Pro Exclusive
                  <Link
                    href="/pro"
                    className="text-[10px] font-semibold text-amber-400/60 hover:text-amber-400 transition-colors normal-case tracking-normal"
                  >
                    Upgrade →
                  </Link>
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {proLockedItems.map((item) => (
                    <ItemCard
                      key={item.id}
                      item={item}
                      active={false}
                      locked={false}
                      proLocked
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
      </div>
    </main>
  );
}

/* ── Item Card ─────────────────────────────────────────── */

function ItemCard({
  item,
  active,
  locked,
  proLocked,
  onToggle,
}: {
  item: CosmeticReward;
  active: boolean;
  locked: boolean;
  proLocked?: boolean;
  onToggle: () => void;
}) {
  const content = (
    <div
      className={`group relative text-left rounded-lg px-4 py-3.5 ring-1 transition-all w-full ${
        proLocked
          ? "ring-amber-400/20 bg-amber-400/[0.04] cursor-pointer hover:ring-amber-400/30 hover:bg-amber-400/[0.07]"
          : locked
            ? "ring-white/[0.05] bg-surface/30 cursor-default opacity-60"
            : active
              ? "ring-accent/40 bg-accent/[0.08]"
              : "ring-white/[0.06] bg-surface/40 hover:ring-white/[0.12] hover:bg-white/[0.03]"
      }`}
    >
      {active && (
        <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-accent shadow-[0_0_6px_rgba(77,158,255,0.5)]" />
      )}
      {locked && !proLocked && (
        <span className="absolute top-2.5 right-2.5 text-muted/20">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </span>
      )}
      {proLocked && (
        <span className="absolute top-2.5 right-2.5 text-[9px] font-black tracking-wider text-amber-400 bg-amber-400/10 ring-1 ring-amber-400/30 px-1.5 py-0.5 rounded">
          PRO
        </span>
      )}

      <div className={`mb-2 ${locked ? "saturate-[0.4]" : proLocked ? "saturate-[0.6] opacity-70" : ""}`}>
        <ItemVisual item={item} />
      </div>

      <p className={`text-xs font-medium truncate ${
        active ? "text-accent" : proLocked ? "text-amber-400/70" : locked ? "text-muted/60" : "text-text"
      }`}>
        {item.name}
      </p>
      <p className={`text-[10px] mt-0.5 ${proLocked ? "text-amber-400/40" : "text-muted/40"}`}>
        {proLocked ? "Subscribe to unlock" : locked ? `Level ${item.level}` : active ? "Equipped" : "Click to equip"}
      </p>
    </div>
  );

  if (proLocked) {
    return (
      <Link href="/pro" className="block">
        {content}
      </Link>
    );
  }

  return (
    <button
      onClick={onToggle}
      disabled={locked}
      className="text-left w-full"
    >
      {content}
    </button>
  );
}

/* ── Item Visual ───────────────────────────────────────── */

function ItemVisual({ item }: { item: CosmeticReward }) {
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
