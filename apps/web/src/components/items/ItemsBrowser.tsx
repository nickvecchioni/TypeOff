"use client";

import { useEffect, useState, useCallback, useRef } from "react";
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
  type CursorStyleDef,
} from "@typeoff/shared";
import { useUpdateCosmetics } from "@/contexts/CosmeticContext";

/* ── Border color map ───────────────────────────────────── */

const BORDER_COLORS: Record<string, string> = {
  s1_border_ember:     "#f97316",
  s1_border_ice:       "#67e8f9",
  s1_border_diamond:   "#3b82f6",
  s1_border_void:      "#818cf8",
  pro_border_inferno:  "#ef4444",
  pro_border_aurora:   "#34d399",
  pro_border_obsidian: "#a78bfa",
};

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
  const updateCosmeticsContext = useUpdateCosmetics();

  const [cosmeticsData, setCosmeticsData] = useState<CosmeticsData | null>(null);
  const [active, setActive] = useState<ActiveState>(EMPTY_ACTIVE);
  const [saving, setSaving] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<CategoryKey>("badge");
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
    // Immediately sync nav bar and any other consumers of CosmeticContext
    updateCosmeticsContext(newActive);
    try {
      await fetch("/api/cosmetics", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newActive),
      });
    } finally {
      setSaving(false);
    }
  }, [updateCosmeticsContext]);

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

  const levelLockedItems = lockedItems.filter((r) => !r.proOnly || isPro);
  const proExclusiveItems = lockedItems.filter((r) => r.proOnly && !isPro);

  // Live preview: lockedPreview > active
  const previewActive: ActiveState = lockedPreview
    ? { ...active, [lockedPreview.field]: lockedPreview.item.id }
    : active;

  const activePreviewItem: CosmeticReward | null = lockedPreview ? lockedPreview.item : null;
  const isPreviewingLocked = activePreviewItem != null && !ownedIds.has(activePreviewItem.id);
  const isPreviewingPro = isPreviewingLocked && !!activePreviewItem?.proOnly && !isPro;
  const isPreviewingNewItem = activePreviewItem != null;

  if (!cosmeticsData) {
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-lg font-bold text-text tracking-tight">Cosmetics</h1>
            <p className="text-xs text-muted/60 mt-0.5">Earn cosmetics by levelling up through gameplay</p>
          </div>
        </div>
        {/* XP bar skeleton */}
        <div className="rounded-xl bg-surface/50 ring-1 ring-white/[0.04] px-5 py-4">
          <div className="h-4 w-48 rounded bg-surface/60 animate-pulse mb-2.5" />
          <div className="h-1 rounded-full bg-white/[0.04]" />
        </div>
        {/* Profile card skeleton */}
        <div className="rounded-xl bg-surface/40 ring-1 ring-white/[0.06] px-5 py-4">
          <div className="h-3 w-20 rounded bg-surface/60 animate-pulse mb-4" />
          <div className="h-7 w-36 rounded bg-surface/60 animate-pulse" />
        </div>
        {/* Loadout skeleton */}
        <div className="grid grid-cols-7 gap-1.5">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-16 rounded-lg bg-surface/40 animate-pulse" style={{ animationDelay: `${i * 40}ms` }} />
          ))}
        </div>
        {/* Item grid skeleton */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-surface/30 animate-pulse" style={{ animationDelay: `${i * 40}ms` }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">

      {/* ── Header ────────────────────────────────────────── */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-text tracking-tight">Cosmetics</h1>
          <p className="text-xs text-muted/60 mt-0.5">Earn cosmetics by levelling up through gameplay</p>
        </div>
        <div className="flex items-center gap-2">
          {saving && (
            <span className="text-xs text-accent/50 tabular-nums">saving...</span>
          )}
          {isPro && (
            <span className="text-xs font-bold text-accent/70 bg-accent/[0.08] px-2 py-0.5 rounded uppercase tracking-wider">
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
            <span className="text-xs text-muted/55 tabular-nums">
              {xpInfo.currentXp.toLocaleString()} / {xpInfo.nextLevelXp.toLocaleString()} XP
            </span>
          </div>
          <span className="text-xs text-muted/65 tabular-nums">
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
          <p className="text-xs text-muted/45 mt-2">
            Pro subscribers earn 1.5× XP and unlock exclusive items
          </p>
        )}
      </div>

      {/* ── Profile Header Card Preview ───────────────────── */}
      <div className="space-y-2">
        <ProfileHeaderCard
          username={username}
          previewActive={previewActive}
          isPreviewingNewItem={isPreviewingNewItem}
          isPreviewingLocked={isPreviewingLocked}
          isPreviewingPro={isPreviewingPro}
          onDismiss={() => setLockedPreview(null)}
        />
        {lockedPreview && (
          <LockCallout
            item={lockedPreview.item}
            reason={lockedPreview.reason}
            currentLevel={xpInfo.level}
          />
        )}
      </div>

      {/* ── Typing Preview ────────────────────────────────── */}
      <TypingPreview
        cursorStyleId={previewActive.activeCursorStyle}
        typingThemeId={previewActive.activeTypingTheme}
      />

      {/* ── Equipped Loadout Strip ────────────────────────── */}
      <div>
        <h2 className="text-xs font-bold text-muted/60 uppercase tracking-widest mb-3 flex items-center gap-2.5">
          <span className="text-accent/35 text-[10px]">◆</span>
          Equipped Loadout
          <span className="flex-1 h-px bg-white/[0.03]" />
        </h2>
        <div className="grid grid-cols-7 gap-1.5">
          {CATEGORIES.map((cat) => (
            <LoadoutSlot
              key={cat.key}
              cat={cat}
              previewActive={previewActive}
              active={active}
              selectedCategory={selectedCategory}
              lockedPreview={lockedPreview}
              onSelect={handleCategoryChange}
            />
          ))}
        </div>
      </div>

      {/* ── Category Tabs ─────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex flex-wrap gap-1">
          {CATEGORIES.map((cat) => (
            <CategoryTab
              key={cat.key}
              cat={cat}
              selectedCategory={selectedCategory}
              ownedIds={ownedIds}
              onSelect={handleCategoryChange}
            />
          ))}
        </div>

        <div className="space-y-6">
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
                      onLockedClick={() => {}}
                    />
                  ))}
                </div>
              </div>
            )}

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
                      onLockedClick={() => handleLockedClick(item, selectedCat.field, "level")}
                    />
                  ))}
                </div>
              </div>
            )}

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
      </div>
    </div>
  );
}

/* ── Profile Header Card (preview) ─────────────────────── */

function ProfileHeaderCard({
  username,
  previewActive,
  isPreviewingNewItem,
  isPreviewingLocked,
  isPreviewingPro,
  onDismiss,
}: {
  username: string;
  previewActive: ActiveState;
  isPreviewingNewItem: boolean;
  isPreviewingLocked: boolean;
  isPreviewingPro: boolean;
  onDismiss: () => void;
}) {
  const badge = previewActive.activeBadge ? (BADGE_EMOJIS[previewActive.activeBadge] ?? null) : null;
  const title = previewActive.activeTitle ? (TITLE_TEXTS[previewActive.activeTitle] ?? null) : null;
  const colorHex = previewActive.activeNameColor
    ? (NAME_COLORS[previewActive.activeNameColor] ?? null)
    : null;
  const effectClass = previewActive.activeNameEffect
    ? (NAME_EFFECT_CLASSES[previewActive.activeNameEffect] ?? "")
    : "";
  const borderDef = previewActive.activeProfileBorder
    ? PROFILE_BORDERS[previewActive.activeProfileBorder]
    : null;

  const headerLabel =
    isPreviewingLocked
      ? isPreviewingPro
        ? "Preview · Pro Exclusive"
        : "Preview · Not Owned"
      : "Your Profile";

  const hasAnyProfileCosmetic = badge || title || colorHex || effectClass || borderDef;

  return (
    <div
      className={`rounded-xl overflow-hidden ring-1 ring-white/[0.06] transition-all duration-200 ${
        borderDef ? borderDef.className : ""
      }`}
    >
      <div
        className={`px-5 py-4 transition-all duration-200 ${
          isPreviewingPro
            ? "bg-accent/[0.03]"
            : isPreviewingNewItem
            ? "bg-surface/60"
            : "bg-surface/40"
        }`}
      >
        {/* Header row */}
        <div className="flex items-center justify-between mb-4">
          <span
            className={`text-xs font-bold uppercase tracking-widest ${
              isPreviewingNewItem ? "text-accent/50" : "text-muted/45"
            }`}
          >
            {headerLabel}
          </span>
          <div className="flex items-center gap-2">
            {isPreviewingNewItem && (
              <>
                <span className={`text-xs ${isPreviewingPro ? "text-accent/40" : "text-muted/35"}`}>
                  click item to dismiss
                </span>
                <button
                  onClick={onDismiss}
                  className="text-xs text-muted/35 hover:text-muted/65 transition-colors"
                  aria-label="Dismiss preview"
                >
                  ✕
                </button>
              </>
            )}
          </div>
        </div>

        {/* Profile card content */}
        <div className="flex items-center gap-3.5">
          {badge && (
            <span className="text-3xl leading-none shrink-0">{badge}</span>
          )}
          <div className="min-w-0 flex-1">
            <p
              className={`text-xl font-bold leading-tight truncate ${effectClass}`}
              style={{ color: colorHex ?? undefined }}
            >
              {username}
            </p>
            {title && (
              <p className="text-xs text-accent/65 leading-tight mt-1">{title}</p>
            )}
          </div>
          {!hasAnyProfileCosmetic && (
            <span className="text-xs text-muted/30 italic shrink-0">
              Equip cosmetics to customize your look
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Loadout Slot ───────────────────────────────────────── */

function LoadoutSlot({
  cat,
  previewActive,
  active,
  selectedCategory,
  lockedPreview,
  onSelect,
}: {
  cat: CategoryDef;
  previewActive: ActiveState;
  active: ActiveState;
  selectedCategory: CategoryKey;
  lockedPreview: { item: CosmeticReward; field: keyof ActiveState; reason: "level" | "pro" } | null;
  onSelect: (key: CategoryKey) => void;
}) {
  const previewId = previewActive[cat.field];
  const activeId = active[cat.field];
  const displayItem = previewId
    ? COSMETIC_REWARDS.find((r) => r.id === previewId)
    : null;
  const isSelected = selectedCategory === cat.key;
  const isPreviewing = lockedPreview?.field === cat.field && lockedPreview.item.id !== activeId;

  return (
    <button
      onClick={() => onSelect(cat.key)}
      className={`group relative rounded-lg px-1.5 py-2.5 ring-1 transition-all text-center flex flex-col items-center gap-1.5 ${
        isPreviewing
          ? "ring-accent/20 bg-accent/[0.04]"
          : isSelected
            ? "ring-accent/30 bg-accent/[0.06]"
            : "ring-white/[0.05] bg-surface/40 hover:ring-white/[0.1] hover:bg-surface/60"
      }`}
    >
      <div className="text-[10px] uppercase tracking-widest text-muted/65 leading-none">
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
}

/* ── Category Tab ───────────────────────────────────────── */

function CategoryTab({
  cat,
  selectedCategory,
  ownedIds,
  onSelect,
}: {
  cat: CategoryDef;
  selectedCategory: CategoryKey;
  ownedIds: Set<string>;
  onSelect: (key: CategoryKey) => void;
}) {
  const owned = COSMETIC_REWARDS.filter(
    (r) => r.type === cat.key && ownedIds.has(r.id),
  ).length;
  const total = COSMETIC_REWARDS.filter((r) => r.type === cat.key).length;
  const isSelected = selectedCategory === cat.key;

  return (
    <button
      onClick={() => onSelect(cat.key)}
      className={`px-3 py-1.5 rounded-lg text-xs transition-all ${
        isSelected
          ? "bg-accent/15 text-accent ring-1 ring-accent/20"
          : "text-muted/65 hover:text-text hover:bg-white/[0.04]"
      }`}
    >
      {cat.label}
      <span
        className={`ml-1.5 tabular-nums text-xs ${
          isSelected ? "text-accent/40" : "text-muted/45"
        }`}
      >
        {owned}/{total}
      </span>
    </button>
  );
}

/* ── Typing Preview ────────────────────────────────────── */

const SAMPLE_TEXT = "the quick brown fox jumps over the lazy dog";

function TypingPreview({
  cursorStyleId,
  typingThemeId,
}: {
  cursorStyleId: string | null;
  typingThemeId: string | null;
}) {
  const [typed, setTyped] = useState("");
  const [focused, setFocused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const cursorDef = cursorStyleId ? (CURSOR_STYLES[cursorStyleId] ?? null) : null;
  const themeDef = typingThemeId ? (TYPING_THEMES[typingThemeId] ?? null) : null;

  // Reset when cosmetics change so the user gets a fresh view
  useEffect(() => {
    setTyped("");
  }, [cursorStyleId, typingThemeId]);

  // Auto-restart after a brief pause when the sentence is completed
  useEffect(() => {
    if (typed.length === SAMPLE_TEXT.length) {
      const t = setTimeout(() => setTyped(""), 800);
      return () => clearTimeout(t);
    }
  }, [typed.length]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Tab") {
        e.preventDefault();
        setTyped("");
        return;
      }
      if (e.key === " ") {
        e.preventDefault();
      }
      if (e.key === "Backspace") {
        setTyped((prev) => prev.slice(0, -1));
        return;
      }
      if (e.key.length !== 1) return;
      if (typed.length >= SAMPLE_TEXT.length) return;
      setTyped((prev) => prev + e.key);
    },
    [typed.length],
  );

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onClick={() => containerRef.current?.focus()}
      className="rounded-xl bg-surface/40 ring-1 ring-white/[0.04] px-5 py-4 cursor-text outline-none focus:ring-white/[0.07] transition-colors"
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-muted/35 uppercase tracking-widest">Try it out</span>
        {focused && (
          <span className="text-xs text-muted/30">Tab to reset</span>
        )}
      </div>
      <div className="text-lg leading-loose select-none">
        {SAMPLE_TEXT.split("").map((char, i) => {
          const isCurrent = i === typed.length;
          const isTyped = i < typed.length;
          const isCorrect = isTyped && typed[i] === char;
          const isWrong = isTyped && typed[i] !== char;

          let color: string | undefined;
          if (isCorrect) color = themeDef?.palette[0] ?? "var(--color-correct)";
          else if (isWrong) color = themeDef?.palette[1] ?? "var(--color-error)";

          return (
            <span
              key={i}
              className={`relative inline-block ${!isTyped ? "text-muted/25" : ""}`}
              style={color ? { color } : undefined}
            >
              {isCurrent && focused && <CursorSpan def={cursorDef} />}
              {char === " " ? "\u00A0" : char}
            </span>
          );
        })}
        {/* Cursor after the last character when complete */}
        {typed.length === SAMPLE_TEXT.length && focused && (
          <span className="relative inline-block">
            <CursorSpan def={cursorDef} />
          </span>
        )}
      </div>
      {!focused && (
        <p className="text-xs text-muted/25 mt-2">Click to focus · start typing</p>
      )}
    </div>
  );
}

function CursorSpan({ def }: { def: CursorStyleDef | null }) {
  const color = def?.color ?? "var(--color-accent)";
  const glow = def?.glowColor;
  const shape = def?.shape ?? "line";
  const animName = def?.animation;

  const style: React.CSSProperties = {
    position: "absolute",
    backgroundColor: color,
    boxShadow: glow ? `0 0 6px ${glow}` : undefined,
    zIndex: 1,
  };

  // Apply blink animation — prefer the cursor's own animation, fall back to standard blink
  const animClass = animName ? "" : "animate-blink";
  if (animName) {
    style.animation = `${animName} 1s ease-in-out infinite`;
  }

  if (shape === "block") {
    return (
      <span
        className={`${animClass} rounded-sm`}
        style={{ ...style, inset: 0, opacity: 0.35 }}
      />
    );
  }
  if (shape === "underline") {
    return (
      <span
        className={animClass}
        style={{ ...style, bottom: 1, left: 0, right: 0, height: 2 }}
      />
    );
  }
  // line (default)
  return (
    <span
      className={animClass}
      style={{ ...style, left: 0, top: "10%", bottom: "10%", width: 2 }}
    />
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
      <div className="rounded-xl bg-accent/[0.04] ring-1 ring-accent/20 px-4 py-3 flex items-start gap-3" style={{ animation: "slide-up 0.2s ease-out both" }}>
        <span className="text-accent/60 mt-0.5 shrink-0 text-base leading-none">✦</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-accent/80">{item.name}</span>
            <span className="text-[11px] font-black text-accent bg-accent/10 ring-1 ring-accent/25 px-1.5 py-0.5 rounded uppercase tracking-wider leading-none">
              PRO
            </span>
          </div>
          <p className="text-xs text-muted/60 mt-0.5 leading-snug">
            Pro exclusive · requires{" "}
            <span className="text-text/70 font-semibold">Level {item.level}</span>
            {levelsNeeded > 0 && (
              <span className="text-muted/45"> ({levelsNeeded} level{levelsNeeded !== 1 ? "s" : ""} away)</span>
            )}
          </p>
        </div>
        <Link
          href="/pro"
          className="shrink-0 self-center rounded-lg bg-accent/10 ring-1 ring-accent/25 text-accent text-xs font-bold px-3 py-1.5 hover:bg-accent/20 transition-colors whitespace-nowrap leading-none"
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
        <span className="text-xs text-muted/55 ml-2">
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
      <h3 className="text-xs font-bold text-correct/50 uppercase tracking-widest mb-2.5 flex items-center gap-2">
        Unlocked
        <span className="text-correct/25 font-normal normal-case tracking-normal">
          {count} {count === 1 ? "item" : "items"}
        </span>
      </h3>
    );
  }
  if (variant === "level") {
    return (
      <h3 className="text-xs font-bold text-muted/50 uppercase tracking-widest mb-2.5 flex items-center gap-2">
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
  return (
    <h3 className="text-xs font-bold text-accent/60 uppercase tracking-widest mb-2.5 flex items-center gap-2">
      <span className="text-accent/40">✦</span>
      Pro Exclusive
      <span className="text-accent/30 font-normal normal-case tracking-normal">
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
      return <span className="text-xs text-accent/70 font-medium truncate max-w-full px-0.5">{TITLE_TEXTS[item.id] ?? item.value}</span>;
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
      const color = BORDER_COLORS[item.id] ?? "#4d9eff";
      return (
        <div
          className="w-6 h-6 rounded-full bg-surface/60 border-2 shrink-0"
          style={{ borderColor: color, boxShadow: `0 0 6px ${color}55` }}
        />
      );
    }
    case "typingTheme": {
      const def = TYPING_THEMES[item.id];
      if (!def) return null;
      return (
        <span className="flex gap-0.5">
          {def.palette.slice(0, 3).map((c, i) => (
            <span key={i} className="w-2.5 h-2.5 rounded-[2px]" style={{ backgroundColor: c }} />
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
  onLockedClick,
}: {
  item: CosmeticReward;
  active: boolean;
  locked: boolean;
  isPro: boolean;
  isPinnedPreview: boolean;
  onToggle: () => void;
  onLockedClick: () => void;
}) {
  const isProLocked = locked && item.proOnly && !isPro;

  if (isProLocked) {
    return (
      <button
        onClick={onLockedClick}
        className={`group relative text-left rounded-xl px-4 py-4 ring-1 transition-all ${
          isPinnedPreview
            ? "ring-accent/35 bg-accent/[0.08]"
            : "ring-accent/15 bg-accent/[0.03] hover:ring-accent/25 hover:bg-accent/[0.05]"
        }`}
      >
        <span className="absolute top-2.5 right-2.5 text-[11px] font-black text-accent/60 bg-accent/[0.08] px-1.5 py-0.5 rounded uppercase tracking-wider leading-none">
          PRO
        </span>
        <div className="mb-3 h-8 flex items-center opacity-50 group-hover:opacity-70 transition-opacity">
          <ItemVisual item={item} />
        </div>
        <p className="text-xs font-semibold truncate leading-tight text-muted/65 group-hover:text-muted/80 transition-colors">
          {item.name}
        </p>
        <p className="text-xs mt-0.5 leading-tight text-accent/40 group-hover:text-accent/60 transition-colors tabular-nums">
          Lv. {item.level} · Pro
        </p>
      </button>
    );
  }

  return (
    <button
      onClick={locked ? onLockedClick : onToggle}
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
        <span className="absolute top-3 right-3 text-accent/40">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </span>
      )}
      <div className="mb-3 h-8 flex items-center">
        <ItemVisual item={item} />
      </div>
      <p className={`text-xs font-semibold truncate leading-tight ${
        active ? "text-accent" : locked ? "text-muted/60" : "text-text/80"
      }`}>
        {item.name}
      </p>
      <p className="text-xs mt-0.5 leading-tight">
        {locked ? (
          <span className="text-muted/55 tabular-nums">Lv. {item.level}</span>
        ) : active ? (
          <span className="text-accent/50">Equipped · <span className="tabular-nums">Lv. {item.level}</span></span>
        ) : (
          <span className="text-muted/45 group-hover:text-muted/65 transition-colors tabular-nums">Lv. {item.level}</span>
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
      return <span className="text-sm text-accent/80 font-medium">{TITLE_TEXTS[item.id] ?? item.value}</span>;
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
          <span className="text-xs text-muted/60 capitalize">{def.shape}</span>
        </div>
      );
    }
    case "profileBorder": {
      const color = BORDER_COLORS[item.id] ?? "#4d9eff";
      return (
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-full bg-surface/60 shrink-0 border-2"
            style={{ borderColor: color, boxShadow: `0 0 8px ${color}55` }}
          />
          <span className="text-xs text-muted/60">{PROFILE_BORDERS[item.id]?.label ?? item.name}</span>
        </div>
      );
    }
    case "typingTheme": {
      const def = TYPING_THEMES[item.id];
      if (!def) return null;
      return (
        <span className="flex gap-1">
          {def.palette.map((c, i) => (
            <span key={i} className="w-4 h-4 rounded-[3px]" style={{ backgroundColor: c }} />
          ))}
        </span>
      );
    }
    default:
      return null;
  }
}
