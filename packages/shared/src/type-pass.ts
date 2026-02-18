// ─── Types ────────────────────────────────────────────────────────────

export type RewardType =
  | "badge"
  | "title"
  | "nameColor"
  | "nameEffect"
  | "cursorStyle"
  | "profileBorder"
  | "typingTheme";

export interface TypePassReward {
  tier: number;
  type: RewardType;
  id: string;
  name: string;
  /** Emoji for badges, hex for colors, text for titles, CSS class for effects */
  value: string;
  premium: boolean;
}

export interface SeasonDefinition {
  id: string;
  name: string;
  startDate: string; // ISO date
  endDate: string; // ISO date
  maxTier: number;
  xpPerTier: number;
  priceUsd: number;
  rewards: TypePassReward[];
}

export interface TypePassProgress {
  seasonId: string;
  seasonalXp: number;
  currentTier: number;
  isPremium: boolean;
  xpEarned: number;
  tierUp: boolean;
  newTier: number;
  newRewards: TypePassReward[];
}

// ─── Cosmetic Definition Maps ─────────────────────────────────────────

export interface CursorStyleDef {
  shape: "line" | "block" | "underline";
  color: string;
  glowColor?: string;
  animation?: string;
  label: string;
}

export interface ProfileBorderDef {
  className: string;
  label: string;
}

export interface TypingThemeDef {
  className: string;
  label: string;
  /** Preview swatch colors [correct, error, muted] */
  palette: [string, string, string];
}

/** Cursor style definitions — keyed by cosmetic ID */
export const CURSOR_STYLES: Record<string, CursorStyleDef> = {
  s1_cursor_neon_green: {
    shape: "line",
    color: "#22c55e",
    glowColor: "rgba(34,197,94,0.6)",
    label: "Neon Green",
  },
  s1_cursor_block_gold: {
    shape: "block",
    color: "#eab308",
    glowColor: "rgba(234,179,8,0.4)",
    label: "Block Gold",
  },
  s1_cursor_pulse_pink: {
    shape: "line",
    color: "#ec4899",
    glowColor: "rgba(236,72,153,0.6)",
    animation: "cursor-pulse-pink",
    label: "Pulse Pink",
  },
  s1_cursor_underline_cyan: {
    shape: "underline",
    color: "#22d3ee",
    glowColor: "rgba(34,211,238,0.5)",
    label: "Underline Cyan",
  },
  s1_cursor_ember: {
    shape: "line",
    color: "#f97316",
    glowColor: "rgba(249,115,22,0.6)",
    animation: "cursor-ember",
    label: "Ember",
  },
  s1_cursor_rainbow: {
    shape: "line",
    color: "#60a5fa",
    animation: "cursor-rainbow-shift",
    label: "Rainbow",
  },
};

/** Profile border definitions — keyed by cosmetic ID */
export const PROFILE_BORDERS: Record<string, ProfileBorderDef> = {
  s1_border_ember: { className: "profile-border-ember", label: "Ember Border" },
  s1_border_ice: { className: "profile-border-ice", label: "Ice Border" },
  s1_border_diamond: { className: "profile-border-diamond", label: "Diamond Border" },
  s1_border_void: { className: "profile-border-void", label: "Void Border" },
};

/** Typing theme definitions — keyed by cosmetic ID */
export const TYPING_THEMES: Record<string, TypingThemeDef> = {
  s1_theme_terminal: {
    className: "typing-theme-terminal",
    label: "Terminal",
    palette: ["#22c55e", "#ef4444", "#4ade80"],
  },
  s1_theme_neon: {
    className: "typing-theme-neon",
    label: "Neon",
    palette: ["#22d3ee", "#ec4899", "#67e8f9"],
  },
  s1_theme_sunset: {
    className: "typing-theme-sunset",
    label: "Sunset",
    palette: ["#fb923c", "#ef4444", "#fbbf24"],
  },
  s1_theme_midnight: {
    className: "typing-theme-midnight",
    label: "Midnight",
    palette: ["#a78bfa", "#f472b6", "#818cf8"],
  },
};

