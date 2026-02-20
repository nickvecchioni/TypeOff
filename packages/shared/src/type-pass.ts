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
  // ─── Extended themes ──────────────────────────────────────
  theme_dracula: { className: "typing-theme-dracula", label: "Dracula", palette: ["#50fa7b", "#ff5555", "#6272a4"] },
  theme_solarized_dark: { className: "typing-theme-solarized-dark", label: "Solarized Dark", palette: ["#859900", "#dc322f", "#586e75"] },
  theme_solarized_light: { className: "typing-theme-solarized-light", label: "Solarized Light", palette: ["#859900", "#dc322f", "#93a1a1"] },
  theme_nord: { className: "typing-theme-nord", label: "Nord", palette: ["#a3be8c", "#bf616a", "#4c566a"] },
  theme_gruvbox: { className: "typing-theme-gruvbox", label: "Gruvbox", palette: ["#b8bb26", "#fb4934", "#928374"] },
  theme_monokai: { className: "typing-theme-monokai", label: "Monokai", palette: ["#a6e22e", "#f92672", "#75715e"] },
  theme_one_dark: { className: "typing-theme-one-dark", label: "One Dark", palette: ["#98c379", "#e06c75", "#5c6370"] },
  theme_catppuccin: { className: "typing-theme-catppuccin", label: "Catppuccin", palette: ["#a6e3a1", "#f38ba8", "#6c7086"] },
  theme_tokyo_night: { className: "typing-theme-tokyo-night", label: "Tokyo Night", palette: ["#9ece6a", "#f7768e", "#565f89"] },
  theme_kanagawa: { className: "typing-theme-kanagawa", label: "Kanagawa", palette: ["#98bb6c", "#e82424", "#727169"] },
  theme_rose_pine: { className: "typing-theme-rose-pine", label: "Rose Pine", palette: ["#31748f", "#eb6f92", "#6e6a86"] },
  theme_everforest: { className: "typing-theme-everforest", label: "Everforest", palette: ["#a7c080", "#e67e80", "#859289"] },
  theme_synthwave: { className: "typing-theme-synthwave", label: "Synthwave", palette: ["#72f1b8", "#fe4450", "#848bbd"] },
  theme_cyberpunk: { className: "typing-theme-cyberpunk", label: "Cyberpunk", palette: ["#00ff9f", "#ff003c", "#7b7f8b"] },
  theme_retro: { className: "typing-theme-retro", label: "Retro", palette: ["#83a598", "#cc241d", "#b8a898"] },
  theme_paper: { className: "typing-theme-paper", label: "Paper", palette: ["#444444", "#cc0000", "#999999"] },
  theme_sepia: { className: "typing-theme-sepia", label: "Sepia", palette: ["#6b5e4a", "#c0392b", "#a08c72"] },
  theme_arctic: { className: "typing-theme-arctic", label: "Arctic", palette: ["#88c0d0", "#bf616a", "#8fbcbb"] },
  theme_ocean: { className: "typing-theme-ocean", label: "Ocean", palette: ["#99c794", "#ec5f67", "#6699cc"] },
  theme_forest: { className: "typing-theme-forest", label: "Forest", palette: ["#629755", "#cf6171", "#6a8759"] },
  theme_lavender: { className: "typing-theme-lavender", label: "Lavender", palette: ["#c4b5fd", "#fca5a5", "#988bc7"] },
  theme_copper: { className: "typing-theme-copper", label: "Copper", palette: ["#cd7f32", "#e74c3c", "#b87333"] },
  theme_matrix: { className: "typing-theme-matrix", label: "Matrix", palette: ["#00ff41", "#ff0000", "#003b00"] },
  theme_vaporwave: { className: "typing-theme-vaporwave", label: "Vaporwave", palette: ["#ff71ce", "#ff6b6b", "#e47eed"] },
  theme_minimal: { className: "typing-theme-minimal", label: "Minimal", palette: ["#ffffff", "#ff4444", "#555555"] },
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
