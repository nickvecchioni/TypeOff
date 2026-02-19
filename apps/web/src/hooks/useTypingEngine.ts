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
  generateFromPool,
} from "@typeoff/shared";

const DEFAULT_CONFIG: TestConfig = { mode: "timed", duration: 15 };
const WORD_POOL_SIZE = 200;

export interface TypingEngine extends EngineAPI {
  handleKeyDown: (e: React.KeyboardEvent) => void;
}

export interface ExternalConfig {
  externalSeed?: number;
  externalWordCount?: number;
  externalWords?: string[]; // pre-built word list (e.g. quotes mode)
  mode?: "timed" | "wordcount";
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
    ? { mode: "wordcount", duration: wordCount }
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

  // Generate words on mount (avoids hydration mismatch from Date.now() seed)
  const initialized = useRef(false);
  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      if (external?.externalWords) {
        setWords(createWordStates(external.externalWords));
      } else {
        const seed = external?.externalSeed ?? undefined;
        const count =
          external?.externalWordCount ??
          (config.mode === "wordcount" ? config.duration : WORD_POOL_SIZE);
        const wordStrings = generateFromPool(count, seed);
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

  const finishTest = useCallback(() => {
    stopTimer();
    const elapsed = (performance.now() - startTimeRef.current) / 1000;
    const correct = correctCharsRef.current;
    const incorrect = incorrectCharsRef.current;
    const extra = extraCharsRef.current;
    const mistyped = misstypedCharsRef.current;
    const total = correct + incorrect + extra;
    const wpm = elapsed > 0 ? Math.round(((correct / 5) / (elapsed / 60)) * 100) / 100 : 0;
    const rawWpm = elapsed > 0 ? Math.round(((total / 5) / (elapsed / 60)) * 100) / 100 : 0;
    const totalKeystrokes = correct + mistyped;
    const accuracy = totalKeystrokes > 0 ? Math.round((correct / totalKeystrokes) * 100 * 10) / 10 : 100;

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

  // Check timed mode completion
  useEffect(() => {
    if (config.mode === "timed" && status === "typing" && timeElapsed >= config.duration) {
      finishTest();
    }
  }, [config, status, timeElapsed, finishTest]);

  const restart = useCallback(() => {
    stopTimer();
    let newWords: WordState[];
    if (external?.externalWords) {
      newWords = createWordStates(external.externalWords);
    } else {
      const seed = external?.externalSeed ?? undefined;
      const count =
        external?.externalWordCount ??
        (config.mode === "wordcount" ? config.duration : WORD_POOL_SIZE);
      const wordStrings = generateFromPool(count, seed);
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
    wpmHistoryRef.current = [];
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
      setCurrentCharIndex((prev) => prev + 1);

      // Auto-finish: last char of last word, only if all chars correct
      if (
        isCorrect &&
        currentCharIndex + 1 >= word.chars.length &&
        config.mode === "wordcount" &&
        currentWordIndex + 1 >= config.duration &&
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
    if (word.chars.some((c) => c.status !== "correct")) return;

    // Count the space keystroke
    correctCharsRef.current++;
    totalCharsRef.current++;

    const nextWordIndex = currentWordIndex + 1;

    // Last word auto-finishes via handleCharacter, but keep as safety net
    if (config.mode === "wordcount" && nextWordIndex >= config.duration) {
      finishTest();
      return;
    }

    setCurrentWordIndex(nextWordIndex);
    setCurrentCharIndex(0);
  }, [words, currentWordIndex, currentCharIndex, config, finishTest]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent | KeyboardEvent) => {
      if (status === "finished") return;

      // Tab+Enter = restart (Tab sets flag, Enter triggers)
      if (e.key === "Tab") {
        e.preventDefault();
        tabPressedRef.current = true;
        return;
      }

      if (e.key === "Enter" && tabPressedRef.current) {
        e.preventDefault();
        tabPressedRef.current = false;
        restart();
        return;
      }

      // Any other key clears the tab flag
      tabPressedRef.current = false;

      // Escape = restart
      if (e.key === "Escape") {
        e.preventDefault();
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
        startTimer();
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
    [status, restart, startTimer, handleBackspace, handleWordDelete, handleSpace, handleCharacter]
  );

  // Attach keydown handler to window for this hook's consumer to use
  const keyDownRef = useRef(handleKeyDown);
  keyDownRef.current = handleKeyDown;

  return {
    words,
    currentWordIndex,
    currentCharIndex,
    status,
    timeLeft,
    config,
    liveWpm,
    stats,
    setConfig,
    restart,
    handleKeyDown: (e: React.KeyboardEvent) => keyDownRef.current(e),
  };
}
