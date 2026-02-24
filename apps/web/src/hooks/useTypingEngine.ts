"use client";

import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import {
  type CharState,
  type WordState,
  type TestConfig,
  type TestStats,
  type EngineStatus,
  type EngineAPI,
  type WpmSample,
  type KeyStatsMap,
  type ReplaySnapshot,
  type ContentType,
  generateFromPool,
  generateSoloWords,
  generateWords,
  wordPoolByDifficulty,
} from "@typeoff/shared";

const DEFAULT_CONFIG: TestConfig = {
  mode: "timed",
  duration: 15,
  contentType: "words",
  difficulty: "easy",
  punctuation: false,
};
const WORD_POOL_SIZE = 200;

export interface TypingEngine extends EngineAPI {
  handleKeyDown: (e: React.KeyboardEvent) => void;
  timeElapsed: number;
  stopZen: () => void;
  replaySnapshots: React.MutableRefObject<ReplaySnapshot[]>;
  startRaceTimer: () => void;
}

export interface ExternalConfig {
  externalSeed?: number;
  externalWordCount?: number;
  externalWords?: string[]; // pre-built word list (e.g. quotes mode)
  mode?: "timed" | "wordcount";
  contentType?: ContentType;
}

function createWordStates(wordStrings: string[]): WordState[] {
  return wordStrings.map((word) => ({
    chars: word.split("").map((ch) => ({
      expected: ch,
      actual: null,
      status: "idle" as const,
    })),
    extraChars: [],
  }));
}

