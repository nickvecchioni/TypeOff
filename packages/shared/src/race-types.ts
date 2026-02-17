import type { WordPool } from "./words";

/** Race type = word pool difficulty */
export type RaceType = WordPool;

export const RACE_TYPE_LABELS: Record<RaceType, string> = {
  common: "Easy",
  medium: "Medium",
  hard: "Hard",
};

export const RACE_TYPE_WORD_COUNTS: Record<RaceType, number> = {
  common: 25,
  medium: 50,
  hard: 75,
};

/** Status of a race room */
export type RaceStatus = "waiting" | "countdown" | "racing" | "finished";

/** A player in a race */
export interface RacePlayer {
  id: string;
  name: string;
  isGuest: boolean;
  elo: number;
  eloByType?: Partial<Record<RaceType, number>>;
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
  wordPool?: WordPool;
  countdown: number; // seconds remaining in countdown
  finishTimeoutEnd: number | null; // timestamp when race force-ends
  placementRace?: number; // 1-3 during placement, undefined for ranked
  raceType?: RaceType; // which competitive queue this race belongs to
}

/** Lobby state */
export interface LobbyState {
  code: string;
  hostId: string;
  players: RacePlayer[];
}

/** Client → Server events */
export interface ClientToServerEvents {
  joinQueue: (data: { token?: string; raceType?: RaceType }) => void;
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
    wpmHistory?: import("./types").WpmSample[];
    keystrokeTimings?: number[];
  }) => void;
  // Lobby events
  createLobby: (data: { token?: string }) => void;
  joinLobby: (data: { code: string; token?: string }) => void;
  leaveLobby: () => void;
  startLobby: () => void;
  // Spectator events
  listActiveRaces: () => void;
  spectateRace: (data: { raceId: string }) => void;
  stopSpectating: () => void;
  // Lobby chat
  lobbyChat: (data: { message: string }) => void;
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
      eloChange: number | null;
      elo?: number;
      streak?: number;
      wpmHistory?: import("./types").WpmSample[];
    }>;
    placementRace?: number;
    placementTotal?: number;
    raceType?: RaceType;
  }) => void;
  // Lobby events
  lobbyCreated: (data: LobbyState) => void;
  lobbyUpdate: (data: LobbyState) => void;
  lobbyError: (data: { message: string }) => void;
  lobbyClosed: () => void;
  // Spectator events
  activeRaces: (data: { races: Array<{ raceId: string; players: RacePlayer[]; status: RaceStatus }> }) => void;
  spectateStarted: (data: RaceState) => void;
  error: (data: { message: string }) => void;
  // Social events
  friendStatus: (data: { userId: string; online: boolean }) => void;
  lobbyChatMessage: (data: { playerId: string; name: string; message: string; timestamp: number }) => void;
}
