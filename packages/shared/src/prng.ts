import { commonWords } from "./words";

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
