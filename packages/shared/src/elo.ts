export type RankTier =
  | "bronze"
  | "silver"
  | "gold"
  | "platinum"
  | "diamond"
  | "master";

const RANK_THRESHOLDS: [number, RankTier][] = [
  [1800, "master"],
  [1500, "diamond"],
  [1300, "platinum"],
  [1100, "gold"],
  [900, "silver"],
  [0, "bronze"],
];

export function getRankTier(elo: number): RankTier {
  for (const [threshold, tier] of RANK_THRESHOLDS) {
    if (elo >= threshold) return tier;
  }
  return "bronze";
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
