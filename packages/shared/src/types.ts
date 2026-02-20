export type CharStatus = "idle" | "correct" | "incorrect";

export interface CharState {
  expected: string;
  actual: string | null;
  status: CharStatus;
}

export interface WordState {
  chars: CharState[];
  extraChars: CharState[];
}

export type TestMode = "timed" | "wordcount";

export type ContentType = "words" | "quotes" | "marathon" | "sprint" | "custom" | "practice" | "code" | "zen";
export type Difficulty = "easy" | "medium" | "hard";

export type StrictMode = "normal" | "expert" | "master";

export interface TestConfig {
  mode: TestMode;
  duration: number; // seconds for timed, word count for wordcount
  contentType: ContentType;
  difficulty: Difficulty;
  punctuation: boolean;
  customText?: string;    // raw pasted text for "custom" mode
  weakKeys?: string[];    // populated from server for "practice" mode
  strictMode?: StrictMode;
  codeLanguage?: string;
  weakBigrams?: string[];
  ghostReplayData?: ReplaySnapshot[];
}

/** Build a key for the word-pool column: "words:easy:false" */
export function getWordPoolKey(config: TestConfig): string {
  return `${config.contentType ?? "words"}:${config.difficulty ?? "easy"}:${config.punctuation ?? false}`;
}

/** Build a key for PB lookup: "timed:15:words:easy:false" */
export function getPbKey(config: TestConfig): string {
  return `${config.mode}:${config.duration}:${getWordPoolKey(config)}`;
}

export type EngineStatus = "idle" | "typing" | "finished";

export interface WpmSample {
  elapsed: number; // seconds
  wpm: number;
  raw: number;
}

/** Per-key accuracy stat tracked during a test */
export interface KeyStat {
  correct: number;
  total: number;
}

/** Map from key character to its accuracy stat */
export type KeyStatsMap = Record<string, KeyStat>;

export interface TestStats {
  wpm: number;
  rawWpm: number;
  accuracy: number;
  correctChars: number;
  incorrectChars: number;
  extraChars: number;
  misstypedChars: number;
  totalChars: number;
  time: number;
  wpmHistory: WpmSample[];
  keyStats: KeyStatsMap;
  consistency: number; // 0-100, higher = more consistent WPM
  failed?: boolean;
  failedAt?: { wordIndex: number; charIndex: number };
  bigramStats?: Record<string, { correct: number; total: number }>;
}

export interface TextDifficultyInfo {
  score: number;       // 0-1, higher = harder
  bigramRarity: number;
  avgWordLength: number;
  specialCharDensity: number;
}

export interface GhostCursor {
  wordIndex: number;
  charIndex: number;
  progress: number;
  name: string;
  wpm: number;
}

export interface ReplaySnapshot {
  t: number; // elapsed ms since race start
  w: number; // wordIndex
  c: number; // charIndex
}

export interface EngineAPI {
  words: WordState[];
  currentWordIndex: number;
  currentCharIndex: number;
  status: EngineStatus;
  timeLeft: number;
  config: TestConfig;
  liveWpm: number;
  stats: TestStats | null;
  setConfig: (config: TestConfig) => void;
  restart: () => void;
}