/** Badge emoji map — keyed by cosmetic ID */
export const BADGE_EMOJIS: Record<string, string> = {
  s1_badge_spark: "\u2728",
  s1_badge_flame: "\uD83D\uDD25",
  s1_badge_bolt: "\u26A1",
  s1_badge_gem: "\uD83D\uDC8E",
  s1_badge_lightning: "\u26A1",
};

/** Title text map — keyed by cosmetic ID */
export const TITLE_TEXTS: Record<string, string> = {
  s1_title_rookie: "Season Rookie",
  s1_title_grinder: "Grinder",
  s1_title_typist: "Pro Typist",
  s1_title_elite: "Elite",
};

/** Name color hex map — keyed by cosmetic ID */
export const NAME_COLORS: Record<string, string> = {
  s1_color_sky: "#7dd3fc",
  s1_color_lime: "#a3e635",
  s1_color_violet: "#a78bfa",
  s1_color_rose: "#fb7185",
  s1_color_gold: "#facc15",
};

/** Name effect CSS class map — keyed by cosmetic ID */
export const NAME_EFFECT_CLASSES: Record<string, string> = {
  s1_effect_glow: "glow-subtle",
  s1_effect_pulse: "glow-pulse",
  s1_effect_rainbow: "glow-rainbow",
};

// ─── Season 1 Definition ─────────────────────────────────────────────

const SEASON_1_REWARDS: TypePassReward[] = [
  // Tier 1-5
  { tier: 1,  type: "badge",         id: "s1_badge_spark",          name: "Spark",              value: "\u2728",        premium: false },
  { tier: 2,  type: "nameColor",     id: "s1_color_sky",            name: "Sky Blue",           value: "#7dd3fc",       premium: true },
  { tier: 3,  type: "cursorStyle",   id: "s1_cursor_neon_green",    name: "Neon Green",         value: "neon-green",    premium: false },
  { tier: 4,  type: "title",         id: "s1_title_rookie",         name: "Season Rookie",      value: "Season Rookie", premium: true },
  { tier: 5,  type: "badge",         id: "s1_badge_flame",          name: "Flame",              value: "\uD83D\uDD25",  premium: false },

  // Tier 6-10
  { tier: 6,  type: "profileBorder", id: "s1_border_ember",         name: "Ember Border",       value: "ember",         premium: true },
  { tier: 7,  type: "nameColor",     id: "s1_color_lime",           name: "Lime",               value: "#a3e635",       premium: false },
  { tier: 8,  type: "cursorStyle",   id: "s1_cursor_block_gold",    name: "Block Gold",         value: "block-gold",    premium: true },
  { tier: 9,  type: "title",         id: "s1_title_grinder",        name: "Grinder",            value: "Grinder",       premium: false },
  { tier: 10, type: "typingTheme",   id: "s1_theme_terminal",       name: "Terminal",           value: "terminal",      premium: true },

  // Tier 11-15
  { tier: 11, type: "badge",         id: "s1_badge_bolt",           name: "Lightning Bolt",     value: "\u26A1",        premium: false },
  { tier: 12, type: "nameEffect",    id: "s1_effect_glow",          name: "Subtle Glow",        value: "glow-subtle",   premium: true },
  { tier: 13, type: "cursorStyle",   id: "s1_cursor_pulse_pink",    name: "Pulse Pink",         value: "pulse-pink",    premium: false },
  { tier: 14, type: "profileBorder", id: "s1_border_ice",           name: "Ice Border",         value: "ice",           premium: true },
  { tier: 15, type: "nameColor",     id: "s1_color_violet",         name: "Violet",             value: "#a78bfa",       premium: false },

  // Tier 16-20
  { tier: 16, type: "title",         id: "s1_title_typist",         name: "Pro Typist",         value: "Pro Typist",    premium: true },
  { tier: 17, type: "typingTheme",   id: "s1_theme_neon",           name: "Neon",               value: "neon",          premium: false },
  { tier: 18, type: "badge",         id: "s1_badge_gem",            name: "Gem",                value: "\uD83D\uDC8E",  premium: true },
  { tier: 19, type: "cursorStyle",   id: "s1_cursor_underline_cyan",name: "Underline Cyan",     value: "underline-cyan",premium: false },
  { tier: 20, type: "profileBorder", id: "s1_border_diamond",       name: "Diamond Border",     value: "diamond",       premium: true },

  // Tier 21-25
  { tier: 21, type: "nameColor",     id: "s1_color_rose",           name: "Rose",               value: "#fb7185",       premium: false },
  { tier: 22, type: "nameEffect",    id: "s1_effect_pulse",         name: "Pulse",              value: "glow-pulse",    premium: true },
  { tier: 23, type: "typingTheme",   id: "s1_theme_sunset",         name: "Sunset",             value: "sunset",        premium: false },
  { tier: 24, type: "cursorStyle",   id: "s1_cursor_ember",         name: "Ember",              value: "ember",         premium: true },
  { tier: 25, type: "title",         id: "s1_title_elite",          name: "Elite",              value: "Elite",         premium: false },

  // Tier 26-30
  { tier: 26, type: "nameColor",     id: "s1_color_gold",           name: "Gold",               value: "#facc15",       premium: true },
  { tier: 27, type: "profileBorder", id: "s1_border_void",          name: "Void Border",        value: "void",          premium: false },
  { tier: 28, type: "nameEffect",    id: "s1_effect_rainbow",       name: "Rainbow Shift",      value: "glow-rainbow",  premium: true },
  { tier: 29, type: "typingTheme",   id: "s1_theme_midnight",       name: "Midnight",           value: "midnight",      premium: false },
  { tier: 30, type: "cursorStyle",   id: "s1_cursor_rainbow",       name: "Rainbow",            value: "rainbow",       premium: true },
];

