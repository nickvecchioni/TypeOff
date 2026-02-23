import { commonWords, wordPoolByDifficulty } from "./words";
import { tokenizeCode, getCodeSnippet } from "./code-snippets";

/** Combined pool from all difficulty levels for "difficult" mode */
const allDifficultyPool = [
  ...wordPoolByDifficulty.easy,
  ...wordPoolByDifficulty.medium,
  ...wordPoolByDifficulty.hard,
];
import { getQuoteWords } from "./quotes";
import type { RaceMode } from "./race-types";
import type { TestConfig } from "./types";

/** Mulberry32 seeded PRNG — fast, deterministic, good distribution */
export function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Generate `count` random words from `pool` using optional seed */
export function generateWords(
  pool: string[],
  count: number,
  seed?: number
): string[] {
  const rng = mulberry32(seed ?? Date.now());
  const words: string[] = [];
  let prev = -1;
  for (let i = 0; i < count; i++) {
    let idx: number;
    // Avoid consecutive duplicates
    do {
      idx = Math.floor(rng() * pool.length);
    } while (idx === prev && pool.length > 1);
    prev = idx;
    words.push(pool[idx]);
  }
  return words;
}

/** Generate words from the common word pool */
export function generateFromPool(
  count: number,
  seed?: number
): string[] {
  return generateWords(commonWords, count, seed);
}

/** Characters per line at max-w-4xl (896px) with text-2xl JetBrains Mono (1ch = 14.4px) */
export const LINE_WIDTH_CH = 62;

/** Number of lines the race text should fill */
export const TARGET_LINES = 3;

/** Line counts for marathon and sprint modes */
export const MARATHON_LINES = 4;
export const SPRINT_LINES = 1;

/**
 * Generate words that fill exactly `numLines` lines of `lineWidthCh` characters.
 * Uses the same PRNG + consecutive-duplicate avoidance as `generateWords`.
 * Simulates CSS inline-block wrapping: each word occupies `word.length + 1` ch
 * (the +1 accounts for the 1ch right margin in WordDisplay).
 */
export function generateWordsForLines(
  pool: string[],
  lineWidthCh: number,
  numLines: number,
  seed?: number
): string[] {
  const rng = mulberry32(seed ?? Date.now());
  const words: string[] = [];
  let prev = -1;
  let lineUsed = 0; // ch used on current line
  let line = 1;

  while (true) {
    let idx: number;
    do {
      idx = Math.floor(rng() * pool.length);
    } while (idx === prev && pool.length > 1);

    const word = pool[idx];
    const wordCh = word.length + 1; // word + 1ch margin

    // Would this word fit on the current line?
    if (lineUsed + wordCh > lineWidthCh && lineUsed > 0) {
      // Word wraps to next line
      line++;
      if (line > numLines) break; // would start a line beyond our target
      lineUsed = wordCh;
    } else {
      lineUsed += wordCh;
    }

    prev = idx;
    words.push(word);
  }

  return words;
}

/** Generate words from the common pool that fill exactly `numLines` lines */
export function generateFromPoolForLines(
  lineWidthCh: number,
  numLines: number,
  seed?: number
): string[] {
  return generateWordsForLines(commonWords, lineWidthCh, numLines, seed);
}

/**
 * Generate words mixed with number sequences for "numbers" mode.
 * ~20% of tokens are random digit strings (1-4 digits).
 */
function generateNumbersModeWords(
  lineWidthCh: number,
  numLines: number,
  seed: number
): string[] {
  const rng = mulberry32(seed);
  const words: string[] = [];
  let prev = -1;
  let lineUsed = 0;
  let line = 1;

  while (true) {
    let word: string;

    if (rng() < 0.2) {
      const digits = 1 + Math.floor(rng() * 4);
      word = "";
      for (let d = 0; d < digits; d++) {
        word += Math.floor(rng() * 10).toString();
      }
    } else {
      let idx: number;
      do {
        idx = Math.floor(rng() * commonWords.length);
      } while (idx === prev && commonWords.length > 1);
      prev = idx;
      word = commonWords[idx];
    }

    const wordCh = word.length + 1;
    if (lineUsed + wordCh > lineWidthCh && lineUsed > 0) {
      line++;
      if (line > numLines) break;
      lineUsed = wordCh;
    } else {
      lineUsed += wordCh;
    }

    words.push(word);
  }

  return words;
}

/** Generate words for a given race mode.
 *  For quotes mode, seed is the quote index.
 *  For other modes, seed is the PRNG seed. */
