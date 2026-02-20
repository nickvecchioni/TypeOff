import { commonWords, wordPoolByDifficulty } from "./words";
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
export const MARATHON_LINES = 6;
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
  }
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
      words = generatePracticeWords(pool, count, config.weakKeys ?? [], s);
      break;
    }
    default:
      words = generateWords(pool, 200, s);
  }

  // Apply punctuation (quotes already have their own)
  if (config.punctuation && config.contentType !== "quotes") {
    words = applyPunctuation(words, s + 1);
  }

  return words;
}
