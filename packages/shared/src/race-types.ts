/** Status of a race room */
export type RaceStatus = "waiting" | "countdown" | "racing" | "finished";

/** A player in a race */
export interface RacePlayer {
  id: string;
  name: string;
  isGuest: boolean;
  elo: number;
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
}

/** Party state */
export interface PartyState {
  partyId: string;
  leaderId: string;
  members: Array<{ userId: string; name: string }>;
}

/** Client → Server events */
export interface ClientToServerEvents {
  joinQueue: (data: { token?: string }) => void;
  leaveQueue: () => void;
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
  // Spectator events
  listActiveRaces: () => void;
  spectateRace: (data: { raceId: string }) => void;
  stopSpectating: () => void;
}

/** Server → Client events */
export interface ServerToClientEvents {
  queueUpdate: (data: { count: number }) => void;
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
    }>;
    placementRace?: number;
    placementTotal?: number;
  }) => void;
  // Party events
  partyUpdate: (data: PartyState) => void;
  partyInvite: (data: { partyId: string; fromUserId: string; fromName: string }) => void;
  partyDisbanded: () => void;
  partyError: (data: { message: string }) => void;
  // Spectator events
  activeRaces: (data: { races: Array<{ raceId: string; players: RacePlayer[]; status: RaceStatus }> }) => void;
  spectateStarted: (data: RaceState) => void;
  error: (data: { message: string }) => void;
  // Social events
  friendStatus: (data: { userId: string; online: boolean }) => void;
  friendStatuses: (data: Array<{ userId: string; online: boolean }>) => void;
}
