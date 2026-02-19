import { commonWords } from "./words";
import { getQuoteWords } from "./quotes";
import type { RaceMode } from "./race-types";

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
