"use client";

import { useEffect, useState, useCallback } from "react";
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

type CategoryKey =
  | "badge"
  | "title"
  | "nameColor"
  | "nameEffect"
  | "cursorStyle"
  | "profileBorder"
  | "typingTheme";

interface CategoryDef {
  key: CategoryKey;
  label: string;
  slotLabel: string;
  field: keyof ActiveState;
}

const CATEGORIES: CategoryDef[] = [
  { key: "badge",         label: "Badges",         slotLabel: "Badge",   field: "activeBadge" },
  { key: "title",         label: "Titles",          slotLabel: "Title",   field: "activeTitle" },
  { key: "nameColor",     label: "Name Colors",     slotLabel: "Color",   field: "activeNameColor" },
  { key: "nameEffect",    label: "Name Effects",    slotLabel: "Effect",  field: "activeNameEffect" },
  { key: "cursorStyle",   label: "Cursors",         slotLabel: "Cursor",  field: "activeCursorStyle" },
  { key: "profileBorder", label: "Profile Borders", slotLabel: "Border",  field: "activeProfileBorder" },
  { key: "typingTheme",   label: "Themes",          slotLabel: "Theme",   field: "activeTypingTheme" },
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

/* ── Main Component ─────────────────────────────────────── */

export function ItemsBrowser({
  totalXp,
  isPro,
  username,
}: {
  totalXp: number;
  isPro: boolean;
  username: string;
}) {
  const [cosmeticsData, setCosmeticsData] = useState<CosmeticsData | null>(null);
  const [active, setActive] = useState<ActiveState>(EMPTY_ACTIVE);
  const [saving, setSaving] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<CategoryKey>("badge");
  const [hoverPreview, setHoverPreview] = useState<{ field: keyof ActiveState; id: string } | null>(null);
  const [lockedPreview, setLockedPreview] = useState<{
    item: CosmeticReward;
    field: keyof ActiveState;
    reason: "level" | "pro";
  } | null>(null);

  useEffect(() => {
    fetch("/api/cosmetics")
      .then((r) => r.json())
      .then((data: CosmeticsData) => {
        setCosmeticsData(data);
        setActive(data.active);
      })
      .catch(() => {});
  }, []);

  // Clear locked preview when switching categories
  const handleCategoryChange = useCallback((cat: CategoryKey) => {
    setSelectedCategory(cat);
    setLockedPreview(null);
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
      setLockedPreview(null);
      const newActive = {
        ...active,
        [field]: active[field] === id ? null : id,
      };
      save(newActive);
    },
    [active, save],
  );

  const handleLockedClick = useCallback(
    (item: CosmeticReward, field: keyof ActiveState, reason: "level" | "pro") => {
      setLockedPreview((prev) =>
        prev?.item.id === item.id ? null : { item, field, reason },
      );
    },
    [],
  );

  const xpInfo = getXpLevel(totalXp);
  const xpPct = (xpInfo.currentXp / xpInfo.nextLevelXp) * 100;

  const ownedIds = new Set(cosmeticsData?.unlocked.map((u) => u.cosmeticId) ?? []);

  const selectedCat = CATEGORIES.find((c) => c.key === selectedCategory)!;
  const allItems = COSMETIC_REWARDS.filter((r) => r.type === selectedCategory);
  const ownedItems = allItems.filter((r) => ownedIds.has(r.id));
  const lockedItems = allItems.filter((r) => !ownedIds.has(r.id));

  // Split locked items: level-gated vs. Pro-exclusive
  const levelLockedItems = lockedItems.filter((r) => !r.proOnly || isPro);
  const proExclusiveItems = lockedItems.filter((r) => r.proOnly && !isPro);

  // Live preview: hoverPreview > lockedPreview > active
  const previewActive: ActiveState = hoverPreview
    ? { ...active, [hoverPreview.field]: hoverPreview.id }
    : lockedPreview
    ? { ...active, [lockedPreview.field]: lockedPreview.item.id }
    : active;

  // Derive preview display values
  const previewBadge = previewActive.activeBadge
    ? (BADGE_EMOJIS[previewActive.activeBadge] ?? null)
    : null;
  const previewTitle = previewActive.activeTitle
    ? (TITLE_TEXTS[previewActive.activeTitle] ?? null)
    : null;
  const previewColor = previewActive.activeNameColor
    ? (NAME_COLORS[previewActive.activeNameColor] ?? previewActive.activeNameColor)
    : null;
  const previewEffect = previewActive.activeNameEffect
    ? (NAME_EFFECT_CLASSES[previewActive.activeNameEffect] ?? "")
    : "";

  // What's actually being previewed right now
  const activePreviewItem: CosmeticReward | null = (() => {
    if (hoverPreview) return COSMETIC_REWARDS.find((r) => r.id === hoverPreview.id) ?? null;
    if (lockedPreview) return lockedPreview.item;
    return null;
  })();
  const isPreviewingLocked = activePreviewItem != null && !ownedIds.has(activePreviewItem.id);
  const isPreviewingPro = isPreviewingLocked && activePreviewItem?.proOnly && !isPro;
  const isPreviewingNewItem = activePreviewItem != null;
  const isLockedPinned = lockedPreview !== null && hoverPreview === null;

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">

      {/* ── Header ────────────────────────────────────────── */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-text tracking-tight">Cosmetics</h1>
          <p className="text-xs text-muted/60 mt-0.5">Earn cosmetics by levelling up through gameplay</p>
        </div>
        <div className="flex items-center gap-2">
          {saving && (
            <span className="text-[10px] text-accent/50 tabular-nums">saving...</span>
          )}
          {isPro && (
            <span className="text-[10px] font-bold text-amber-400/70 bg-amber-400/[0.08] px-2 py-0.5 rounded uppercase tracking-wider">
              Pro
            </span>
          )}
        </div>
      </div>

      {/* ── XP Level Bar ──────────────────────────────────── */}
      <div className="rounded-xl bg-surface/50 ring-1 ring-white/[0.04] px-5 py-4">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-3">
            <span className="text-sm font-black text-accent tabular-nums">Level {xpInfo.level}</span>
            <span className="text-[11px] text-muted/55 tabular-nums">
              {xpInfo.currentXp.toLocaleString()} / {xpInfo.nextLevelXp.toLocaleString()} XP
            </span>
          </div>
          <span className="text-[11px] text-muted/65 tabular-nums">
            {(xpInfo.nextLevelXp - xpInfo.currentXp).toLocaleString()} to next level
          </span>
        </div>
        <div className="h-1 rounded-full bg-white/[0.04] overflow-hidden">
          <div
            className="h-full rounded-full bg-accent transition-all"
            style={{ width: `${Math.round(xpPct)}%` }}
          />
        </div>
        {!isPro && (
          <p className="text-[10px] text-muted/45 mt-2">
            Pro subscribers earn 1.5× XP and unlock exclusive items
          </p>
        )}
      </div>

      {/* ── Name Preview ──────────────────────────────────── */}
      <div className="space-y-2">
        <div className={`rounded-xl ring-1 px-5 py-4 transition-all duration-200 ${
          isPreviewingPro && isLockedPinned
            ? "bg-amber-400/[0.03] ring-amber-400/15"
            : isPreviewingLocked && isLockedPinned
            ? "bg-surface/50 ring-white/[0.07]"
            : isPreviewingNewItem
            ? "bg-surface/60 ring-white/[0.08]"
            : "bg-surface/40 ring-white/[0.04]"
        }`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold text-muted/50 uppercase tracking-widest">
              {isPreviewingLocked && isLockedPinned
                ? isPreviewingPro
                  ? "Previewing · Pro Exclusive"
                  : "Previewing · Locked"
                : isPreviewingNewItem
                ? "Previewing"
                : "Your Look"}
            </span>
            <div className="flex items-center gap-2">
              {isLockedPinned && (
                <button
                  onClick={() => setLockedPreview(null)}
                  className="text-[10px] text-muted/40 hover:text-muted/70 transition-colors"
                  aria-label="Dismiss preview"
                >
                  ✕
                </button>
              )}
              {isPreviewingNewItem && !isLockedPinned && (
                <span className="text-[10px] text-accent/50 animate-pulse">live preview</span>
              )}
              {isLockedPinned && (
                <span className={`text-[10px] ${isPreviewingPro ? "text-amber-400/50" : "text-muted/40"}`}>
                  click item to dismiss
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {previewBadge && (
              <span className="text-2xl leading-none">{previewBadge}</span>
            )}
            <div className="min-w-0">
              <span
                className={`text-lg font-bold leading-tight block truncate ${previewEffect}`}
                style={{ color: previewColor ?? undefined }}
              >
                {username}
              </span>
              {previewTitle && (
                <span className="text-[11px] text-amber-400/65 leading-tight block mt-0.5">
                  {previewTitle}
                </span>
              )}
            </div>
            {!previewBadge && !previewColor && !previewEffect && !previewTitle && (
              <span className="text-xs text-muted/35 italic">Equip cosmetics to see your look</span>
            )}
          </div>
        </div>

        {/* Lock callout — shown when a locked item is pinned */}
        {isLockedPinned && lockedPreview && (
          <LockCallout
            item={lockedPreview.item}
            reason={lockedPreview.reason}
            currentLevel={xpInfo.level}
          />
        )}
      </div>

      {/* ── Equipped Loadout Strip ────────────────────────── */}
      <div>
        <h2 className="text-[10px] font-bold text-muted/60 uppercase tracking-widest mb-3 flex items-center gap-2.5">
          <span className="text-accent/35 text-[8px]">◆</span>
          Equipped Loadout
          <span className="flex-1 h-px bg-white/[0.03]" />
        </h2>
        <div className="grid grid-cols-7 gap-1.5">
          {CATEGORIES.map((cat) => {
            const previewId = previewActive[cat.field];
            const activeId = active[cat.field];
            const displayId = previewId;
            const displayItem = displayId
              ? COSMETIC_REWARDS.find((r) => r.id === displayId)
              : null;
            const isSelected = selectedCategory === cat.key;
            const isPreviewing = hoverPreview?.field === cat.field && hoverPreview.id !== activeId;

            return (
              <button
                key={cat.key}
                onClick={() => handleCategoryChange(cat.key)}
                className={`group relative rounded-lg px-1.5 py-2.5 ring-1 transition-all text-center flex flex-col items-center gap-1.5 ${
                  isPreviewing
                    ? "ring-accent/20 bg-accent/[0.04]"
                    : isSelected
                      ? "ring-accent/30 bg-accent/[0.06]"
                      : "ring-white/[0.05] bg-surface/40 hover:ring-white/[0.1] hover:bg-surface/60"
                }`}
              >
                <div className="text-[8px] uppercase tracking-widest text-muted/65 leading-none">
                  {cat.slotLabel}
                </div>
                <div className="h-7 flex items-center justify-center">
                  {displayItem ? (
                    <SlotPreview item={displayItem} />
                  ) : (
                    <span className="text-muted/15 text-lg">—</span>
                  )}
                </div>
                {isSelected && (
                  <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-accent" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Category Tabs ─────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex flex-wrap gap-1">
          {CATEGORIES.map((cat) => {
            const owned = COSMETIC_REWARDS.filter(
              (r) => r.type === cat.key && ownedIds.has(r.id),
            ).length;
            const total = COSMETIC_REWARDS.filter((r) => r.type === cat.key).length;
            const isSelected = selectedCategory === cat.key;

            return (
              <button
                key={cat.key}
                onClick={() => handleCategoryChange(cat.key)}
                className={`px-3 py-1.5 rounded-lg text-xs transition-all ${
                  isSelected
                    ? "bg-accent/15 text-accent ring-1 ring-accent/20"
                    : "text-muted/65 hover:text-text hover:bg-white/[0.04]"
                }`}
              >
                {cat.label}
                <span
                  className={`ml-1.5 tabular-nums text-[10px] ${
                    isSelected ? "text-accent/40" : "text-muted/45"
                  }`}
                >
                  {owned}/{total}
                </span>
              </button>
            );
          })}
        </div>

        {/* Loading skeleton */}
        {!cosmeticsData && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="h-24 rounded-xl bg-surface/30 animate-pulse"
                style={{ animationDelay: `${i * 40}ms` }}
              />
            ))}
          </div>
        )}

        {cosmeticsData && (
          <div className="space-y-6">

            {/* Unlocked items */}
            {ownedItems.length > 0 && (
              <div>
                <SectionHeader variant="owned" count={ownedItems.length} />
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {ownedItems.map((item) => (
                    <ItemCard
                      key={item.id}
                      item={item}
                      active={active[selectedCat.field] === item.id}
                      locked={false}
                      isPro={isPro}
                      isPinnedPreview={false}
                      onToggle={() => toggleCosmetic(selectedCat.field, item.id)}
                      onHoverIn={() => setHoverPreview({ field: selectedCat.field, id: item.id })}
                      onHoverOut={() => setHoverPreview(null)}
                      onLockedClick={() => {}}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Level-gated locked items */}
            {levelLockedItems.length > 0 && (
              <div>
                <SectionHeader variant="level" count={levelLockedItems.length} />
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {levelLockedItems.map((item) => (
                    <ItemCard
                      key={item.id}
                      item={item}
                      active={false}
                      locked={true}
                      isPro={isPro}
                      isPinnedPreview={lockedPreview?.item.id === item.id}
                      onToggle={() => {}}
                      onHoverIn={() => setHoverPreview({ field: selectedCat.field, id: item.id })}
                      onHoverOut={() => setHoverPreview(null)}
                      onLockedClick={() => handleLockedClick(item, selectedCat.field, "level")}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Pro-exclusive locked items */}
            {proExclusiveItems.length > 0 && (
              <div>
                <SectionHeader variant="pro" count={proExclusiveItems.length} />
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {proExclusiveItems.map((item) => (
                    <ItemCard
                      key={item.id}
                      item={item}
                      active={false}
                      locked={true}
                      isPro={isPro}
                      isPinnedPreview={lockedPreview?.item.id === item.id}
                      onToggle={() => {}}
                      onHoverIn={() => setHoverPreview({ field: selectedCat.field, id: item.id })}
                      onHoverOut={() => setHoverPreview(null)}
                      onLockedClick={() => handleLockedClick(item, selectedCat.field, "pro")}
                    />
                  ))}
                </div>
              </div>
            )}

            {allItems.length === 0 && (
              <p className="text-sm text-muted/65 py-12 text-center">
                No items in this category yet.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Lock Callout ───────────────────────────────────────── */

function LockCallout({
  item,
  reason,
  currentLevel,
}: {
  item: CosmeticReward;
  reason: "level" | "pro";
  currentLevel: number;
}) {
  const levelsNeeded = item.level - currentLevel;

  if (reason === "pro") {
    return (
      <div className="rounded-xl bg-amber-400/[0.04] ring-1 ring-amber-400/20 px-4 py-3 flex items-start gap-3" style={{ animation: "slide-up 0.2s ease-out both" }}>
        <span className="text-amber-400/60 mt-0.5 shrink-0 text-base leading-none">✦</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-amber-400/80">{item.name}</span>
            <span className="text-[9px] font-black text-amber-400 bg-amber-400/10 ring-1 ring-amber-400/25 px-1.5 py-0.5 rounded uppercase tracking-wider leading-none">
              PRO
            </span>
          </div>
          <p className="text-[11px] text-muted/60 mt-0.5 leading-snug">
            Pro exclusive · requires{" "}
            <span className="text-text/70 font-semibold">Level {item.level}</span>
            {levelsNeeded > 0 && (
              <span className="text-muted/45"> ({levelsNeeded} level{levelsNeeded !== 1 ? "s" : ""} away)</span>
            )}
          </p>
        </div>
        <Link
          href="/pro"
          className="shrink-0 self-center rounded-lg bg-amber-400/10 ring-1 ring-amber-400/25 text-amber-400 text-[11px] font-bold px-3 py-1.5 hover:bg-amber-400/20 transition-colors whitespace-nowrap leading-none"
        >
          Get Pro →
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-surface/40 ring-1 ring-white/[0.06] px-4 py-3 flex items-center gap-3" style={{ animation: "slide-up 0.2s ease-out both" }}>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted/40 shrink-0">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
      <div className="flex-1 min-w-0">
        <span className="text-xs font-semibold text-text/70">{item.name}</span>
        <span className="text-[11px] text-muted/55 ml-2">
          unlocks at <span className="text-text/60 font-semibold">Level {item.level}</span>
          {levelsNeeded > 0 && (
            <span className="text-muted/40"> · {levelsNeeded} level{levelsNeeded !== 1 ? "s" : ""} to go</span>
          )}
        </span>
      </div>
    </div>
  );
}

/* ── Section Headers ────────────────────────────────────── */

function SectionHeader({
  variant,
  count,
}: {
  variant: "owned" | "level" | "pro";
  count: number;
}) {
  if (variant === "owned") {
    return (
      <h3 className="text-[10px] font-bold text-correct/50 uppercase tracking-widest mb-2.5 flex items-center gap-2">
        Unlocked
        <span className="text-correct/25 font-normal normal-case tracking-normal">
          {count} {count === 1 ? "item" : "items"}
        </span>
      </h3>
    );
  }
  if (variant === "level") {
    return (
      <h3 className="text-[10px] font-bold text-muted/50 uppercase tracking-widest mb-2.5 flex items-center gap-2">
        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-60">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
        Level Up to Unlock
        <span className="text-muted/30 font-normal normal-case tracking-normal">
          {count} {count === 1 ? "item" : "items"}
        </span>
      </h3>
    );
  }
  // pro
  return (
    <h3 className="text-[10px] font-bold text-amber-400/60 uppercase tracking-widest mb-2.5 flex items-center gap-2">
      <span className="text-amber-400/40">✦</span>
      Pro Exclusive
      <span className="text-amber-400/30 font-normal normal-case tracking-normal">
        {count} {count === 1 ? "item" : "items"}
      </span>
    </h3>
  );
}

/* ── Slot Preview (loadout strip) ───────────────────────── */

function SlotPreview({ item }: { item: CosmeticReward }) {
  switch (item.type) {
    case "badge":
      return <span className="text-xl">{BADGE_EMOJIS[item.id] ?? item.value}</span>;
    case "title":
      return <span className="text-[10px] text-amber-400/70 font-medium truncate max-w-full px-0.5">{TITLE_TEXTS[item.id] ?? item.value}</span>;
    case "nameColor": {
      const hex = NAME_COLORS[item.id] ?? item.value;
      return (
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full ring-1 ring-white/10 shrink-0" style={{ backgroundColor: hex }} />
          <span className="text-xs font-bold" style={{ color: hex }}>Aa</span>
        </div>
      );
    }
    case "nameEffect": {
      const effectClass = NAME_EFFECT_CLASSES[item.id] ?? "";
      return <span className={`text-xs font-bold text-text ${effectClass}`}>Aa</span>;
    }
    case "cursorStyle": {
      const def = CURSOR_STYLES[item.id];
      if (!def) return <span className="text-muted/65 text-xs">?</span>;
      return (
        <span
          className="rounded-sm"
          style={{
            width: def.shape === "block" ? "1ch" : 2,
            height: def.shape === "underline" ? 2 : 16,
            backgroundColor: def.color,
            boxShadow: def.glowColor ? `0 0 6px ${def.glowColor}` : undefined,
            opacity: def.shape === "block" ? 0.45 : 1,
          }}
        />
      );
    }
    case "profileBorder": {
      const def = PROFILE_BORDERS[item.id];
      if (!def) return null;
      return <div className={`w-8 h-5 rounded bg-surface/60 ring-1 ring-white/[0.06] ${def.className}`} />;
    }
    case "typingTheme": {
      const def = TYPING_THEMES[item.id];
      if (!def) return null;
      return (
        <span className="flex gap-0.5">
          {def.palette.slice(0, 3).map((c, i) => (
            <span key={i} className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c }} />
          ))}
        </span>
      );
    }
    default:
      return null;
  }
}

/* ── Item Card ──────────────────────────────────────────── */

function ItemCard({
  item,
  active,
  locked,
  isPro,
  isPinnedPreview,
  onToggle,
  onHoverIn,
  onHoverOut,
  onLockedClick,
}: {
  item: CosmeticReward;
  active: boolean;
  locked: boolean;
  isPro: boolean;
  isPinnedPreview: boolean;
  onToggle: () => void;
  onHoverIn: () => void;
  onHoverOut: () => void;
  onLockedClick: () => void;
}) {
  const isProLocked = locked && item.proOnly && !isPro;

  // Pro-locked card: button style (no redirect), shows level + PRO badge
  if (isProLocked) {
    return (
      <button
        onClick={onLockedClick}
        onMouseEnter={onHoverIn}
        onMouseLeave={onHoverOut}
        className={`group relative text-left rounded-xl px-4 py-4 ring-1 transition-all ${
          isPinnedPreview
            ? "ring-amber-400/35 bg-amber-400/[0.08]"
            : "ring-amber-400/15 bg-amber-400/[0.03] hover:ring-amber-400/25 hover:bg-amber-400/[0.05]"
        }`}
      >
        <span className="absolute top-2.5 right-2.5 text-[9px] font-black text-amber-400/60 bg-amber-400/[0.08] px-1.5 py-0.5 rounded uppercase tracking-wider leading-none">
          PRO
        </span>
        <div className="mb-3 h-8 flex items-center opacity-50 group-hover:opacity-70 transition-opacity">
          <ItemVisual item={item} />
        </div>
        <p className="text-xs font-semibold truncate leading-tight text-muted/65 group-hover:text-muted/80 transition-colors">
          {item.name}
        </p>
        <p className="text-[10px] mt-0.5 leading-tight text-amber-400/40 group-hover:text-amber-400/60 transition-colors tabular-nums">
          Lv. {item.level} · Pro
        </p>
      </button>
    );
  }

  // Level-locked or owned card
  return (
    <button
      onClick={locked ? onLockedClick : onToggle}
      onMouseEnter={onHoverIn}
      onMouseLeave={onHoverOut}
      className={`group relative text-left rounded-xl px-4 py-4 ring-1 transition-all ${
        locked
          ? isPinnedPreview
            ? "ring-white/[0.12] bg-surface/40 opacity-70"
            : "ring-white/[0.04] bg-surface/20 opacity-50 hover:opacity-65 hover:ring-white/[0.08] cursor-pointer grayscale hover:grayscale-[0.5]"
          : active
            ? "ring-accent/35 bg-accent/[0.07] shadow-[0_0_20px_rgba(77,158,255,0.06)]"
            : "ring-white/[0.05] bg-surface/40 hover:ring-white/[0.1] hover:bg-surface/60"
      }`}
    >
      {active && (
        <span className="absolute top-3 right-3 w-1.5 h-1.5 rounded-full bg-accent shadow-[0_0_6px_rgba(77,158,255,0.6)]" />
      )}
      {locked && !isPinnedPreview && (
        <span className="absolute top-3 right-3 text-muted/20">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </span>
      )}
      {locked && isPinnedPreview && (
        <span className="absolute top-3 right-3 text-accent/40 text-[10px]">👁</span>
      )}
      <div className="mb-3 h-8 flex items-center">
        <ItemVisual item={item} />
      </div>
      <p className={`text-xs font-semibold truncate leading-tight ${
        active ? "text-accent" : locked ? "text-muted/60" : "text-text/80"
      }`}>
        {item.name}
      </p>
      <p className="text-[10px] mt-0.5 leading-tight">
        {locked ? (
          <span className="text-muted/55 tabular-nums">Lv. {item.level}</span>
        ) : active ? (
          <span className="text-accent/50">Equipped</span>
        ) : (
          <span className="text-muted/45 group-hover:text-muted/65 transition-colors">Click to equip</span>
        )}
      </p>
    </button>
  );
}

/* ── Item Visual (full card version) ────────────────────── */

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
          <span className="w-5 h-5 rounded-full ring-1 ring-white/10 shrink-0" style={{ backgroundColor: hex }} />
          <span className="text-sm font-bold" style={{ color: hex }}>Aa</span>
        </div>
      );
    }
    case "nameEffect": {
      const effectClass = NAME_EFFECT_CLASSES[item.id] ?? "";
      return <span className={`text-sm font-bold text-text ${effectClass}`}>TypeOff</span>;
    }
    case "cursorStyle": {
      const def = CURSOR_STYLES[item.id];
      if (!def) return <span className="text-muted/65 text-xs">?</span>;
      return (
        <div className="flex items-center gap-2.5">
          <span
            className="rounded-sm shrink-0"
            style={{
              width: def.shape === "block" || def.shape === "underline" ? "1ch" : 2,
              height: def.shape === "underline" ? 2 : 20,
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
      return <div className={`w-12 h-8 rounded-md bg-surface/60 ring-1 ring-white/[0.06] ${def.className}`} />;
    }
    case "typingTheme": {
      const def = TYPING_THEMES[item.id];
      if (!def) return null;
      return (
        <span className="flex gap-1">
          {def.palette.map((c, i) => (
            <span key={i} className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: c }} />
          ))}
        </span>
      );
    }
    default:
      return null;
  }
}
