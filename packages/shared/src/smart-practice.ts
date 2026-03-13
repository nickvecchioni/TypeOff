import { getBigramFrequency } from "./difficulty";

export interface WeaknessItem {
  type: "key" | "bigram";
  value: string;
  accuracy: number;
  frequency: number;
  impact: number;
}

/**
 * Rank a user's weakest keys and bigrams by estimated impact on WPM.
 * Impact = frequency × (1 - accuracy). Higher impact = more WPM cost.
 */
export function rankWeaknesses(
  keys: { key: string; accuracy: number; total: number }[],
  bigrams: { bigram: string; accuracy: number; total: number }[],
): WeaknessItem[] {
  const items: WeaknessItem[] = [];

  // For keys: estimate frequency from sum of bigram freqs containing that key
  for (const k of keys) {
    if (k.total < 10) continue;
    // Rough frequency estimate: average of all bigrams containing this key
    const lower = k.key.toLowerCase();
    let freqSum = 0;
    let freqCount = 0;
    const alphabet = "abcdefghijklmnopqrstuvwxyz";
    for (const c of alphabet) {
      const f1 = getBigramFrequency(lower + c);
      const f2 = getBigramFrequency(c + lower);
      if (f1 > 0) { freqSum += f1; freqCount++; }
      if (f2 > 0) { freqSum += f2; freqCount++; }
    }
    const frequency = freqCount > 0 ? freqSum / freqCount : 0.02;
    items.push({
      type: "key",
      value: k.key,
      accuracy: k.accuracy,
      frequency,
      impact: frequency * (1 - k.accuracy),
    });
  }

  for (const b of bigrams) {
    if (b.total < 10) continue;
    const frequency = getBigramFrequency(b.bigram) || 0.005;
    items.push({
      type: "bigram",
      value: b.bigram,
      accuracy: b.accuracy,
      frequency,
      impact: frequency * (1 - b.accuracy),
    });
  }

  items.sort((a, b) => b.impact - a.impact);
  return items;
}

export interface WpmInsight extends WeaknessItem {
  estimatedWpmCost: number;
  insight: string;
}

/**
 * Estimate the WPM cost of each weakness and produce human-readable insights.
 *
 * Model: each error costs ~0.5s (backspace + retype). At a given WPM, that
 * translates to a fraction of typing time lost per occurrence.
 */
export function estimateWpmImpact(
  avgWpm: number,
  weaknesses: WeaknessItem[],
): WpmInsight[] {
  if (avgWpm <= 0) return [];

  // Characters per second at this WPM (5 chars/word standard)
  const cps = (avgWpm * 5) / 60;
  // Correction penalty: ~0.5s per error
  const correctionTime = 0.5;

  return weaknesses.map((w) => {
    // Estimated errors per 1000 chars
    const errorRate = 1 - w.accuracy;
    // How many times this key/bigram appears per 1000 chars (frequency is 0-1 scale)
    const occurrencesPer1000 = w.frequency * 1000;
    // Total correction time per 1000 chars
    const timeLostPer1000 = errorRate * occurrencesPer1000 * correctionTime;
    // WPM cost: (time lost / normal time for 1000 chars) * avgWpm
    const normalTimePer1000 = 1000 / cps;
    const estimatedWpmCost = Math.round((timeLostPer1000 / normalTimePer1000) * avgWpm * 10) / 10;

    const accPct = Math.round(w.accuracy * 100);
    let insight: string;
    if (w.type === "bigram") {
      insight = `Your '${w.value}' bigram (${accPct}% accuracy) appears frequently and is costing you roughly ~${Math.max(1, Math.round(estimatedWpmCost))} WPM`;
    } else {
      const examples = getKeyExamples(w.value);
      insight = `Your '${w.value}' key (${accPct}% accuracy)${examples ? `. Focus on words like ${examples}` : ""}`;
    }

    return { ...w, estimatedWpmCost, insight };
  });
}

function getKeyExamples(key: string): string {
  const examples: Record<string, string> = {
    j: "'just', 'major', 'enjoy'",
    k: "'know', 'like', 'keep'",
    q: "'quick', 'quite', 'queen'",
    z: "'zero', 'zone', 'size'",
    x: "'next', 'text', 'extra'",
    v: "'very', 'have', 'give'",
    b: "'been', 'but', 'about'",
    p: "'put', 'part', 'people'",
    y: "'you', 'your', 'year'",
    w: "'with', 'will', 'would'",
  };
  return examples[key.toLowerCase()] ?? "";
}
