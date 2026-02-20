const BLOCKLIST = [
  "fuck", "shit", "ass", "bitch", "damn", "cunt", "dick",
  "nigger", "nigga", "faggot", "retard", "slut", "whore",
];

const BLOCKLIST_REGEX = new RegExp(
  BLOCKLIST.map((w) => `\\b${w}\\b`).join("|"),
  "gi"
);

export function filterProfanity(text: string): string {
  return text.replace(BLOCKLIST_REGEX, (match) => "*".repeat(match.length));
}

export const GLOBAL_CHAT_MAX_LENGTH = 200;
export const GLOBAL_CHAT_RATE_LIMIT_MS = 2000;
export const GLOBAL_CHAT_HISTORY_SIZE = 50;