export function generateWordsForMode(mode: RaceMode, seed: number): string[] {
  switch (mode) {
    case "standard":
      return generateFromPoolForLines(LINE_WIDTH_CH, TARGET_LINES, seed);
    case "marathon":
      return generateFromPoolForLines(LINE_WIDTH_CH, MARATHON_LINES, seed);
    case "sprint":
      return generateFromPoolForLines(LINE_WIDTH_CH, SPRINT_LINES, seed);
    case "quotes":
      return getQuoteWords(seed);
    case "punctuation":
      return applyPunctuation(
        generateFromPoolForLines(LINE_WIDTH_CH, TARGET_LINES, seed),
        seed + 1
      );
    case "numbers":
      return generateNumbersModeWords(LINE_WIDTH_CH, TARGET_LINES, seed);
    case "difficult":
      return generateWordsForLines(allDifficultyPool, LINE_WIDTH_CH, TARGET_LINES, seed);
    case "code":
      return tokenizeCode(getCodeSnippet(seed).code);
    case "special": {
      const base = applyPunctuation(
        generateNumbersModeWords(LINE_WIDTH_CH, TARGET_LINES, seed),
        seed + 1
      );
      return applyRandomCaps(base, 0.25, seed + 2);
    }
  }
}

/**
 * Randomly replace ~20% of word tokens with short number strings (1–4 digits).
 * Used to give solo "mixed" mode the same character as the race "special" mode.
 */
function applyMixedNumbers(words: string[], seed: number): string[] {
  const rng = mulberry32(seed);
  return words.map((w) => {
    if (rng() < 0.2) {
      const digits = 1 + Math.floor(rng() * 4);
      let n = "";
      for (let i = 0; i < digits; i++) n += Math.floor(rng() * 10);
      return n;
    }
    return w;
  });
}

/**
 * Randomly capitalize ~`rate` fraction of word tokens (skips numbers and
 * words already capitalized by applyPunctuation).
 */
function applyRandomCaps(words: string[], rate: number, seed: number): string[] {
  const rng = mulberry32(seed);
  return words.map((w) => {
    const first = w.charAt(0);
    // Skip tokens that start with a digit or are already uppercased
    if (!first || first >= "0" && first <= "9" || first === first.toUpperCase()) return w;
    return rng() < rate ? first.toUpperCase() + w.slice(1) : w;
  });
}

/**
 * Deterministic punctuation transform.
 * Capitalizes first word, adds periods every 6-10 words,
 * ~12% commas, occasional ? and !.
 */
export function applyPunctuation(words: string[], seed?: number): string[] {
  if (words.length === 0) return words;
  const rng = mulberry32(seed ?? Date.now());
  const result = [...words];

  // Capitalize first word
  result[0] = result[0].charAt(0).toUpperCase() + result[0].slice(1);

  let sinceLastPeriod = 0;
  // Random sentence length 6-10 words
  let nextPeriodAt = 6 + Math.floor(rng() * 5);

  for (let i = 0; i < result.length; i++) {
    sinceLastPeriod++;

    if (i === result.length - 1) {
      // Last word always gets a period
      result[i] = result[i] + ".";
      break;
    }

    if (sinceLastPeriod >= nextPeriodAt) {
      // End of sentence
      const r = rng();
      const mark = r < 0.1 ? "?" : r < 0.2 ? "!" : ".";
      result[i] = result[i] + mark;
      // Capitalize next word
      if (i + 1 < result.length) {
        result[i + 1] = result[i + 1].charAt(0).toUpperCase() + result[i + 1].slice(1);
      }
      sinceLastPeriod = 0;
      nextPeriodAt = 6 + Math.floor(rng() * 5);
    } else if (sinceLastPeriod > 2 && rng() < 0.12) {
      // ~12% chance of comma (not at start of sentence)
      result[i] = result[i] + ",";
    }
  }

  return result;
}

/**
 * Generate words biased toward keys in `weakKeys`.
 * Words containing more weak keys get proportionally more draw weight.
 * Falls back to normal generation if no weak keys are provided.
 */
