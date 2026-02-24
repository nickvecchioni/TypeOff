/** Emote keys for in-race reactions */
export const EMOTE_KEYS = ["gg", "nice", "oof", "wow", "gl", "lol"] as const;
export type EmoteKey = (typeof EMOTE_KEYS)[number];

/** Status of a race room */
export type RaceStatus = "waiting" | "countdown" | "racing" | "finished";

/** Race mode determines text generation and display */
export type RaceMode = "standard" | "quotes" | "marathon" | "sprint" | "punctuation" | "numbers" | "difficult" | "code" | "special";

/** Mode category chosen by player before queuing */
export type ModeCategory = "words" | "special" | "quotes" | "code";

/** A player in a race */
export interface RacePlayer {
  id: string;
  name: string;
  isGuest: boolean;
  elo: number;
  activeBadge?: string | null;
  activeNameColor?: string | null;
  activeNameEffect?: string | null;
}

/** Real-time progress of a player */
export interface RacePlayerProgress {
  playerId: string;
  wordIndex: number;
  charIndex: number;
  wpm: number;
  progress: number; // 0-1
  finished: boolean;
  placement: number | null;
  finalStats: {
    wpm: number;
    rawWpm: number;
    accuracy: number;
  } | null;
}

/** Full race state sent to clients */
export interface RaceState {
  raceId: string;
  status: RaceStatus;
  players: RacePlayer[];
  progress: Record<string, RacePlayerProgress>;
  seed: number;
  wordCount: number;
  countdown: number; // seconds remaining in countdown
  finishTimeoutEnd: number | null; // timestamp when race force-ends
  placementRace?: number; // 1-3 during placement, undefined for ranked
  mode: RaceMode; // race mode (standard, quotes, marathon, sprint)
}

/** Party state */
export interface PartyState {
  partyId: string;
  leaderId: string;
  members: Array<{ userId: string; name: string }>;
  privateRace: boolean;
  readyState: Record<string, boolean>;
}

/** Client → Server events */
export interface ClientToServerEvents {
  joinQueue: (data: { token?: string; privateRace?: boolean; modeCategories?: ModeCategory[] }) => void;
  leaveQueue: () => void;
  leaveRace: () => void;
  raceProgress: (data: {
    wordIndex: number;
    charIndex: number;
    wpm: number;
    progress: number;
  }) => void;
  raceFinish: (data: {
    wpm: number;
    rawWpm: number;
    accuracy: number;
    misstypedChars?: number;
    wpmHistory?: import("./types").WpmSample[];
    keystrokeTimings?: number[];
  }) => void;
  // Social events
  requestFriendStatuses: (data: { token?: string }) => void;
  // Party events
  createParty: (data: { token?: string }) => void;
  inviteToParty: (data: { userId: string }) => void;
  respondToPartyInvite: (data: { partyId: string; accept: boolean; token?: string }) => void;
  leaveParty: () => void;
  kickFromParty: (data: { userId: string }) => void;
  // Party race events
  partySetPrivateRace: (data: { privateRace: boolean }) => void;
  partyMarkReady: () => void;
  // Spectator events
  listActiveRaces: () => void;
  spectateRace: (data: { raceId: string; token?: string }) => void;
  stopSpectating: () => void;
  // Follow events (persistent spectating)
  followPlayer: (data: { userId: string }) => void;
  stopFollowing: () => void;
  // Emote events
  sendRaceEmote: (data: { emote: EmoteKey; token?: string }) => void;
  // Party chat
  sendPartyMessage: (data: { message: string }) => void;
  // Direct messages (legacy sendDm + newer sendDirectMessage)
  sendDm: (data: { toUserId: string; message: string; token?: string }) => void;
  sendDirectMessage: (data: { token?: string; recipientId: string; content: string }) => void;
  markMessagesRead: (data: { token?: string; friendId: string }) => void;
  // Reconnection events
  rejoinRace: (data: { token?: string }) => void;
}

/** Server → Client events */
export interface ServerToClientEvents {
  queueUpdate: (data: { count: number; maxWaitSeconds: number }) => void;
  raceStart: (data: RaceState) => void;
  raceCountdown: (data: { countdown: number }) => void;
  raceProgress: (data: { progress: Record<string, RacePlayerProgress>; finishTimeoutEnd?: number }) => void;
  raceFinished: (data: {
    results: Array<{
      playerId: string;
      name: string;
      username?: string;
      placement: number;
      wpm: number;
      rawWpm: number;
      accuracy: number;
      misstypedChars?: number;
      eloChange: number | null;
      elo?: number;
      streak?: number;
      wpmHistory?: import("./types").WpmSample[];
      newAchievements?: string[];
      challengeProgress?: Array<{
        challengeId: string;
        progress: number;
        target: number;
        completed: boolean;
        justCompleted: boolean;
        xpAwarded: number;
      }>;
      xpEarned?: number;
      xpProgress?: {
        xpEarned: number;
        totalXp: number;
        level: number;
        levelUp: boolean;
        newRewards: Array<{
          level: number;
          type: string;
          id: string;
          name: string;
          value: string;
        }>;
      };
      activeBadge?: string | null;
      activeNameColor?: string | null;
      activeNameEffect?: string | null;
      previousBestWpm?: number;
    }>;
    placementRace?: number;
    placementTotal?: number;
  }) => void;
  // Party events
  partyUpdate: (data: PartyState) => void;
  partyInvite: (data: { partyId: string; fromUserId: string; fromName: string }) => void;
  partyDisbanded: () => void;
  partyReadyReset: () => void;
  partyError: (data: { message: string }) => void;
  // Spectator events
  activeRaces: (data: { races: Array<{ raceId: string; players: RacePlayer[]; status: RaceStatus; spectatorCount: number }> }) => void;
  spectateStarted: (data: RaceState) => void;
  spectatorUpdate: (data: { raceId: string; count: number; spectators: Array<{ userId: string; name: string }> }) => void;
  error: (data: { message: string }) => void;
  // Social events
  friendStatus: (data: { userId: string; online: boolean; lastSeen?: string | null; raceId?: string | null }) => void;
  friendStatuses: (data: Array<{ userId: string; online: boolean; lastSeen?: string | null; raceId?: string | null }>) => void;
  // Follow events (persistent spectating)
  followedPlayerRacing: (data: { raceId: string; userId: string }) => void;
  // Notification events
  notification: (data: { id: string; type: string; title: string; body: string; metadata?: string; actionUrl?: string; createdAt: string }) => void;
  // Emote events
  raceEmote: (data: { playerId: string; playerName: string; emote: EmoteKey }) => void;
  // Party chat
  partyMessage: (data: { userId: string; name: string; message: string; timestamp: number }) => void;
  // Direct messages (legacy dmMessage + newer directMessage)
  dmMessage: (data: { id: string; fromUserId: string; fromName: string; toUserId: string; message: string; timestamp: number }) => void;
  directMessage: (data: { messageId: string; senderId: string; recipientId: string; content: string; createdAt: string }) => void;
  messagesMarkedRead: (data: { friendId: string; byUserId: string }) => void;
}