export function useTypingEngine(external?: ExternalConfig): TypingEngine {
  const wordCount = external?.externalWords?.length ?? external?.externalWordCount ?? 50;
  const initialConfig: TestConfig = external?.mode === "wordcount"
    ? { ...DEFAULT_CONFIG, mode: "wordcount", duration: wordCount, contentType: external?.contentType ?? "words" }
    : DEFAULT_CONFIG;
  const [config, setConfig] = useState<TestConfig>(initialConfig);
  const [words, setWords] = useState<WordState[]>([]);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [currentCharIndex, setCurrentCharIndex] = useState(0);
  const [status, setStatus] = useState<EngineStatus>("idle");
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [stats, setStats] = useState<TestStats | null>(null);

  // Tab+Enter restart: Tab sets flag, Enter triggers
  const tabPressedRef = useRef(false);

  // Refs for stats counters — avoid re-render on every keystroke
  const correctCharsRef = useRef(0);
  const incorrectCharsRef = useRef(0);
  const extraCharsRef = useRef(0);
  const misstypedCharsRef = useRef(0);
  const totalCharsRef = useRef(0);
  const keyStatsRef = useRef<Map<string, { correct: number; total: number }>>(new Map());
  // Bigram tracking (prevChar + currentChar)
  const bigramStatsRef = useRef<Map<string, { correct: number; total: number }>>(new Map());
  const prevTypedCharRef = useRef<string | null>(null);
  // Zen mode batch counter for generating more words
  const zenBatchRef = useRef(0);
  // Replay snapshot tracking for solo mode
  const replaySnapshotsRef = useRef<ReplaySnapshot[]>([]);

  // Whether the effective behavior is "type all words and finish" (wordcount-like)
  const isWordcountBehavior =
    config.mode === "wordcount" ||
    config.contentType === "quotes" ||
    config.contentType === "marathon" ||
    config.contentType === "sprint" ||
    config.contentType === "custom" ||
    config.contentType === "practice" ||
    config.contentType === "code";

  // Generate words on mount (avoids hydration mismatch from Date.now() seed)
  const initialized = useRef(false);
  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      if (external?.externalWords) {
        setWords(createWordStates(external.externalWords));
      } else if (external?.externalSeed != null || external?.externalWordCount != null) {
        const seed = external?.externalSeed ?? undefined;
        const count = external?.externalWordCount ?? WORD_POOL_SIZE;
        const wordStrings = generateFromPool(count, seed);
        setWords(createWordStates(wordStrings));
      } else {
        const wordStrings = generateSoloWords(config);
        setWords(createWordStates(wordStrings));
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Timer refs
  const startTimeRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const wpmHistoryRef = useRef<WpmSample[]>([]);

  const timeLeft = useMemo(() => {
    if (config.mode === "timed") {
      return Math.max(0, config.duration - timeElapsed);
    }
    return 0;
  }, [config, timeElapsed]);

  // Live stats — only recompute on timeElapsed changes (1/sec), not per keystroke
  const liveWpm = useMemo(() => {
    if (timeElapsed === 0) return 0;
    return Math.round((correctCharsRef.current / 5) / (timeElapsed / 60));
  }, [timeElapsed]);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const finishedRef = useRef(false);
  const finishTest = useCallback(() => {
    if (finishedRef.current) return; // Already finished — avoid duplicate calls
    finishedRef.current = true;
    stopTimer();
    const elapsed = (performance.now() - startTimeRef.current) / 1000;
    const correct = correctCharsRef.current;
    const incorrect = incorrectCharsRef.current;
    if (correct === 0 || elapsed <= 0) {
      console.warn("[useTypingEngine] finishTest called with suspicious values:", { correct, elapsed, startTime: startTimeRef.current });
    }
    const extra = extraCharsRef.current;
    const mistyped = misstypedCharsRef.current;
    const total = correct + incorrect + extra;
    const wpm = elapsed > 0 ? Math.round(((correct / 5) / (elapsed / 60)) * 100) / 100 : 0;
    const rawWpm = elapsed > 0 ? Math.round(((total / 5) / (elapsed / 60)) * 100) / 100 : 0;
    const totalKeystrokes = correct + mistyped;
    const accuracy = totalKeystrokes > 0 ? Math.round((correct / totalKeystrokes) * 100 * 10) / 10 : 100;

    // Convert per-key stats Map to plain Record
    const keyStats: KeyStatsMap = {};
    keyStatsRef.current.forEach((v, k) => { keyStats[k] = v; });

    // Consistency: 100 - coefficient of variation of WPM samples
    const wpmSamples = wpmHistoryRef.current.map(s => s.wpm).filter(v => v > 0);
    let consistency = 100;
    if (wpmSamples.length >= 2) {
      const mean = wpmSamples.reduce((a, b) => a + b, 0) / wpmSamples.length;
      const variance = wpmSamples.reduce((s, v) => s + (v - mean) ** 2, 0) / wpmSamples.length;
      const cv = mean > 0 ? (Math.sqrt(variance) / mean) * 100 : 100;
      consistency = Math.round(Math.max(0, Math.min(100, 100 - cv)));
    }

    // Bigram stats Map to plain Record
    const bigramStats: Record<string, { correct: number; total: number }> = {};
    bigramStatsRef.current.forEach((v, k) => { bigramStats[k] = v; });

    setStats({
      wpm,
      rawWpm,
      accuracy,
      correctChars: correct,
      incorrectChars: incorrect,
      extraChars: extra,
      misstypedChars: mistyped,
      totalChars: total,
      time: Math.round(elapsed),
      wpmHistory: wpmHistoryRef.current,
      keyStats,
      consistency,
      bigramStats: Object.keys(bigramStats).length > 0 ? bigramStats : undefined,
    });
    setStatus("finished");
  }, [stopTimer]);

  const startTimer = useCallback(() => {
    startTimeRef.current = performance.now();
    wpmHistoryRef.current = [];

    timerRef.current = setInterval(() => {
      const elapsed = (performance.now() - startTimeRef.current) / 1000;
      const secs = Math.floor(elapsed);
      setTimeElapsed(secs);

      // Sample WPM every second
      const correct = correctCharsRef.current;
      const total = correct + incorrectCharsRef.current + extraCharsRef.current;
      const wpm = elapsed > 0 ? Math.round((correct / 5) / (elapsed / 60)) : 0;
      const raw = elapsed > 0 ? Math.round((total / 5) / (elapsed / 60)) : 0;
      wpmHistoryRef.current.push({ elapsed: secs, wpm, raw });
    }, 1000);
  }, []);

  // Check timed mode completion (only for pure timed + words mode)
  useEffect(() => {
    if (config.mode === "timed" && config.contentType === "words" && status === "typing" && timeElapsed >= config.duration) {
      finishTest();
    }
  }, [config, status, timeElapsed, finishTest]);

  // Safety net: detect finish using rendered state (catches stale-closure misses in handleCharacter)
  useEffect(() => {
    if (status !== "typing" || config.contentType === "zen") return;
    const totalWordCount = isWordcountBehavior
      ? words.length
      : config.mode === "wordcount" ? config.duration : Infinity;
    if (totalWordCount === Infinity || words.length === 0) return;
    const lastWord = words[totalWordCount - 1];
    if (!lastWord) return;
    if (
      currentWordIndex >= totalWordCount - 1 &&
      currentCharIndex >= lastWord.chars.length &&
      lastWord.chars.every((c) => c.status === "correct")
    ) {
      finishTest();
    }
  }, [words, currentWordIndex, currentCharIndex, status, config, isWordcountBehavior, finishTest]);

  const restart = useCallback(() => {
    stopTimer();
    let newWords: WordState[];
    if (external?.externalWords) {
      newWords = createWordStates(external.externalWords);
    } else if (external?.externalSeed != null || external?.externalWordCount != null) {
      const seed = external?.externalSeed ?? undefined;
      const count = external?.externalWordCount ?? WORD_POOL_SIZE;
      const wordStrings = generateFromPool(count, seed);
      newWords = createWordStates(wordStrings);
    } else {
      const wordStrings = generateSoloWords(config);
      newWords = createWordStates(wordStrings);
    }
    setWords(newWords);
    setCurrentWordIndex(0);
    setCurrentCharIndex(0);
    setStatus("idle");
    setTimeElapsed(0);
    setStats(null);
    correctCharsRef.current = 0;
    incorrectCharsRef.current = 0;
    extraCharsRef.current = 0;
    misstypedCharsRef.current = 0;
    totalCharsRef.current = 0;
    keyStatsRef.current = new Map();
    wpmHistoryRef.current = [];
    bigramStatsRef.current = new Map();
    prevTypedCharRef.current = null;
    finishedRef.current = false;
    zenBatchRef.current = 0;
    replaySnapshotsRef.current = [];
  }, [stopTimer, config]);

  // Reset when config changes
  useEffect(() => {
    restart();
  }, [config]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCharacter = useCallback(
    (char: string) => {
      const word = words[currentWordIndex];
      if (!word || currentCharIndex >= word.chars.length) return;

      const isCorrect = char === word.chars[currentCharIndex].expected;

      setWords((prev) => {
        const newWords = [...prev];
        const newWord = {
          chars: [...prev[currentWordIndex].chars],
          extraChars: [],
        };
        newWord.chars[currentCharIndex] = {
          expected: word.chars[currentCharIndex].expected,
          actual: char,
          status: isCorrect ? "correct" as const : "incorrect" as const,
        };
        newWords[currentWordIndex] = newWord;
        return newWords;
      });

      if (isCorrect) {
        correctCharsRef.current++;
      } else {
        incorrectCharsRef.current++;
        misstypedCharsRef.current++;
      }
      totalCharsRef.current++;

      // Track per-key accuracy
      const expectedKey = word.chars[currentCharIndex].expected.toLowerCase();
      const existing = keyStatsRef.current.get(expectedKey) ?? { correct: 0, total: 0 };
      keyStatsRef.current.set(expectedKey, {
        correct: existing.correct + (isCorrect ? 1 : 0),
        total: existing.total + 1,
      });

      // Track bigram accuracy (previous char + current char)
      if (prevTypedCharRef.current !== null) {
        const bigram = (prevTypedCharRef.current + expectedKey).toLowerCase();
        const bg = bigramStatsRef.current.get(bigram) ?? { correct: 0, total: 0 };
        bigramStatsRef.current.set(bigram, {
          correct: bg.correct + (isCorrect ? 1 : 0),
          total: bg.total + 1,
        });
      }
      prevTypedCharRef.current = expectedKey;

      setCurrentCharIndex((prev) => prev + 1);

      // Capture replay snapshot
      if (startTimeRef.current > 0) {
        replaySnapshotsRef.current.push({
          t: Math.round(performance.now() - startTimeRef.current),
          w: currentWordIndex,
          c: currentCharIndex + 1,
        });
      }

      // Zen mode: never auto-finish; generate more words when running low
      if (config.contentType === "zen") return;

      // Auto-finish: last char of last word, only if all chars correct
      // For wordcount-behavior modes (wordcount, quotes, marathon, sprint), finish when all words typed
      const totalWordCount = isWordcountBehavior
        ? words.length
        : config.mode === "wordcount" ? config.duration : Infinity;
      if (
        isCorrect &&
        currentCharIndex + 1 >= word.chars.length &&
        currentWordIndex + 1 >= totalWordCount &&
        !word.chars.some((c, idx) => idx < currentCharIndex && c.status === "incorrect")
      ) {
        finishTest();
      }
    },
    [words, currentWordIndex, currentCharIndex, config, finishTest]
  );

  const handleBackspace = useCallback(() => {
    if (currentCharIndex === 0) return; // No cross-word backspace

    const prevIdx = currentCharIndex - 1;
    const word = words[currentWordIndex];
    if (!word) return;

    const wasCorrect = word.chars[prevIdx].status === "correct";

    setWords((prev) => {
      const w = prev[currentWordIndex];
      if (!w) return prev;

      const newWords = [...prev];
      const newWord = {
        chars: [...w.chars],
        extraChars: [],
      };
      newWord.chars[prevIdx] = {
        expected: w.chars[prevIdx].expected,
        actual: null,
        status: "idle" as const,
      };
      newWords[currentWordIndex] = newWord;
      return newWords;
    });

    if (wasCorrect) {
      correctCharsRef.current--;
    } else {
      incorrectCharsRef.current--;
    }
    totalCharsRef.current--;
    setCurrentCharIndex((prev) => prev - 1);
  }, [words, currentWordIndex, currentCharIndex]);

  const handleWordDelete = useCallback(() => {
    if (currentCharIndex === 0) return;

    const word = words[currentWordIndex];
    if (!word) return;

    // Adjust stats counters for each char being deleted
    for (let i = currentCharIndex - 1; i >= 0; i--) {
      if (word.chars[i].status === "correct") {
        correctCharsRef.current--;
      } else if (word.chars[i].status === "incorrect") {
        incorrectCharsRef.current--;
      }
    }
    totalCharsRef.current -= currentCharIndex;

    // Reset all chars in the current word to idle
    setWords((prev) => {
      const w = prev[currentWordIndex];
      if (!w) return prev;

      const newWords = [...prev];
      const newChars = w.chars.map((ch) => ({
        expected: ch.expected,
        actual: null,
        status: "idle" as const,
      }));
      newWords[currentWordIndex] = { chars: newChars, extraChars: [] };
      return newWords;
    });

    setCurrentCharIndex(0);
  }, [words, currentWordIndex, currentCharIndex]);

  const handleSpace = useCallback(() => {
    // Only allow space when the current word is fully and correctly typed
    const word = words[currentWordIndex];
    if (!word || currentCharIndex < word.chars.length) return;
    if (word.chars.some((c) => c.status !== "correct")) {
      return;
    }

    // Reset bigram tracking at word boundary (space breaks the bigram)
    prevTypedCharRef.current = null;

    // Count the space keystroke
    correctCharsRef.current++;
    totalCharsRef.current++;

    const nextWordIndex = currentWordIndex + 1;

    // Zen mode: generate more words when running low, never auto-finish
    if (config.contentType === "zen" && nextWordIndex > words.length - 30) {
      zenBatchRef.current++;
      const pool = wordPoolByDifficulty[config.difficulty ?? "easy"];
      const newBatch = generateWords(pool, 200, (Date.now() + zenBatchRef.current * 7919));
      const newWordStates = newBatch.map((w) => ({
        chars: w.split("").map((ch) => ({
          expected: ch,
          actual: null,
          status: "idle" as const,
        })),
        extraChars: [] as CharState[],
      }));
      setWords((prev) => [...prev, ...newWordStates]);
    }

    // Zen mode never auto-finishes
    if (config.contentType === "zen") {
      setCurrentWordIndex(nextWordIndex);
      setCurrentCharIndex(0);
      return;
    }

    // Last word auto-finishes via handleCharacter, but keep as safety net
    const totalWordCount = isWordcountBehavior
      ? words.length
      : config.mode === "wordcount" ? config.duration : Infinity;
    if (nextWordIndex >= totalWordCount) {
      finishTest();
      return;
    }

    setCurrentWordIndex(nextWordIndex);
    setCurrentCharIndex(0);
  }, [words, currentWordIndex, currentCharIndex, config, finishTest]);

  // Stop zen mode manually
  const stopZen = useCallback(() => {
    if (config.contentType === "zen" && status === "typing") {
      finishTest();
    }
  }, [config.contentType, status, finishTest]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent | KeyboardEvent) => {
      if (status === "finished") return;

      const isCodeMode = config.contentType === "code";

      // Tab handling: in code mode, Tab types indent spaces; otherwise Tab+Enter = restart
      if (e.key === "Tab") {
        e.preventDefault();
        if (isCodeMode) {
          // In code mode, Tab auto-advances through the current word if it's all spaces (indent token)
          const word = words[currentWordIndex];
          if (word && word.chars.every(c => c.expected === " ")) {
            // Atomically mark all remaining chars correct and advance to next word
            const remaining = word.chars.length - currentCharIndex;
            correctCharsRef.current += remaining;
            totalCharsRef.current += remaining;
            setWords(prev => {
              const newWords = [...prev];
              newWords[currentWordIndex] = {
                chars: prev[currentWordIndex].chars.map((c, ci) =>
                  ci >= currentCharIndex ? { ...c, actual: c.expected, status: "correct" as const } : c
                ),
                extraChars: [],
              };
              return newWords;
            });
            const nextWord = currentWordIndex + 1;
            if (nextWord >= words.length) {
              finishTest();
            } else {
              setCurrentWordIndex(nextWord);
              setCurrentCharIndex(0);
            }
            return;
          }
          // Not an indent token — fall through to Tab+Enter restart
        }
        tabPressedRef.current = true;
        return;
      }

      if (e.key === "Enter") {
        if (tabPressedRef.current) {
          e.preventDefault();
          tabPressedRef.current = false;
          restart();
          return;
        }
        // In code mode, Enter advances past \n tokens
        if (isCodeMode) {
          e.preventDefault();
          const word = words[currentWordIndex];
          if (!word) return;

          const wordText = word.chars.map((c) => c.expected).join("");
          const isNewlineToken = wordText === "\\n";
          const isWordFullyTyped =
            currentCharIndex >= word.chars.length &&
            !word.chars.some((c) => c.status !== "correct");

          if (isNewlineToken) {
            // Already on a \n token — mark remaining chars correct and advance
            const remaining = word.chars.length - currentCharIndex;
            correctCharsRef.current += remaining;
            totalCharsRef.current += remaining;
            setWords((prev) => {
              const newWords = [...prev];
              newWords[currentWordIndex] = {
                chars: prev[currentWordIndex].chars.map((c, ci) =>
                  ci >= currentCharIndex ? { ...c, actual: c.expected, status: "correct" as const } : c
                ),
                extraChars: [],
              };
              return newWords;
            });
            const next = currentWordIndex + 1;
            if (next >= words.length) finishTest();
            else { setCurrentWordIndex(next); setCurrentCharIndex(0); }
          } else if (isWordFullyTyped) {
            // At end of a fully-typed regular token — advance past it and skip the subsequent \n token
            prevTypedCharRef.current = null;
            correctCharsRef.current++; // count the separator keystroke
            totalCharsRef.current++;

            let next = currentWordIndex + 1;
            if (next < words.length) {
              const nextText = words[next].chars.map((c) => c.expected).join("");
              if (nextText === "\\n") {
                // Mark the \n token as correct and skip over it
                correctCharsRef.current += words[next].chars.length;
                totalCharsRef.current += words[next].chars.length;
                const skipIdx = next;
                setWords((prev) => {
                  const newWords = [...prev];
                  newWords[skipIdx] = {
                    chars: prev[skipIdx].chars.map((c) => ({ ...c, actual: c.expected, status: "correct" as const })),
                    extraChars: [],
                  };
                  return newWords;
                });
                next = next + 1;
              }
            }
            if (next >= words.length) finishTest();
            else { setCurrentWordIndex(next); setCurrentCharIndex(0); }
          }
          return;
        }
      }

      // Any other key clears the tab flag
      tabPressedRef.current = false;

      // Escape = restart (always works)
      if (e.key === "Escape") {
        e.preventDefault();
        // In zen mode, Escape stops the test instead of restarting
        if (config.contentType === "zen" && status === "typing") {
          finishTest();
          return;
        }
        restart();
        return;
      }

      // Allow word-delete shortcuts through (Option+Backspace / Ctrl+Backspace)
      if ((e.altKey || e.ctrlKey) && e.key === "Backspace") {
        e.preventDefault();
        handleWordDelete();
        return;
      }

      // Ignore modifier combos (except Shift)
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      // Start typing on first valid input
      if (status === "idle" && e.key.length === 1) {
        setStatus("typing");
        // Only start the timer if it hasn't been pre-started (e.g. by startRaceTimer)
        if (!timerRef.current) {
          startTimer();
        }
      }

      if (status === "idle" && e.key !== "Backspace" && e.key.length !== 1) return;

      if (e.key === "Backspace") {
        e.preventDefault();
        handleBackspace();
      } else if (e.key === " ") {
        e.preventDefault();
        handleSpace();
      } else if (e.key.length === 1) {
        handleCharacter(e.key);
      }
    },
    [status, config, words, currentWordIndex, currentCharIndex, restart, startTimer, finishTest, handleBackspace, handleWordDelete, handleSpace, handleCharacter]
  );

  // Attach keydown handler to window for this hook's consumer to use
  const keyDownRef = useRef(handleKeyDown);
  keyDownRef.current = handleKeyDown;

  const startRaceTimer = useCallback(() => {
    if (!timerRef.current) {
      startTimer();
    }
  }, [startTimer]);

  return {
    words,
    currentWordIndex,
    currentCharIndex,
    status,
    timeLeft,
    timeElapsed,
    config,
    liveWpm,
    stats,
    setConfig,
    restart,
    stopZen,
    replaySnapshots: replaySnapshotsRef,
    handleKeyDown: (e: React.KeyboardEvent) => keyDownRef.current(e),
    startRaceTimer,
  };
}