export const SEASON_1: SeasonDefinition = {
  id: "season_1",
  name: "Feb \u2014 May 2026",
  startDate: "2026-02-17",
  endDate: "2026-05-17",
  maxTier: 30,
  xpPerTier: 500,
  priceUsd: 7.99,
  rewards: SEASON_1_REWARDS,
};

// All seasons — add future seasons here
const SEASONS: SeasonDefinition[] = [SEASON_1];

// ─── Helpers ──────────────────────────────────────────────────────────

/** Get the currently active season, or null if between seasons */
export function getCurrentSeason(date?: Date): SeasonDefinition | null {
  const d = date ?? new Date();
  const iso = d.toISOString().slice(0, 10);
  return SEASONS.find((s) => iso >= s.startDate && iso <= s.endDate) ?? null;
}

/** Get the tier for a given XP amount */
export function getSeasonTier(xp: number, xpPerTier: number): number {
  return Math.min(Math.floor(xp / xpPerTier), 30);
}

/** Calculate season XP earned from a single race */
export function calculateRaceSeasonXp(data: {
  wpm: number;
  accuracy: number;
  placement: number;
  playerCount: number;
}): number {
  const base = 30;

  // Speed bonus: up to +60 (linear from 0 at 30 WPM to 60 at 150 WPM)
  const speedBonus = Math.min(60, Math.max(0, Math.round(((data.wpm - 30) / 120) * 60)));

  // Accuracy bonus: +10 at 95%+, +20 at 98%+
  const accBonus = data.accuracy >= 98 ? 20 : data.accuracy >= 95 ? 10 : 0;

  // Placement bonus (only in multiplayer)
  let placementBonus = 0;
  if (data.playerCount > 1) {
    if (data.placement === 1) placementBonus = 25;
    else if (data.placement === 2) placementBonus = 15;
    else if (data.placement === 3) placementBonus = 10;
  }

  return base + speedBonus + accBonus + placementBonus;
}

/** Get all rewards unlocked at or below a given tier */
export function getUnlockedRewards(
  season: SeasonDefinition,
  tier: number,
  isPremium: boolean,
): TypePassReward[] {
  return season.rewards.filter(
    (r) => r.tier <= tier && (!r.premium || isPremium),
  );
}

/** Get rewards that were newly unlocked by reaching a specific tier */
export function getNewRewardsAtTier(
  season: SeasonDefinition,
  tier: number,
  isPremium: boolean,
): TypePassReward[] {
  return season.rewards.filter(
    (r) => r.tier === tier && (!r.premium || isPremium),
  );
}
