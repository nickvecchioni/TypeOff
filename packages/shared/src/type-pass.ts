import { getXpLevel } from "./challenges";

// ─── Pro Subscription Constants ────────────────────────────────────────

export const PRO_MONTHLY_PRICE = 4.99;
export const PRO_YEARLY_PRICE = 39.99;
export const PRO_BADGE_ID = "pro_badge";

// ─── Types ────────────────────────────────────────────────────────────

export type RewardType =
  | "badge"
  | "title"
  | "nameColor"
  | "nameEffect"
  | "cursorStyle"
  | "profileBorder"
  | "typingTheme";

export interface CosmeticReward {
  level: number;
  type: RewardType;
  id: string;
  name: string;
  /** Emoji for badges, hex for colors, text for titles, CSS class for effects */
  value: string;
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
  pro_badge: "\u2B50",
};

/** Title text map — keyed by cosmetic ID */
export const TITLE_TEXTS: Record<string, string> = {
  s1_title_rookie: "Rookie",
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

// ─── Cosmetic Rewards (30 levels, 1 per level) ──────────────────────

export const COSMETIC_REWARDS: CosmeticReward[] = [
  // Level 1-5
  { level: 1,  type: "badge",         id: "s1_badge_spark",          name: "Spark",              value: "\u2728"        },
  { level: 2,  type: "nameColor",     id: "s1_color_sky",            name: "Sky Blue",           value: "#7dd3fc"       },
  { level: 3,  type: "cursorStyle",   id: "s1_cursor_neon_green",    name: "Neon Green",         value: "neon-green"    },
  { level: 4,  type: "title",         id: "s1_title_rookie",         name: "Rookie",             value: "Rookie"        },
  { level: 5,  type: "badge",         id: "s1_badge_flame",          name: "Flame",              value: "\uD83D\uDD25"  },

  // Level 6-10
  { level: 6,  type: "profileBorder", id: "s1_border_ember",         name: "Ember Border",       value: "ember"         },
  { level: 7,  type: "nameColor",     id: "s1_color_lime",           name: "Lime",               value: "#a3e635"       },
  { level: 8,  type: "cursorStyle",   id: "s1_cursor_block_gold",    name: "Block Gold",         value: "block-gold"    },
  { level: 9,  type: "title",         id: "s1_title_grinder",        name: "Grinder",            value: "Grinder"       },
  { level: 10, type: "typingTheme",   id: "s1_theme_terminal",       name: "Terminal",           value: "terminal"      },

  // Level 11-15
  { level: 11, type: "badge",         id: "s1_badge_bolt",           name: "Lightning Bolt",     value: "\u26A1"        },
  { level: 12, type: "nameEffect",    id: "s1_effect_glow",          name: "Subtle Glow",        value: "glow-subtle"   },
  { level: 13, type: "cursorStyle",   id: "s1_cursor_pulse_pink",    name: "Pulse Pink",         value: "pulse-pink"    },
  { level: 14, type: "profileBorder", id: "s1_border_ice",           name: "Ice Border",         value: "ice"           },
  { level: 15, type: "nameColor",     id: "s1_color_violet",         name: "Violet",             value: "#a78bfa"       },

  // Level 16-20
  { level: 16, type: "title",         id: "s1_title_typist",         name: "Pro Typist",         value: "Pro Typist"    },
  { level: 17, type: "typingTheme",   id: "s1_theme_neon",           name: "Neon",               value: "neon"          },
  { level: 18, type: "badge",         id: "s1_badge_gem",            name: "Gem",                value: "\uD83D\uDC8E"  },
  { level: 19, type: "cursorStyle",   id: "s1_cursor_underline_cyan",name: "Underline Cyan",     value: "underline-cyan"},
  { level: 20, type: "profileBorder", id: "s1_border_diamond",       name: "Diamond Border",     value: "diamond"       },

  // Level 21-25
  { level: 21, type: "nameColor",     id: "s1_color_rose",           name: "Rose",               value: "#fb7185"       },
  { level: 22, type: "nameEffect",    id: "s1_effect_pulse",         name: "Pulse",              value: "glow-pulse"    },
  { level: 23, type: "typingTheme",   id: "s1_theme_sunset",         name: "Sunset",             value: "sunset"        },
  { level: 24, type: "cursorStyle",   id: "s1_cursor_ember",         name: "Ember",              value: "ember"         },
  { level: 25, type: "title",         id: "s1_title_elite",          name: "Elite",              value: "Elite"         },

  // Level 26-30
  { level: 26, type: "nameColor",     id: "s1_color_gold",           name: "Gold",               value: "#facc15"       },
  { level: 27, type: "profileBorder", id: "s1_border_void",          name: "Void Border",        value: "void"          },
  { level: 28, type: "nameEffect",    id: "s1_effect_rainbow",       name: "Rainbow Shift",      value: "glow-rainbow"  },
  { level: 29, type: "typingTheme",   id: "s1_theme_midnight",       name: "Midnight",           value: "midnight"      },
  { level: 30, type: "cursorStyle",   id: "s1_cursor_rainbow",       name: "Rainbow",            value: "rainbow"       },
];

// ─── Helpers ──────────────────────────────────────────────────────────

/** Get cosmetic rewards newly unlocked between two XP values */
export function getNewCosmeticRewards(prevXp: number, newXp: number): CosmeticReward[] {
  const prevLevel = getXpLevel(prevXp).level;
  const newLevel = getXpLevel(newXp).level;
  if (newLevel <= prevLevel) return [];
  return COSMETIC_REWARDS.filter((r) => r.level > prevLevel && r.level <= newLevel);
}

/** Calculate XP earned from a single race */
export function calculateRaceXp(data: {
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
