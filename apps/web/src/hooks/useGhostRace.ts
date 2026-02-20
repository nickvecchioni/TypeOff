"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type { ReplaySnapshot, GhostCursor } from "@typeoff/shared";

function binarySearch(snapshots: ReplaySnapshot[], time: number): number {
  let lo = 0;
  let hi = snapshots.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >>> 1;
    if (snapshots[mid].t <= time) lo = mid + 1;
    else hi = mid - 1;
  }
  return hi;
}

interface UseGhostRaceOptions {
  replayData: ReplaySnapshot[];
  totalWords: number;
  ghostName: string;
  ghostWpm: number;
}

interface UseGhostRaceReturn {
  ghostCursor: GhostCursor;
  startGhost: () => void;
  stopGhost: () => void;
  isRunning: boolean;
}

export function useGhostRace({
  replayData,
  totalWords,
  ghostName,
  ghostWpm,
}: UseGhostRaceOptions): UseGhostRaceReturn {
  const [cursor, setCursor] = useState<GhostCursor>({
    wordIndex: 0,
    charIndex: 0,
    progress: 0,
    name: ghostName,
    wpm: ghostWpm,
  });

  const rafRef = useRef<number>(0);
  const startTimeRef = useRef(0);
  const isRunningRef = useRef(false);
  const [isRunning, setIsRunning] = useState(false);

  const duration = replayData.length > 0 ? replayData[replayData.length - 1].t : 0;

  const tick = useCallback(
    (now: number) => {
      if (!isRunningRef.current) return;

      const elapsed = now - startTimeRef.current;

      if (elapsed >= duration) {
        // Ghost finished
        const last = replayData[replayData.length - 1];
        setCursor({
          wordIndex: last.w,
          charIndex: last.c,
          progress: 1,
          name: ghostName,
          wpm: ghostWpm,
        });
        isRunningRef.current = false;
        setIsRunning(false);
        return;
      }

      const idx = binarySearch(replayData, elapsed);
      if (idx >= 0) {
        const snap = replayData[idx];
        let wordIndex = snap.w;
        let charIndex = snap.c;

        // Interpolate to next snapshot
        if (idx + 1 < replayData.length) {
          const next = replayData[idx + 1];
          const dt = next.t - snap.t;
          if (dt > 0) {
            const frac = (elapsed - snap.t) / dt;
            if (next.w !== snap.w) {
              wordIndex = snap.w + Math.floor((next.w - snap.w) * frac);
            }
            charIndex = Math.round(snap.c + (next.c - snap.c) * frac);
          }
        }

        const progress = totalWords > 0 ? Math.min(1, wordIndex / totalWords) : 0;
        setCursor({
          wordIndex,
          charIndex,
          progress,
          name: ghostName,
          wpm: ghostWpm,
        });
      }

      rafRef.current = requestAnimationFrame(tick);
    },
    [replayData, totalWords, ghostName, ghostWpm, duration],
  );

  const startGhost = useCallback(() => {
    isRunningRef.current = true;
    setIsRunning(true);
    startTimeRef.current = performance.now();
    rafRef.current = requestAnimationFrame(tick);
  }, [tick]);

  const stopGhost = useCallback(() => {
    isRunningRef.current = false;
    setIsRunning(false);
    cancelAnimationFrame(rafRef.current);
  }, []);

  useEffect(() => {
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return { ghostCursor: cursor, startGhost, stopGhost, isRunning };
}
