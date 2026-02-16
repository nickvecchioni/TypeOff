export interface ChallengeTemplate {
  title: string;
  description: string;
  metric: "wpm" | "races" | "wins" | "streak";
  target: number;
}

export const DAILY_TEMPLATES: ChallengeTemplate[] = [
  { title: "Speed Run", description: "Achieve 80+ WPM in a race", metric: "wpm", target: 80 },
  { title: "Triple Threat", description: "Complete 3 races", metric: "races", target: 3 },
  { title: "Victory Lap", description: "Win a race", metric: "wins", target: 1 },
  { title: "Hot Streak", description: "Win 2 races in a row", metric: "streak", target: 2 },
];

export const WEEKLY_TEMPLATES: ChallengeTemplate[] = [
  { title: "Grinder", description: "Complete 20 races this week", metric: "races", target: 20 },
  { title: "Champion", description: "Win 10 races this week", metric: "wins", target: 10 },
  { title: "Speed Demon", description: "Achieve 100+ WPM in a race", metric: "wpm", target: 100 },
  { title: "Domination", description: "Win 5 races in a row", metric: "streak", target: 5 },
];
