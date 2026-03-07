"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
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

/* ── Cosmetics Section ─────────────────────────────────── */

export function CosmeticsSection({ totalXp }: { totalXp: number }) {
  const { data: session } = useSession();
  const isPro = session?.user?.isPro ?? false;

  const [cosmeticsData, setCosmeticsData] = useState<CosmeticsData | null>(null);
  const [active, setActive] = useState<ActiveState>(EMPTY_ACTIVE);
  const [saving, setSaving] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category>("badge");
  const [collapsed, setCollapsed] = useState(true);

  useEffect(() => {
    fetch("/api/cosmetics")
      .then((r) => r.json())
      .then((data: CosmeticsData) => {
        setCosmeticsData(data);
        setActive(data.active);
      })
      .catch(() => {});
  }, []);

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

  const { level: cosmeticLevel, currentXp: xpInLevel, nextLevelXp } = getXpLevel(totalXp);
  const levelPct = (xpInLevel / nextLevelXp) * 100;

  const ownedIds = new Set(cosmeticsData?.unlocked.map((u) => u.cosmeticId) ?? []);
  const categoryInfo = CATEGORIES.find((c) => c.key === selectedCategory)!;
  const allItems = COSMETIC_REWARDS.filter((r) => r.type === selectedCategory);
  const ownedItems = allItems.filter((r) => ownedIds.has(r.id));
  const lockedItems = allItems.filter((r) => !ownedIds.has(r.id));

  // Pro-locked: items that require Pro and the user doesn't have it
  // Level-locked: items requiring only a level (or Pro items when user is already Pro)
  const proLockedItems = lockedItems.filter((r) => r.proOnly && !isPro);
  const levelLockedItems = lockedItems.filter((r) => !r.proOnly || isPro);

  return (
    <section>
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full text-left text-xs font-bold text-muted/60 uppercase tracking-wider mb-3 flex items-center gap-3 group cursor-pointer"
      >
        <span className="flex items-center gap-2">
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="currentColor"
            className={`transition-transform ${collapsed ? "" : "rotate-90"}`}
          >
            <path d="M8 5v14l11-7z" />
          </svg>
          Cosmetics
        </span>
        {saving && <span className="text-xs text-accent/50 normal-case tracking-normal font-normal">saving...</span>}
        <span className="flex-1 h-px bg-white/[0.03]" />
      </button>

      {!collapsed && (
        <div className="space-y-4 animate-fade-in">
          {/* Level Progress */}
          <div className="rounded-xl bg-surface/40 ring-1 ring-white/[0.04] px-5 py-4">
            <div className="flex items-baseline justify-between mb-2">
              <span className="text-xs font-bold text-accent tabular-nums">
                Level {cosmeticLevel}
              </span>
              <span className="text-xs text-muted/65 tabular-nums">
                {xpInLevel} / {nextLevelXp} XP
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-surface overflow-hidden">
              <div
                className="h-full rounded-full bg-accent transition-all"
                style={{ width: `${Math.round(levelPct)}%` }}
              />
            </div>
            <p className="text-xs text-muted/60 mt-2">
              All cosmetics are free to earn through gameplay
            </p>
          </div>

          {/* Loading state */}
          {!cosmeticsData && (
            <div className="space-y-2">
              <div className="h-8 rounded bg-surface/30 animate-pulse" />
              <div className="h-48 rounded-xl bg-surface/30 animate-pulse" />
            </div>
          )}

          {/* Cosmetics Browser */}
          {cosmeticsData && (
            <div>
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
                          selectedCategory === cat.key ? "text-accent/50" : "text-muted/60"
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
                  <div>
                    <h3 className="text-xs font-bold text-correct/70 uppercase tracking-widest mb-2">
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
                  </div>
                )}

                {levelLockedItems.length > 0 && (
                  <div>
                    <h3 className="text-xs font-bold text-muted/50 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                      Level Up to Unlock
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {levelLockedItems.map((item) => (
                        <ItemCard
                          key={item.id}
                          item={item}
                          active={false}
                          locked
                          onToggle={() => {}}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {proLockedItems.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xs font-bold text-accent/55 uppercase tracking-widest flex items-center gap-1.5">
                        <span>✦</span>
                        Pro Exclusive
                      </h3>
                      <Link
                        href="/pro"
                        className="text-[11px] font-bold text-accent/50 hover:text-accent/80 transition-colors"
                      >
                        Unlock with Pro →
                      </Link>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {proLockedItems.map((item) => (
                        <ItemCard
                          key={item.id}
                          item={item}
                          active={false}
                          locked
                          proLocked
                          onToggle={() => {}}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {allItems.length === 0 && (
                  <p className="text-sm text-muted/60 py-8 text-center">
                    No items in this category yet.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
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
  return (
    <button
      onClick={onToggle}
      disabled={locked}
      className={`group relative text-left rounded-lg px-4 py-3.5 ring-1 transition-all ${
        locked
          ? proLocked
            ? "ring-accent/15 bg-accent/[0.03] cursor-default opacity-70"
            : "ring-white/[0.05] bg-surface/30 cursor-default opacity-60"
          : active
            ? "ring-accent/40 bg-accent/[0.08]"
            : "ring-white/[0.06] bg-surface/40 hover:ring-white/[0.12] hover:bg-white/[0.03]"
      }`}
    >
      {active && (
        <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-accent shadow-[0_0_6px_rgba(77,158,255,0.5)]" />
      )}
      {locked && (
        <span className={`absolute top-2.5 right-2.5 ${proLocked ? "text-accent/30" : "text-muted/20"}`}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </span>
      )}

      <div className={`mb-2 ${locked && !proLocked ? "saturate-[0.4]" : locked && proLocked ? "saturate-[0.5] opacity-80" : ""}`}>
        <ItemVisual item={item} />
      </div>

      <p className={`text-xs font-medium truncate ${
        active ? "text-accent" : proLocked ? "text-accent/60" : locked ? "text-muted/60" : "text-text"
      }`}>
        {item.name}
      </p>
      <p className={`text-xs mt-0.5 ${proLocked ? "text-accent/40" : "text-muted/60"}`}>
        {proLocked ? "Pro" : locked ? `Level ${item.level}` : active ? "Equipped" : "Click to equip"}
      </p>
    </button>
  );
}

/* ── Item Visual ───────────────────────────────────────── */

function ItemVisual({ item }: { item: CosmeticReward }) {
  switch (item.type) {
    case "badge":
      return <span className="text-2xl">{BADGE_EMOJIS[item.id] ?? item.value}</span>;
    case "title":
      return <span className="text-sm text-accent/80 font-medium">{TITLE_TEXTS[item.id] ?? item.value}</span>;
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
      return <span className={`text-sm font-medium text-text ${effectClass}`}>TypeOff</span>;
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
          <span className="text-xs text-muted/60 capitalize">{def.shape}</span>
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
