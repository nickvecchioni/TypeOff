import type { TextDifficultyInfo } from "./types";

/**
 * English bigram frequency table (top ~100 bigrams, normalized 0-1).
 * Higher values = more common. Used to score text difficulty.
 */
const BIGRAM_FREQ: Record<string, number> = {
  th: 1.0,  he: 0.95, in: 0.90, er: 0.88, an: 0.85,
  re: 0.83, on: 0.80, at: 0.78, en: 0.76, nd: 0.74,
  ti: 0.72, es: 0.70, or: 0.68, te: 0.66, of: 0.64,
  ed: 0.62, is: 0.60, it: 0.58, al: 0.56, ar: 0.54,
  st: 0.52, to: 0.50, nt: 0.48, ng: 0.46, se: 0.44,
  ha: 0.42, as: 0.40, ou: 0.38, io: 0.36, le: 0.34,
  ve: 0.32, co: 0.30, me: 0.28, de: 0.26, hi: 0.24,
  ri: 0.22, ro: 0.20, ic: 0.18, ne: 0.16, ea: 0.14,
  ra: 0.12, ce: 0.10, li: 0.09, ch: 0.08, ll: 0.07,
  be: 0.06, ma: 0.06, si: 0.05, om: 0.05, ur: 0.05,
  ca: 0.04, el: 0.04, ta: 0.04, la: 0.04, ns: 0.04,
  ge: 0.03, ly: 0.03, di: 0.03, us: 0.03, ct: 0.03,
  fo: 0.03, pe: 0.03, wi: 0.03, lo: 0.03, no: 0.03,
  il: 0.02, ho: 0.02, wa: 0.02, ad: 0.02, fi: 0.02,
  tr: 0.02, so: 0.02, wh: 0.02, sh: 0.02, ac: 0.02,
  ut: 0.02, su: 0.02, nc: 0.02, we: 0.02, do: 0.02,
  ow: 0.01, id: 0.01, em: 0.01, mo: 0.01, ag: 0.01,
  ab: 0.01, po: 0.01, un: 0.01, iv: 0.01, am: 0.01,
  pl: 0.01, ig: 0.01, pa: 0.01, ol: 0.01, ot: 0.01,
  pr: 0.01, up: 0.01, ay: 0.01, ke: 0.01, op: 0.01,
};

/**
 * Score how difficult a text is to type based on bigram rarity,
 * word length, and special character density.
 */
export function scoreTextDifficulty(words: string[]): TextDifficultyInfo {
  if (words.length === 0) {
    return { score: 0, bigramRarity: 0, avgWordLength: 0, specialCharDensity: 0 };
  }

  const text = words.join(" ").toLowerCase();
  let totalBigrams = 0;
  let raritySum = 0;

  for (let i = 0; i < text.length - 1; i++) {
    const bigram = text[i] + text[i + 1];
    if (/^[a-z]{2}$/.test(bigram)) {
      totalBigrams++;
      const freq = BIGRAM_FREQ[bigram] ?? 0;
      raritySum += 1 - freq; // rarer bigrams score higher
    }
  }

  const bigramRarity = totalBigrams > 0 ? raritySum / totalBigrams : 0.5;
  const avgWordLength = words.reduce((s, w) => s + w.length, 0) / words.length;
  const specialChars = text.replace(/[a-z0-9 ]/g, "").length;
  const specialCharDensity = text.length > 0 ? specialChars / text.length : 0;

  // Weighted composite score (0-1)
  const lengthFactor = Math.min(1, (avgWordLength - 3) / 7); // 3-char=0, 10-char=1
  const score = Math.min(1, bigramRarity * 0.5 + lengthFactor * 0.3 + specialCharDensity * 0.2);

  return {
    score: Math.round(score * 1000) / 1000,
    bigramRarity: Math.round(bigramRarity * 1000) / 1000,
    avgWordLength: Math.round(avgWordLength * 100) / 100,
    specialCharDensity: Math.round(specialCharDensity * 1000) / 1000,
  };
}

/**
 * Calculate Performance Points for a single score.
 * PP = 500 * (wpm/200)^2 * diffMultiplier * accuracyPenalty
 */
export function calculatePP(wpm: number, accuracy: number, difficulty: number): number {
  if (wpm <= 0 || accuracy <= 0) return 0;

  const basePP = 500 * Math.pow(wpm / 200, 2);
  const diffMultiplier = 0.8 + difficulty * 0.4; // 0.8 at diff=0, 1.2 at diff=1
  const accuracyPenalty = Math.pow(accuracy / 100, 3); // harsh penalty below 100%

  return Math.round(basePP * diffMultiplier * accuracyPenalty * 100) / 100;
}

/**
 * Calculate total PP from a list of individual PP scores.
 * Uses osu!-style weighting: sum of top 50 scores weighted by 0.95^(n-1).
 */
export function calculateTotalPP(ppScores: number[]): number {
  const sorted = [...ppScores].sort((a, b) => b - a).slice(0, 50);
  let total = 0;
  for (let i = 0; i < sorted.length; i++) {
    total += sorted[i] * Math.pow(0.95, i);
  }
  return Math.round(total * 100) / 100;
}

/** Get bigram frequency (exported for analytics) */
export function getBigramFrequency(bigram: string): number {
  return BIGRAM_FREQ[bigram.toLowerCase()] ?? 0;
}
