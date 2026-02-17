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
 * Calculate ELO change for a pairwise matchup.
 * @param ratingA - Player A's rating
 * @param ratingB - Player B's rating
 * @param scoreA - 1 if A won, 0 if A lost, 0.5 for draw
 * @param gamesPlayed - Number of games player A has played (affects K-factor)
 * @returns ELO change for player A (negate for player B)
 */
export function calculateEloChange(
  ratingA: number,
  ratingB: number,
  scoreA: number,
  gamesPlayed: number
): number {
  const K = gamesPlayed < 30 ? 32 : 16;
  const expectedA = 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
  return Math.round(K * (scoreA - expectedA));
}

/**
 * Calculate ELO changes for all players in a race based on placements.
 * Uses pairwise comparisons: each player "wins" against those placed below,
 * "loses" against those placed above.
 */
export function calculateRaceElo(
  players: Array<{
    id: string;
    elo: number;
    placement: number;
    gamesPlayed: number;
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

      // Lower placement = better (1st place beats 2nd place)
      const scoreA = a.placement < b.placement ? 1 : a.placement > b.placement ? 0 : 0.5;

      const changeA = calculateEloChange(a.elo, b.elo, scoreA, a.gamesPlayed);

      changes.set(a.id, (changes.get(a.id) ?? 0) + changeA);
      changes.set(b.id, (changes.get(b.id) ?? 0) - changeA);
    }
  }

  return changes;
}
