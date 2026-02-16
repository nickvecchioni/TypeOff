export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: "milestone" | "rank" | "performance" | "streak";
}

export const ACHIEVEMENTS: AchievementDef[] = [
  // Milestone
  { id: "first-win", title: "First Blood", description: "Win your first race", icon: "🏆", category: "milestone" },
  { id: "marathon-100", title: "Marathon", description: "Complete 100 races", icon: "🏃", category: "milestone" },
  { id: "veteran-500", title: "Veteran", description: "Complete 500 races", icon: "🎖️", category: "milestone" },

  // Streaks
  { id: "streak-5", title: "Hot Streak", description: "Win 5 races in a row", icon: "🔥", category: "streak" },
  { id: "streak-10", title: "Unstoppable", description: "Win 10 races in a row", icon: "⚡", category: "streak" },

  // Rank
  { id: "hit-silver", title: "Silver Lining", description: "Reach Silver rank", icon: "🥈", category: "rank" },
  { id: "hit-gold", title: "Gold Rush", description: "Reach Gold rank", icon: "🥇", category: "rank" },
  { id: "hit-platinum", title: "Platinum Club", description: "Reach Platinum rank", icon: "💎", category: "rank" },
  { id: "hit-diamond", title: "Diamond Hands", description: "Reach Diamond rank", icon: "💠", category: "rank" },
  { id: "hit-master", title: "Master Class", description: "Reach Master rank", icon: "👑", category: "rank" },
  { id: "hit-grandmaster", title: "Grandmaster", description: "Reach Grandmaster rank", icon: "🏅", category: "rank" },

  // Performance
  { id: "speed-demon", title: "Speed Demon", description: "Achieve 100+ WPM in a race", icon: "💨", category: "performance" },
];

export const ACHIEVEMENT_MAP = new Map<string, AchievementDef>(
  ACHIEVEMENTS.map((a) => [a.id, a])
);