export function generatePracticeWords(
  pool: string[],
  count: number,
  weakKeys: string[],
  seed?: number
): string[] {
  if (weakKeys.length === 0) return generateWords(pool, count, seed);

  const weakSet = new Set(weakKeys.map(k => k.toLowerCase()));
  const scored = pool.map(word => {
    const hits = word.split("").filter(ch => weakSet.has(ch)).length;
    return { word, weight: 1 + hits * 2 };
  });

  const totalWeight = scored.reduce((s, e) => s + e.weight, 0);
  const rng = mulberry32(seed ?? Date.now());
  const words: string[] = [];
  let prevWord = "";

  for (let i = 0; i < count; i++) {
    let target = rng() * totalWeight;
    let chosen = scored[scored.length - 1].word;
    for (const entry of scored) {
      target -= entry.weight;
      if (target <= 0) { chosen = entry.word; break; }
    }
    if (chosen === prevWord && scored.length > 1) {
      target = rng() * totalWeight;
      for (const entry of scored) {
        if (entry.word === chosen) continue;
        target -= entry.weight;
        if (target <= 0) { chosen = entry.word; break; }
      }
    }
    prevWord = chosen;
    words.push(chosen);
  }

  return words;
}

/**
 * Unified word generator for solo mode.
 * Dispatches based on contentType, applies punctuation if enabled.
 */
export function generateSoloWords(config: TestConfig, seed?: number): string[] {
  const s = seed ?? Date.now();
  const pool = wordPoolByDifficulty[config.difficulty ?? "easy"];
  let words: string[];

  switch (config.contentType ?? "words") {
    case "words": {
      const count = config.mode === "wordcount" ? config.duration : 200;
      words = generateWords(pool, count, s);
      break;
    }
    case "quotes": {
      // For quotes, seed selects the quote index
      words = getQuoteWords(s);
      break;
    }
    case "marathon": {
      words = generateWordsForLines(pool, LINE_WIDTH_CH, MARATHON_LINES, s);
      break;
    }
    case "sprint": {
      words = generateWordsForLines(pool, LINE_WIDTH_CH, SPRINT_LINES, s);
      break;
    }
    case "custom":
      if (config.customText) {
        words = config.customText.trim().split(/\s+/).filter(Boolean);
      } else {
        words = generateWords(pool, 200, s);
      }
      break;
    case "practice": {
      const count = config.mode === "wordcount" ? config.duration : 200;
      const weakKeys = config.weakKeys ?? [];
      const weakBigrams = config.weakBigrams ?? [];
      if (weakBigrams.length > 0) {
        words = generatePracticeWordsWithBigrams(pool, count, weakBigrams, s);
      } else {
        words = generatePracticeWords(pool, count, weakKeys, s);
      }
      break;
    }
    case "code": {
      const snippet = getCodeSnippet(s, config.codeLanguage);
      words = tokenizeCode(snippet.code);
      break;
    }
    case "zen": {
      // Generate a large initial batch for zen (infinite) mode
      words = generateWords(pool, 500, s);
      break;
    }
    default:
      words = generateWords(pool, 200, s);
  }

  // Apply mixed mode (numbers + punctuation + caps) when enabled; skip for quotes/code/zen
  if (config.punctuation && config.contentType !== "quotes" && config.contentType !== "code" && config.contentType !== "zen") {
    words = applyMixedNumbers(words, s + 3);
    words = applyPunctuation(words, s + 1);
    words = applyRandomCaps(words, 0.25, s + 2);
  }

  return words;
}


/**
 * Generate words biased toward words containing specified weak bigrams.
 * Words containing more weak bigrams get proportionally more draw weight.
 */
export function generatePracticeWordsWithBigrams(
  pool: string[],
  count: number,
  weakBigrams: string[],
  seed?: number
): string[] {
  if (weakBigrams.length === 0) return generateWords(pool, count, seed);

  const bigramSet = new Set(weakBigrams.map(b => b.toLowerCase()));
  const scored = pool.map(word => {
    const lower = word.toLowerCase();
    let hits = 0;
    for (let i = 0; i < lower.length - 1; i++) {
      if (bigramSet.has(lower[i] + lower[i + 1])) hits++;
    }
    return { word, weight: 1 + hits * 3 };
  });

  const totalWeight = scored.reduce((s, e) => s + e.weight, 0);
  const rng = mulberry32(seed ?? Date.now());
  const words: string[] = [];
  let prevWord = "";

  for (let i = 0; i < count; i++) {
    let target = rng() * totalWeight;
    let chosen = scored[scored.length - 1].word;
    for (const entry of scored) {
      target -= entry.weight;
      if (target <= 0) { chosen = entry.word; break; }
    }
    if (chosen === prevWord && scored.length > 1) {
      target = rng() * totalWeight;
      for (const entry of scored) {
        if (entry.word === chosen) continue;
        target -= entry.weight;
        if (target <= 0) { chosen = entry.word; break; }
      }
    }
    prevWord = chosen;
    words.push(chosen);
  }

  return words;
}
