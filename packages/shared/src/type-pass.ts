// ─── Types ────────────────────────────────────────────────────────────

export type RewardType = "badge" | "title" | "nameColor" | "nameEffect";

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

// ─── Season 1 Definition ─────────────────────────────────────────────

const SEASON_1_REWARDS: TypePassReward[] = [
  // Tier 1-5
  { tier: 1, type: "badge", id: "s1_badge_spark", name: "Spark", value: "\u2728", premium: false },
  { tier: 2, type: "nameColor", id: "s1_color_sky", name: "Sky Blue", value: "#7dd3fc", premium: true },
  { tier: 3, type: "title", id: "s1_title_rookie", name: "Season Rookie", value: "Season Rookie", premium: false },
  { tier: 4, type: "badge", id: "s1_badge_flame", name: "Flame", value: "\uD83D\uDD25", premium: true },
  { tier: 5, type: "nameColor", id: "s1_color_lime", name: "Lime", value: "#a3e635", premium: false },

  // Tier 6-10
  { tier: 6, type: "title", id: "s1_title_grinder", name: "Grinder", value: "Grinder", premium: true },
  { tier: 7, type: "badge", id: "s1_badge_bolt", name: "Lightning Bolt", value: "\u26A1", premium: false },
  { tier: 8, type: "nameColor", id: "s1_color_violet", name: "Violet", value: "#a78bfa", premium: true },
  { tier: 9, type: "badge", id: "s1_badge_star", name: "Gold Star", value: "\u2B50", premium: false },
  { tier: 10, type: "title", id: "s1_title_dedicated", name: "Dedicated", value: "Dedicated", premium: true },

  // Tier 11-15
  { tier: 11, type: "nameColor", id: "s1_color_rose", name: "Rose", value: "#fb7185", premium: false },
  { tier: 12, type: "badge", id: "s1_badge_gem", name: "Gem", value: "\uD83D\uDC8E", premium: true },
  { tier: 13, type: "title", id: "s1_title_typist", name: "Pro Typist", value: "Pro Typist", premium: false },
  { tier: 14, type: "nameEffect", id: "s1_effect_glow", name: "Subtle Glow", value: "glow-subtle", premium: true },
  { tier: 15, type: "badge", id: "s1_badge_trophy", name: "Trophy", value: "\uD83C\uDFC6", premium: false },

  // Tier 16-20
  { tier: 16, type: "nameColor", id: "s1_color_amber", name: "Amber", value: "#fbbf24", premium: true },
  { tier: 17, type: "title", id: "s1_title_swift", name: "Swift Fingers", value: "Swift Fingers", premium: false },
  { tier: 18, type: "badge", id: "s1_badge_crown", name: "Crown", value: "\uD83D\uDC51", premium: true },
  { tier: 19, type: "nameColor", id: "s1_color_emerald", name: "Emerald", value: "#34d399", premium: false },
  { tier: 20, type: "title", id: "s1_title_veteran", name: "Season Veteran", value: "Season Veteran", premium: true },

  // Tier 21-25
  { tier: 21, type: "badge", id: "s1_badge_rocket", name: "Rocket", value: "\uD83D\uDE80", premium: false },
  { tier: 22, type: "nameEffect", id: "s1_effect_pulse", name: "Pulse", value: "glow-pulse", premium: true },
  { tier: 23, type: "nameColor", id: "s1_color_cyan", name: "Cyan", value: "#22d3ee", premium: false },
  { tier: 24, type: "title", id: "s1_title_elite", name: "Elite", value: "Elite", premium: true },
  { tier: 25, type: "badge", id: "s1_badge_fire", name: "Inferno", value: "\uD83C\uDF1F", premium: false },

  // Tier 26-30
  { tier: 26, type: "nameColor", id: "s1_color_gold", name: "Gold", value: "#facc15", premium: true },
  { tier: 27, type: "title", id: "s1_title_legend", name: "Legend", value: "Legend", premium: false },
  { tier: 28, type: "nameEffect", id: "s1_effect_rainbow", name: "Rainbow Shift", value: "glow-rainbow", premium: true },
  { tier: 29, type: "badge", id: "s1_badge_dragon", name: "Dragon", value: "\uD83D\uDC09", premium: false },
  { tier: 30, type: "title", id: "s1_title_master", name: "Season Master", value: "Season Master", premium: true },
];

export const SEASON_1: SeasonDefinition = {
  id: "season_1",
  name: "Feb — May 2026",
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
