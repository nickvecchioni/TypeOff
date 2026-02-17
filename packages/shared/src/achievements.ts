export type AchievementCategory =
  | "speed"
  | "accuracy"
  | "volume"
  | "wins"
  | "rank"
  | "social";

export type AchievementRarity = "common" | "rare" | "epic" | "legendary";

export interface AchievementDefinition {
  id: string;
  name: string;
  description: string;
  category: AchievementCategory;
  icon: string;
  rarity: AchievementRarity;
}

export const ACHIEVEMENTS: AchievementDefinition[] = [
  // Speed
  { id: "speed_100", name: "Century", description: "Reach 100 WPM", category: "speed", icon: "\u26A1", rarity: "common" },
  { id: "speed_150", name: "Blazing", description: "Reach 150 WPM", category: "speed", icon: "\uD83D\uDD25", rarity: "epic" },
  { id: "speed_200", name: "Lightning", description: "Reach 200 WPM", category: "speed", icon: "\uD83C\uDF29\uFE0F", rarity: "legendary" },

  // Accuracy
  { id: "accuracy_perfect", name: "Perfectionist", description: "100% accuracy in a race", category: "accuracy", icon: "\uD83C\uDFAF", rarity: "rare" },
  { id: "accuracy_95_x10", name: "Sharpshooter", description: "10 races with 95%+ accuracy", category: "accuracy", icon: "\uD83D\uDD2B", rarity: "epic" },

  // Volume
  { id: "races_1", name: "First Race", description: "Complete your first race", category: "volume", icon: "\uD83C\uDFC1", rarity: "common" },
  { id: "races_10", name: "Regular", description: "Complete 10 races", category: "volume", icon: "\uD83D\uDD01", rarity: "common" },
  { id: "races_50", name: "Veteran", description: "Complete 50 races", category: "volume", icon: "\uD83C\uDF96\uFE0F", rarity: "rare" },
  { id: "races_100", name: "Centurion", description: "Complete 100 races", category: "volume", icon: "\uD83D\uDEE1\uFE0F", rarity: "epic" },
  { id: "races_500", name: "Addict", description: "Complete 500 races", category: "volume", icon: "\uD83E\uDDE0", rarity: "legendary" },

  // Wins
  { id: "wins_1", name: "First Blood", description: "Win your first race", category: "wins", icon: "\uD83E\uDD47", rarity: "common" },
  { id: "wins_10", name: "Dominant", description: "Win 10 races", category: "wins", icon: "\uD83C\uDFC6", rarity: "rare" },
  { id: "wins_50", name: "Champion", description: "Win 50 races", category: "wins", icon: "\uD83D\uDC51", rarity: "epic" },
  { id: "streak_3", name: "On Fire", description: "3 win streak", category: "wins", icon: "\uD83D\uDD25", rarity: "common" },
  { id: "streak_5", name: "Unstoppable", description: "5 win streak", category: "wins", icon: "\uD83D\uDCA8", rarity: "rare" },
  { id: "streak_10", name: "Legendary", description: "10 win streak", category: "wins", icon: "\u2B50", rarity: "legendary" },

  // Rank
  { id: "rank_silver", name: "Silver Lining", description: "Reach Silver", category: "rank", icon: "\uD83E\uDD48", rarity: "common" },
  { id: "rank_gold", name: "Gold Standard", description: "Reach Gold", category: "rank", icon: "\uD83E\uDD47", rarity: "rare" },
  { id: "rank_platinum", name: "Platinum Club", description: "Reach Platinum", category: "rank", icon: "\uD83D\uDCA0", rarity: "rare" },
  { id: "rank_diamond", name: "Diamond Hands", description: "Reach Diamond", category: "rank", icon: "\uD83D\uDC8E", rarity: "epic" },
  { id: "rank_master", name: "Mastery", description: "Reach Master", category: "rank", icon: "\uD83C\uDFAE", rarity: "epic" },
  { id: "rank_grandmaster", name: "Grandmaster", description: "Reach Grandmaster", category: "rank", icon: "\uD83D\uDC09", rarity: "legendary" },

  // Social
  { id: "friend_1", name: "Friendly", description: "Add your first friend", category: "social", icon: "\uD83E\uDD1D", rarity: "common" },
];

export const ACHIEVEMENT_MAP = new Map<string, AchievementDefinition>(
  ACHIEVEMENTS.map((a) => [a.id, a]),
);
