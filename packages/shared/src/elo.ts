export type RankTier =
  | "bronze"
  | "silver"
  | "gold"
  | "platinum"
  | "diamond"
  | "master"
  | "grandmaster";

export interface RankInfo {
  tier: RankTier;
  division: number | null; // 3 = entry, 2 = mid, 1 = top. null for Grandmaster.
  label: string; // e.g. "Diamond II", "Grandmaster"
}

/** Major tier thresholds — order matters (highest first) */
const RANK_TIERS: { tier: RankTier; min: number; max: number }[] = [
  { tier: "grandmaster", min: 2500, max: Infinity },
  { tier: "master", min: 2200, max: 2499 },
  { tier: "diamond", min: 1900, max: 2199 },
  { tier: "platinum", min: 1600, max: 1899 },
  { tier: "gold", min: 1300, max: 1599 },
  { tier: "silver", min: 1000, max: 1299 },
  { tier: "bronze", min: 0, max: 999 },
];

const DIVISION_LABELS = ["I", "II", "III"];

/** Get the major tier for an ELO rating (for DB storage) */
export function getRankTier(elo: number): RankTier {
  for (const t of RANK_TIERS) {
    if (elo >= t.min) return t.tier;
  }
  return "bronze";
}

/** Get full rank info including division */
export function getRankInfo(elo: number): RankInfo {
  for (const t of RANK_TIERS) {
    if (elo >= t.min) {
      if (t.tier === "grandmaster") {
        return { tier: "grandmaster", division: null, label: "Grandmaster" };
      }
      const range = t.max - t.min + 1;
      const offset = elo - t.min;
      const third = range / 3;
      let div: number;
      if (offset >= 2 * third) div = 1;
      else if (offset >= third) div = 2;
      else div = 3;
      const name = t.tier.charAt(0).toUpperCase() + t.tier.slice(1);
      return {
        tier: t.tier,
        division: div,
        label: `${name} ${DIVISION_LABELS[div - 1]}`,
      };
    }
  }
  return { tier: "bronze", division: 3, label: "Bronze III" };
}

/** Progress within current division (0-1) */
export function getRankProgress(elo: number): number {
  for (const t of RANK_TIERS) {
    if (elo >= t.min) {
      if (t.tier === "grandmaster") return 1;
      const range = t.max - t.min + 1;
      const third = range / 3;
      const offset = elo - t.min;
      const divOffset = offset % third;
      return divOffset / third;
    }
  }
  return 0;
}

/** ELO needed for next division/tier promotion. null if Grandmaster. */
export function getNextDivisionElo(elo: number): number | null {
  for (const t of RANK_TIERS) {
    if (elo >= t.min) {
      if (t.tier === "grandmaster") return null;
      const range = t.max - t.min + 1;
      const third = range / 3;
      const offset = elo - t.min;
      if (offset >= 2 * third) return t.max + 1; // promote to next tier
      if (offset >= third) return t.min + Math.ceil(2 * third);
      return t.min + Math.ceil(third);
    }
  }
  return 300; // next Bronze division
}

/**
 * Calibrate initial ELO from a single WPM result (used for placements).
 * Formula: clamp(600, 2600, round(500 + wpm * 10))
 */
export function calibrateElo(wpm: number): { elo: number; tier: RankTier } {
  const elo = Math.min(2600, Math.max(600, Math.round(500 + wpm * 10)));
  return { elo, tier: getRankTier(elo) };
}

/**
 * Calculate ELO change for a pairwise matchup.
 * Uses a graduated K-factor: K = max(16, round(40 - 0.8 * gamesPlayed))
 * New players (0 games) get K=40 for fast convergence; veterans (30+) settle at K=16.
 */
export function calculateEloChange(
  ratingA: number,
  ratingB: number,
  scoreA: number,
  gamesPlayed: number
): number {
  const K = Math.max(16, Math.round(40 - 0.8 * gamesPlayed));
  const expectedA = 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
  return Math.round(K * (scoreA - expectedA));
}

/** Weight applied to ELO changes from bot pairings */
const BOT_WEIGHT = 0.6;

/**
 * Calculate ELO changes for all players in a race.
 * Uses pairwise comparisons with WPM-margin sigmoid scoring:
 *   scoreA = 1 / (1 + exp(-wpmDiff / 15))
 * Close races → near-draw; blowouts → larger swings.
 *
 * Bot pairings are weighted at 60% to reduce bot-RNG influence.
 * Accuracy multiplier: gains scaled by min(1, accuracy / 96) — losses unaffected.
 */
export function calculateRaceElo(
  players: Array<{
    id: string;
    elo: number;
    placement: number;
    gamesPlayed: number;
    wpm: number;
    accuracy?: number;
    isBot?: boolean;
  }>
): Map<string, number> {
  const changes = new Map<string, number>();

  for (const player of players) {
    changes.set(player.id, 0);
  }

  for (let i = 0; i < players.length; i++) {
    for (let j = i + 1; j < players.length; j++) {
      const a = players[i];
      const b = players[j];

      // Sigmoid score based on WPM difference (positive = A faster)
      const wpmDiff = a.wpm - b.wpm;
      const scoreA = 1 / (1 + Math.exp(-wpmDiff / 15));

      let changeA = calculateEloChange(a.elo, b.elo, scoreA, a.gamesPlayed);
      let changeB = -calculateEloChange(b.elo, a.elo, 1 - scoreA, b.gamesPlayed);

      // Reduce weight for bot pairings
      const isBotPairing = a.isBot || b.isBot;
      if (isBotPairing) {
        changeA = Math.round(changeA * BOT_WEIGHT);
        changeB = Math.round(changeB * BOT_WEIGHT);
      }

      changes.set(a.id, (changes.get(a.id) ?? 0) + changeA);
      changes.set(b.id, (changes.get(b.id) ?? 0) + changeB);
    }
  }

  // Apply accuracy multiplier to gains only
  for (const player of players) {
    const change = changes.get(player.id) ?? 0;
    if (change > 0 && player.accuracy !== undefined) {
      const accuracyMultiplier = player.accuracy >= 96 ? 1 : player.accuracy / 96;
      changes.set(player.id, Math.round(change * accuracyMultiplier));
    }
  }

  return changes;
}
