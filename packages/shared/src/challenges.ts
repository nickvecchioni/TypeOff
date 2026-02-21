import { mulberry32 } from "./prng";

// ─── Types ────────────────────────────────────────────────────────────

export type ChallengeType = "weekly";

export type ChallengeCategory =
  | "speed"
  | "accuracy"
  | "volume"
  | "wins"
  | "streak"
  | "top2";

export interface ChallengeDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  type: ChallengeType;
  category: ChallengeCategory;
  xpReward: number;
  target: number;
  /** For binary challenges: the WPM/accuracy threshold to hit (target is then 1) */
  threshold?: number;
}

export interface ChallengeProgress {
  challengeId: string;
  progress: number;
  target: number;
  completed: boolean;
  justCompleted: boolean;
  xpAwarded: number;
}

export interface XpLevel {
  level: number;
  currentXp: number;
  nextLevelXp: number;
}

// ─── Challenge Definitions ────────────────────────────────────────────

export const WEEKLY_CHALLENGES: ChallengeDefinition[] = [
  { id: "w_races_20", name: "Weekly Warrior", description: "Complete 20 ranked races this week", icon: "\u2694\uFE0F", type: "weekly", category: "volume", xpReward: 300, target: 20 },
  { id: "w_races_40", name: "Grinder", description: "Complete 40 ranked races this week", icon: "\uD83D\uDCAA", type: "weekly", category: "volume", xpReward: 500, target: 40 },
  { id: "w_wins_10", name: "Weekly Champion", description: "Win 10 ranked races this week", icon: "\uD83D\uDC51", type: "weekly", category: "wins", xpReward: 400, target: 10 },
  { id: "w_speed_100", name: "Century Club", description: "Hit 100+ WPM in 5 races this week", icon: "\uD83D\uDD25", type: "weekly", category: "speed", xpReward: 350, target: 5 },
  { id: "w_acc_95", name: "Consistency", description: "Finish 10 races with 95%+ accuracy this week", icon: "\uD83C\uDFAF", type: "weekly", category: "accuracy", xpReward: 350, target: 10 },
  { id: "w_streak_5", name: "Dominant Week", description: "Achieve a 5 win streak this week", icon: "\uD83D\uDCA8", type: "weekly", category: "streak", xpReward: 500, target: 5 },
];

// ─── Lookup Map ───────────────────────────────────────────────────────

const ALL_CHALLENGES = [...WEEKLY_CHALLENGES];
export const CHALLENGE_MAP = new Map<string, ChallengeDefinition>(
  ALL_CHALLENGES.map((c) => [c.id, c]),
);

// ─── Date Keys ────────────────────────────────────────────────────────

/** Returns "YYYY-MM-DD" in America/New_York (resets at midnight ET) */
function etDateString(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(date);
}

/** "2026-W08" — keyed to Eastern Time week boundary */
export function getWeeklyKey(date?: Date): string {
  const d = date ?? new Date();
  const etStr = etDateString(d);
  const [y, m, day] = etStr.split("-").map(Number);
  const tmp = new Date(Date.UTC(y, m - 1, day));
  tmp.setUTCDate(tmp.getUTCDate() + 4 - (tmp.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((tmp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${tmp.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

// ─── Deterministic Rotation ───────────────────────────────────────────

/** ET week number since epoch */
function weekNumber(date?: Date): number {
  const d = date ?? new Date();
  const etStr = etDateString(d);
  const [y, m, day] = etStr.split("-").map(Number);
  return Math.floor(Date.UTC(y, m - 1, day) / 86400000 / 7);
}

/** Pick `count` items from `pool` using seeded shuffle */
function pickSeeded<T>(pool: T[], count: number, seed: number): T[] {
  const rng = mulberry32(seed);
  const arr = [...pool];
  // Fisher-Yates shuffle
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, count);
}

/** Get 1 weekly challenge for a given date (same for all players) */
export function getWeeklyChallenges(date?: Date): ChallengeDefinition[] {
  return pickSeeded(WEEKLY_CHALLENGES, 1, weekNumber(date) * 7919);
}

/** Get all active challenges (1 weekly) */
export function getActiveChallenges(date?: Date): ChallengeDefinition[] {
  return getWeeklyChallenges(date);
}

// ─── XP Leveling ───────────────────────────────────────────────────────

/** Each level costs level * 200 XP */
export function getXpLevel(totalXp: number): XpLevel {
  let level = 1;
  let xpUsed = 0;

  while (true) {
    const cost = level * 200;
    if (xpUsed + cost > totalXp) {
      return {
        level,
        currentXp: totalXp - xpUsed,
        nextLevelXp: cost,
      };
    }
    xpUsed += cost;
    level++;
  }
}
