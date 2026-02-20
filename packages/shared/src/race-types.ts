/** Emote keys for in-race reactions */
export const EMOTE_KEYS = ["gg", "nice", "oof", "wow", "gl", "lol"] as const;
export type EmoteKey = (typeof EMOTE_KEYS)[number];

/** Status of a race room */
export type RaceStatus = "waiting" | "countdown" | "racing" | "finished";

/** Race mode determines text generation and display */
export type RaceMode = "standard" | "quotes" | "marathon" | "sprint";

/** A player in a race */
export interface RacePlayer {
  id: string;
  name: string;
  isGuest: boolean;
  elo: number;
  activeBadge?: string | null;
  activeNameColor?: string | null;
  activeNameEffect?: string | null;
  clanTag?: string | null;
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
  joinQueue: (data: { token?: string; privateRace?: boolean }) => void;
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
  // Chat events
  sendDirectMessage: (data: { token?: string; recipientId: string; content: string }) => void;
  markMessagesRead: (data: { token?: string; friendId: string }) => void;
  // Follow events (persistent spectating)
  followPlayer: (data: { userId: string }) => void;
  stopFollowing: () => void;
  // Clan events
  respondToClanInvite: (data: { inviteId: string; accept: boolean; token?: string }) => void;
  // Emote events
  sendRaceEmote: (data: { emote: EmoteKey; token?: string }) => void;
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
      typePassProgress?: {
        seasonId: string;
        seasonalXp: number;
        currentTier: number;
        isPremium: boolean;
        xpEarned: number;
        tierUp: boolean;
        newTier: number;
        newRewards: Array<{
          tier: number;
          type: string;
          id: string;
          name: string;
          value: string;
          premium: boolean;
        }>;
      };
      activeBadge?: string | null;
      activeNameColor?: string | null;
      activeNameEffect?: string | null;
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
  // Chat events
  directMessage: (data: {
    messageId: string;
    senderId: string;
    recipientId: string;
    senderName: string;
    content: string;
    createdAt: string;
  }) => void;
  messagesMarkedRead: (data: { byUserId: string; friendId: string }) => void;
  // Follow events (persistent spectating)
  followedPlayerRacing: (data: { raceId: string; userId: string }) => void;
  // Notification events
  notification: (data: { id: string; type: string; title: string; body: string; metadata?: string; actionUrl?: string; createdAt: string }) => void;
  // Clan events
  clanInvite: (data: { inviteId: string; clanId: string; clanName: string; clanTag: string; fromName: string }) => void;
  // Emote events
  raceEmote: (data: { playerId: string; playerName: string; emote: EmoteKey }) => void;
}
