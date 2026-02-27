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

/** Compute integer division boundaries for a tier's range */
function divisionThresholds(t: { min: number; max: number }): [number, number] {
  const range = t.max - t.min + 1;
  const third = Math.floor(range / 3);
  return [third, third * 2];
}

/** Get full rank info including division */
export function getRankInfo(elo: number): RankInfo {
  for (const t of RANK_TIERS) {
    if (elo >= t.min) {
      if (t.tier === "grandmaster") {
        return { tier: "grandmaster", division: null, label: "Grandmaster" };
      }
      const offset = elo - t.min;
      const [d3, d2] = divisionThresholds(t);
      let div: number;
      if (offset >= d2) div = 1;
      else if (offset >= d3) div = 2;
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
      const [d3, d2] = divisionThresholds(t);
      const offset = elo - t.min;
      let divStart: number;
      let divSize: number;
      if (offset >= d2) {
        divStart = d2;
        divSize = (t.max - t.min + 1) - d2;
      } else if (offset >= d3) {
        divStart = d3;
        divSize = d2 - d3;
      } else {
        divStart = 0;
        divSize = d3;
      }
      return (offset - divStart) / divSize;
    }
  }
  return 0;
}

/** ELO needed for next division/tier promotion. null if Grandmaster. */
export function getNextDivisionElo(elo: number): number | null {
  for (const t of RANK_TIERS) {
    if (elo >= t.min) {
      if (t.tier === "grandmaster") return null;
      const [d3, d2] = divisionThresholds(t);
      const offset = elo - t.min;
      if (offset >= d2) return t.max + 1; // promote to next tier
      if (offset >= d3) return t.min + d2;
      return t.min + d3;
    }
  }
  return 333; // next Bronze division (Bronze III → Bronze II)
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
 * Uses pairwise comparisons with a blended score:
 *   wpmScore    = 1 / (1 + exp(-wpmDiff / 15))   — sigmoid on WPM margin
 *   placementScore = 1 if A placed higher than B, else 0
 *   scoreA      = wpmScore * 0.6 + placementScore * 0.4
 *
 * The placement component ensures any win (regardless of WPM margin) always
 * produces a positive score, preventing tight victories from rounding to 0 ELO.
 * The WPM component preserves larger swings for dominant performances.
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

      // Blended score: WPM margin (60%) + placement outcome (40%)
      // Placement component ensures any win yields a positive score even when
      // WPM margins are too small for the sigmoid to clear the rounding threshold.
      const wpmDiff = a.wpm - b.wpm;
      const wpmScore = 1 / (1 + Math.exp(-wpmDiff / 15));
      const placementScore = a.placement < b.placement ? 1 : 0;
      const scoreA = wpmScore * 0.6 + placementScore * 0.4;

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
