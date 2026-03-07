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
      const base = generateFromPoolForLines(LINE_WIDTH_CH, TARGET_LINES, seed);
      const withNumbers = applyMixedNumbers(base, seed + 3);
      return applyPunctuation(withNumbers, seed + 1);
    }
  }
}

/**
 * Sprinkle realistic numbers into word tokens (~8% of words).
 * Produces natural-looking numbers: years, small counts, ages, percentages, etc.
 */
function applyMixedNumbers(words: string[], seed: number): string[] {
  const rng = mulberry32(seed);
  // Templates weighted toward common number patterns in real writing
  const numberTemplates = [
    () => String(1 + Math.floor(rng() * 99)),                         // small: 1-99
    () => String(100 + Math.floor(rng() * 900)),                      // hundreds: 100-999
    () => String(2000 + Math.floor(rng() * 26)),                      // years: 2000-2025
    () => String(1900 + Math.floor(rng() * 100)),                     // years: 1900-1999
    () => String(Math.floor(rng() * 100)) + "%",                     // percentage
    () => "$" + String(1 + Math.floor(rng() * 999)),                  // dollar amount
    () => String(1 + Math.floor(rng() * 12)) + ":" + String(Math.floor(rng() * 6)) + String(Math.floor(rng() * 10)),  // time
    () => "#" + String(1 + Math.floor(rng() * 99)),                   // numbered item
  ];
  return words.map((w) => {
    if (rng() < 0.08) {
      const tmpl = numberTemplates[Math.floor(rng() * numberTemplates.length)];
      return tmpl();
    }
    return w;
  });
}

/**
 * Deterministic sentence-like punctuation transform.
 * Produces natural writing patterns: sentences with varied length,
 * commas, semicolons, colons, dashes, parentheticals, and quotes.
 * Capitals only appear at sentence starts (no random caps).
 */
export function applyPunctuation(words: string[], seed?: number): string[] {
  if (words.length === 0) return words;
  const rng = mulberry32(seed ?? Date.now());
  const result = [...words];

  function capitalize(idx: number) {
    if (idx < result.length) {
      result[idx] = result[idx].charAt(0).toUpperCase() + result[idx].slice(1);
    }
  }

  // Capitalize first word
  capitalize(0);

  let sinceLastPeriod = 0;
  let nextPeriodAt = 4 + Math.floor(rng() * 8); // sentence length 4-11 words
  let inParens = false;

  for (let i = 0; i < result.length; i++) {
    sinceLastPeriod++;

    // Last word always ends with a period
    if (i === result.length - 1) {
      if (inParens) {
        result[i] = result[i] + ").";
        inParens = false;
      } else {
        result[i] = result[i] + ".";
      }
      break;
    }

    if (sinceLastPeriod >= nextPeriodAt) {
      // End of sentence — pick terminal punctuation
      const r = rng();
      let mark: string;
      if (r < 0.08) mark = "?";
      else if (r < 0.14) mark = "!";
      else if (r < 0.18) mark = "...";
      else mark = ".";

      if (inParens) {
        result[i] = result[i] + ")" + mark;
        inParens = false;
      } else {
        result[i] = result[i] + mark;
      }

      capitalize(i + 1);
      sinceLastPeriod = 0;
      nextPeriodAt = 4 + Math.floor(rng() * 8);
    } else if (sinceLastPeriod > 2) {
      // Mid-sentence punctuation (only after 2+ words into the sentence)
      const r = rng();

      if (r < 0.10) {
        // Comma (~10%)
        result[i] = result[i] + ",";
      } else if (r < 0.13) {
        // Semicolon (~3%) — acts as soft sentence break
        result[i] = result[i] + ";";
      } else if (r < 0.155 && sinceLastPeriod > 3) {
        // Colon (~2.5%) — only mid-sentence
        result[i] = result[i] + ":";
      } else if (r < 0.175 && sinceLastPeriod > 3 && !inParens) {
        // Dash (~2%)
        result[i] = result[i] + " -";
      } else if (r < 0.19 && !inParens && i + 3 < result.length && sinceLastPeriod + 3 < nextPeriodAt) {
        // Open parenthetical (~1.5%) — only if room before sentence end
        result[i + 1] = "(" + result[i + 1];
        inParens = true;
      } else if (inParens && rng() < 0.4) {
        // Close parenthetical if we're inside one
        result[i] = result[i] + ")";
        inParens = false;
      }
    }
  }

  return result;
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
      words = generatePracticeCombined(pool, count, weakKeys, weakBigrams, s);
      break;
    }
    case "code": {
      const snippet = getCodeSnippet(s, config.codeLanguage);
      words = tokenizeCode(snippet.code, config.codeIndent ?? "spaces");
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

  // Apply mixed mode (numbers + punctuation) when enabled; skip for quotes/code/zen
  if (config.punctuation && config.contentType !== "quotes" && config.contentType !== "code" && config.contentType !== "zen") {
    words = applyMixedNumbers(words, s + 3);
    words = applyPunctuation(words, s + 1);
  }

  return words;
}


/**
 * Generate words biased toward both weak keys and weak bigrams.
 * Combines both signals: +2 per weak-key hit, +3 per weak-bigram hit.
 * Falls back to normal generation if neither is provided.
 */
export function generatePracticeCombined(
  pool: string[],
  count: number,
  weakKeys: string[],
  weakBigrams: string[],
  seed?: number
): string[] {
  if (weakKeys.length === 0 && weakBigrams.length === 0) return generateWords(pool, count, seed);

  const weakKeySet = new Set(weakKeys.map(k => k.toLowerCase()));
  const bigramSet = new Set(weakBigrams.map(b => b.toLowerCase()));

  const scored = pool.map(word => {
    const lower = word.toLowerCase();
    let weight = 1;
    if (weakKeySet.size > 0) {
      weight += lower.split("").filter(ch => weakKeySet.has(ch)).length * 2;
    }
    if (bigramSet.size > 0) {
      for (let i = 0; i < lower.length - 1; i++) {
        if (bigramSet.has(lower[i] + lower[i + 1])) weight += 3;
      }
    }
    return { word, weight };
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
