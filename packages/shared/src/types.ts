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

export interface TestConfig {
  mode: TestMode;
  duration: number; // seconds for timed, word count for wordcount
}

export type EngineStatus = "idle" | "typing" | "finished";

export interface WpmSample {
  elapsed: number; // seconds
  wpm: number;
  raw: number;
}

export interface TestStats {
  wpm: number;
  rawWpm: number;
  accuracy: number;
  correctChars: number;
  incorrectChars: number;
  extraChars: number;
  totalChars: number;
  time: number;
  wpmHistory: WpmSample[];
}

export interface EngineAPI {
  words: WordState[];
  currentWordIndex: number;
  currentCharIndex: number;
  status: EngineStatus;
  timeLeft: number;
  config: TestConfig;
  liveWpm: number;
  liveAccuracy: number;
  stats: TestStats | null;
  setConfig: (config: TestConfig) => void;
  restart: () => void;
}
