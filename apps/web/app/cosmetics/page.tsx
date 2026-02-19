"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  SEASON_1,
  BADGE_EMOJIS,
  TITLE_TEXTS,
  NAME_COLORS,
  NAME_EFFECT_CLASSES,
  CURSOR_STYLES,
  PROFILE_BORDERS,
  TYPING_THEMES,
  type TypePassReward,
} from "@typeoff/shared";

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

type Category = "badge" | "title" | "nameColor" | "nameEffect" | "cursorStyle" | "profileBorder" | "typingTheme";

const CATEGORIES: { key: Category; label: string; field: keyof ActiveState }[] = [
  { key: "badge", label: "Badges", field: "activeBadge" },
  { key: "title", label: "Titles", field: "activeTitle" },
  { key: "nameColor", label: "Name Colors", field: "activeNameColor" },
  { key: "nameEffect", label: "Name Effects", field: "activeNameEffect" },
  { key: "cursorStyle", label: "Cursor Styles", field: "activeCursorStyle" },
  { key: "profileBorder", label: "Profile Borders", field: "activeProfileBorder" },
  { key: "typingTheme", label: "Typing Themes", field: "activeTypingTheme" },
];

export default function CosmeticsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<CosmeticsData | null>(null);
  const [active, setActive] = useState<ActiveState>({
    activeBadge: null,
    activeTitle: null,
    activeNameColor: null,
    activeNameEffect: null,
    activeCursorStyle: null,
    activeProfileBorder: null,
    activeTypingTheme: null,
  });
  const [saving, setSaving] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category>("badge");

  // Preview state — overrides for locked items being previewed
  const [previewOverrides, setPreviewOverrides] = useState<Partial<ActiveState>>({});

  const hasPreview = Object.values(previewOverrides).some((v) => v != null);

  // Merged state for the preview card: active + preview overrides
  const displayState: ActiveState = {
    ...active,
    ...Object.fromEntries(
      Object.entries(previewOverrides).filter(([, v]) => v != null),
    ),
  } as ActiveState;

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, router]);

  useEffect(() => {
    if (!session?.user?.id) return;
    fetch("/api/cosmetics")
      .then((r) => r.json())
      .then((d: CosmeticsData) => {
        setData(d);
        setActive(d.active);
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
      // Clear any preview on this field when equipping
      setPreviewOverrides((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
      const newActive = { ...active, [field]: active[field] === id ? null : id };
      save(newActive);
    },
    [active, save],
  );

  const togglePreview = useCallback(
    (field: keyof ActiveState, id: string) => {
      setPreviewOverrides((prev) => ({
        ...prev,
        [field]: prev[field] === id ? null : id,
      }));
    },
    [],
  );

  const clearPreview = useCallback(() => {
    setPreviewOverrides({});
  }, []);

  if (status === "loading" || !data) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <p className="text-muted/50 text-sm">Loading cosmetics...</p>
      </main>
    );
  }

  const ownedIds = new Set(data.unlocked.map((u) => u.cosmeticId));
  const categoryInfo = CATEGORIES.find((c) => c.key === selectedCategory)!;

  // Get all items for the selected category (owned + locked)
  const allItems = SEASON_1.rewards.filter((r) => r.type === selectedCategory);
  const ownedItems = allItems.filter((r) => ownedIds.has(r.id));
  const lockedItems = allItems.filter((r) => !ownedIds.has(r.id));

  const username = session?.user?.username ?? session?.user?.name ?? "Player";

  return (
    <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-8">
      <div className="max-w-4xl mx-auto animate-fade-in">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-lg font-bold text-text tracking-tight">
            Cosmetics
          </h1>
          <p className="text-xs text-muted/60 mt-1">
            Preview and equip items from your TypePass
            {saving && <span className="text-accent/50 ml-2">saving...</span>}
          </p>
        </div>

        {/* Live Preview Card */}
        <div className="mb-8">
          <PreviewCard
            active={displayState}
            username={username}
            hasPreview={hasPreview}
            onClearPreview={clearPreview}
          />
        </div>

        {/* Category Tabs */}
        <div className="flex gap-1 mb-6 overflow-x-auto pb-1 -mx-1 px-1">
          {CATEGORIES.map((cat) => {
            const count = SEASON_1.rewards.filter(
              (r) => r.type === cat.key && ownedIds.has(r.id),
            ).length;
            const total = SEASON_1.rewards.filter((r) => r.type === cat.key).length;
            return (
              <button
                key={cat.key}
                onClick={() => setSelectedCategory(cat.key)}
                className={`shrink-0 text-xs px-3 py-2 rounded-lg transition-all ${
                  selectedCategory === cat.key
                    ? "bg-accent/15 text-accent ring-1 ring-accent/20"
                    : "text-muted hover:text-text hover:bg-white/[0.04]"
                }`}
              >
                {cat.label}
                <span className={`ml-1.5 tabular-nums ${
                  selectedCategory === cat.key ? "text-accent/50" : "text-muted/40"
                }`}>
                  {count}/{total}
                </span>
              </button>
            );
          })}
        </div>

        {/* Items Grid */}
        <div className="space-y-6">
          {/* Owned items */}
          {ownedItems.length > 0 && (
            <section>
              <h3 className="text-[11px] font-bold text-correct/70 uppercase tracking-widest mb-3">
                Unlocked
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {ownedItems.map((item) => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    active={active[categoryInfo.field] === item.id}
                    locked={false}
                    previewing={false}
                    onToggle={() => toggleCosmetic(categoryInfo.field, item.id)}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Locked items */}
          {lockedItems.length > 0 && (
            <section>
              <div className="flex items-center gap-3 mb-3">
                <h3 className="text-[11px] font-bold text-muted/50 uppercase tracking-widest">
                  Locked
                </h3>
                <span className="text-[10px] text-muted/30">
                  Click to preview
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {lockedItems.map((item) => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    active={false}
                    locked
                    previewing={previewOverrides[categoryInfo.field] === item.id}
                    onToggle={() => togglePreview(categoryInfo.field, item.id)}
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
    </main>
  );
}

/* ── Preview Card ──────────────────────────────────────── */

const PREVIEW_TEXT = "the quick brown fox jumps over the lazy dog";

function PreviewCard({
  active,
  username,
  hasPreview,
  onClearPreview,
}: {
  active: ActiveState;
  username: string;
  hasPreview: boolean;
  onClearPreview: () => void;
}) {
  const cursorStyle = active.activeCursorStyle ? CURSOR_STYLES[active.activeCursorStyle] : null;
  const borderDef = active.activeProfileBorder ? PROFILE_BORDERS[active.activeProfileBorder] : null;
  const themeDef = active.activeTypingTheme ? TYPING_THEMES[active.activeTypingTheme] : null;

  const [typed, setTyped] = useState("");
  const [focused, setFocused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Name styling
  const nameStyle: React.CSSProperties = {};
  let nameClass = "";
  if (active.activeNameColor && NAME_COLORS[active.activeNameColor]) {
    nameStyle.color = NAME_COLORS[active.activeNameColor];
  }
  if (active.activeNameEffect && NAME_EFFECT_CLASSES[active.activeNameEffect]) {
    nameClass = NAME_EFFECT_CLASSES[active.activeNameEffect];
  }

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Tab" || e.key === "Escape") {
        e.preventDefault();
        setTyped("");
        return;
      }

      // Ignore modifier combos and non-character keys
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === "Shift" || e.key === "CapsLock") return;

      e.preventDefault();

      if (e.key === "Backspace") {
        setTyped((prev) => prev.slice(0, -1));
        return;
      }

      // Only accept single printable characters
      if (e.key.length !== 1) return;

      setTyped((prev) => {
        if (prev.length >= PREVIEW_TEXT.length) return prev;
        return prev + e.key;
      });
    },
    [],
  );

  // Auto-reset when complete
  useEffect(() => {
    if (typed.length >= PREVIEW_TEXT.length) {
      const t = setTimeout(() => setTyped(""), 800);
      return () => clearTimeout(t);
    }
  }, [typed]);

  const isComplete = typed.length >= PREVIEW_TEXT.length;

  // Build cursor style
  const cursorColor = cursorStyle?.color ?? "#4d9eff";
  const cursorGlow = cursorStyle?.glowColor
    ? `0 0 8px ${cursorStyle.glowColor}, 0 0 2px ${cursorStyle.glowColor}`
    : `0 0 8px ${cursorColor}40`;
  const cursorW = cursorStyle?.shape === "block" ? "1ch" : cursorStyle?.shape === "underline" ? "1ch" : 2;
  const cursorH = cursorStyle?.shape === "underline" ? 2 : "1.2em";
  const cursorOpacity = cursorStyle?.shape === "block" ? 0.3 : 1;
  const cursorVAlign = cursorStyle?.shape === "underline" ? "bottom" : ("text-bottom" as const);
  const cursorAnim = cursorStyle?.animation
    ? `${cursorStyle.animation} 2s ease-in-out infinite`
    : "blink 1s step-end infinite";

  return (
    <div className="relative">
      {/* Preview mode banner — sits above the card */}
      {hasPreview && (
        <div className="flex items-center justify-between mb-2 animate-fade-in">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-amber-400/80">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              Preview Mode
            </span>
            <span className="text-[10px] text-muted/40">
              Showing how locked items would look
            </span>
          </div>
          <button
            onClick={onClearPreview}
            className="text-[10px] text-muted/40 hover:text-text transition-colors px-2 py-1 rounded hover:bg-white/[0.04]"
          >
            Clear
          </button>
        </div>
      )}

      <div className={`rounded-xl bg-surface/50 overflow-hidden transition-all duration-300 ${
        borderDef?.className ?? ""
      } ${
        hasPreview
          ? "ring-1 ring-amber-400/20 shadow-[0_0_20px_rgba(251,191,36,0.04)]"
          : "ring-1 ring-white/[0.04]"
      }`}>
        {/* Profile preview */}
        <div className="px-5 py-5 border-b border-white/[0.04]">
          <div className="flex items-center gap-3">
            <div className="flex flex-col">
              <span className="flex items-center gap-2">
                <span className={`text-lg font-bold text-text ${nameClass}`} style={nameStyle}>
                  {username}
                </span>
                {active.activeBadge && BADGE_EMOJIS[active.activeBadge] && (
                  <span className="text-lg shrink-0">{BADGE_EMOJIS[active.activeBadge]}</span>
                )}
              </span>
              {active.activeTitle && TITLE_TEXTS[active.activeTitle] && (
                <span className="text-xs text-amber-400/70 font-medium">
                  {TITLE_TEXTS[active.activeTitle]}
                </span>
              )}
            </div>
          </div>
          {!active.activeBadge && !active.activeTitle && !active.activeNameColor && !active.activeNameEffect && !active.activeProfileBorder && (
            <p className="text-xs text-muted/30 mt-2">Equip items below to see them here</p>
          )}
        </div>

        {/* Interactive typing preview */}
        <div
          ref={containerRef}
          tabIndex={0}
          onKeyDown={handleKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onClick={() => containerRef.current?.focus()}
          className={`px-5 py-5 outline-none cursor-text transition-colors ${
            themeDef?.className ?? ""
          } ${focused ? "bg-white/[0.02]" : ""}`}
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] text-muted/40 uppercase tracking-widest">
              Typing Preview
            </p>
            {typed.length > 0 && !isComplete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setTyped("");
                  containerRef.current?.focus();
                }}
                className="text-[10px] text-muted/30 hover:text-muted/60 transition-colors uppercase tracking-wider"
              >
                Reset
              </button>
            )}
          </div>

          <div className="relative font-mono text-base leading-relaxed no-ligatures select-none">
            {/* Render each character */}
            {PREVIEW_TEXT.split("").map((char, i) => {
              if (i < typed.length) {
                // Typed character — correct or error
                const isCorrect = typed[i] === char;
                return (
                  <span
                    key={i}
                    className={isCorrect ? "text-correct" : "text-error"}
                  >
                    {isCorrect ? char : typed[i]}
                  </span>
                );
              }

              if (i === typed.length && focused && !isComplete) {
                // Cursor position
                return (
                  <span key={i} className="relative">
                    <span
                      className="inline-block absolute"
                      style={{
                        width: cursorW,
                        height: cursorH,
                        backgroundColor: cursorColor,
                        boxShadow: cursorGlow,
                        opacity: cursorOpacity,
                        verticalAlign: cursorVAlign,
                        animation: cursorAnim,
                        top: cursorStyle?.shape === "underline" ? undefined : 0,
                        bottom: cursorStyle?.shape === "underline" ? 0 : undefined,
                        left: 0,
                        zIndex: 1,
                      }}
                    />
                    <span className="text-muted">{char}</span>
                  </span>
                );
              }

              // Untyped
              return (
                <span key={i} className="text-muted">
                  {char}
                </span>
              );
            })}
          </div>

          {/* Focus hint */}
          {!focused && typed.length === 0 && (
            <p className="text-[10px] text-muted/25 mt-3">
              Click here to start typing
            </p>
          )}

          {/* Tab to reset hint */}
          {focused && typed.length > 0 && !isComplete && (
            <p className="text-[10px] text-muted/20 mt-3">
              Tab to reset
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Item Card ─────────────────────────────────────────── */

function ItemCard({
  item,
  active,
  locked,
  previewing,
  onToggle,
}: {
  item: TypePassReward;
  active: boolean;
  locked: boolean;
  previewing: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className={`group relative text-left rounded-lg px-4 py-3.5 ring-1 transition-all ${
        previewing
          ? "ring-amber-400/30 bg-amber-400/[0.06]"
          : locked
          ? "ring-white/[0.05] bg-surface/30 hover:ring-white/[0.12] hover:bg-white/[0.03] cursor-pointer"
          : active
          ? "ring-accent/40 bg-accent/[0.08]"
          : "ring-white/[0.06] bg-surface/40 hover:ring-white/[0.12] hover:bg-white/[0.03]"
      }`}
    >
      {/* Active indicator (equipped) */}
      {active && (
        <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-accent shadow-[0_0_6px_rgba(77,158,255,0.5)]" />
      )}

      {/* Preview indicator (eye icon) */}
      {previewing && (
        <span className="absolute top-2.5 right-2.5 text-amber-400/70">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </span>
      )}

      {/* Lock icon — visible on locked non-previewing items */}
      {locked && !previewing && (
        <span className="absolute top-2.5 right-2.5 text-muted/20 group-hover:text-muted/40 transition-colors">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </span>
      )}

      {/* Item visual */}
      <div className={`mb-2 ${locked && !previewing ? "opacity-60 saturate-[0.4]" : ""}`}>
        <ItemVisual item={item} />
      </div>

      {/* Label */}
      <p className={`text-xs font-medium truncate ${
        previewing
          ? "text-amber-400/90"
          : active
          ? "text-accent"
          : locked
          ? "text-muted/60"
          : "text-text"
      }`}>
        {item.name}
      </p>
      <p className="text-[10px] text-muted/40 mt-0.5">
        {previewing ? (
          <span className="text-amber-400/50">Previewing</span>
        ) : locked ? (
          <>
            Tier {item.tier} {item.premium && <span className="text-amber-400/40">Premium</span>}
          </>
        ) : (
          active ? "Equipped" : "Click to equip"
        )}
      </p>
    </button>
  );
}

/* ── Item Visual (per-type preview swatch) ─────────────── */

function ItemVisual({ item }: { item: TypePassReward }) {
  switch (item.type) {
    case "badge":
      return (
        <span className="text-2xl">
          {BADGE_EMOJIS[item.id] ?? item.value}
        </span>
      );

    case "title":
      return (
        <span className="text-sm text-amber-400/80 font-medium">
          {TITLE_TEXTS[item.id] ?? item.value}
        </span>
      );

    case "nameColor": {
      const hex = NAME_COLORS[item.id] ?? item.value;
      return (
        <div className="flex items-center gap-2">
          <span
            className="w-5 h-5 rounded-full ring-1 ring-white/10"
            style={{ backgroundColor: hex }}
          />
          <span className="text-sm font-medium" style={{ color: hex }}>
            Aa
          </span>
        </div>
      );
    }

    case "nameEffect": {
      const effectClass = NAME_EFFECT_CLASSES[item.id] ?? "";
      return (
        <span className={`text-sm font-medium text-text ${effectClass}`}>
          Effect
        </span>
      );
    }

    case "cursorStyle": {
      const def = CURSOR_STYLES[item.id];
      if (!def) return <span className="text-muted text-xs">?</span>;
      return (
        <div className="flex items-center gap-2 h-6">
          <span
            className="rounded-sm"
            style={{
              width: def.shape === "block" ? "1ch" : def.shape === "underline" ? "1ch" : 2,
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
      return (
        <div
          className={`w-10 h-7 rounded-md bg-surface/60 ring-1 ring-white/[0.06] ${def.className}`}
        />
      );
    }

    case "typingTheme": {
      const def = TYPING_THEMES[item.id];
      if (!def) return null;
      return (
        <div className="flex items-center gap-2">
          <span className="flex gap-1">
            {def.palette.map((c, i) => (
              <span
                key={i}
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: c }}
              />
            ))}
          </span>
        </div>
      );
    }

    default:
      return null;
  }
}
