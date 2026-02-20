"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type { ReplaySnapshot, WpmSample } from "@typeoff/shared";

type PlaybackState = "idle" | "playing" | "paused";

interface PlayerReplayData {
  playerId: string;
  name: string;
  replayData: ReplaySnapshot[] | null;
  wpmHistory: WpmSample[] | null;
  wpm: number;
  placement: number;
}

interface PlayerProgress {
  wordIndex: number;
  charIndex: number;
  progress: number;
}

function binarySearch(snapshots: ReplaySnapshot[], time: number): number {
  let lo = 0;
  let hi = snapshots.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >>> 1;
    if (snapshots[mid].t <= time) lo = mid + 1;
    else hi = mid - 1;
  }
  return hi; // index of last snapshot <= time
}

export function useReplay(players: PlayerReplayData[], totalWords: number) {
  const [state, setState] = useState<PlaybackState>("idle");
  const [currentTime, setCurrentTime] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [duration, setDuration] = useState(0);

  const rafRef = useRef<number>(0);
  const lastFrameRef = useRef(0);
  const currentTimeRef = useRef(0);
  const speedRef = useRef(1);

  // Calculate duration from replay data
  useEffect(() => {
    let maxTime = 0;
    for (const player of players) {
      if (player.replayData && player.replayData.length > 0) {
        const last = player.replayData[player.replayData.length - 1];
        if (last.t > maxTime) maxTime = last.t;
      }
    }
    setDuration(maxTime);
  }, [players]);

  const getPlayerProgress = useCallback(
    (time: number): Record<string, PlayerProgress> => {
      const result: Record<string, PlayerProgress> = {};
      for (const player of players) {
        if (!player.replayData || player.replayData.length === 0) {
          result[player.playerId] = { wordIndex: 0, charIndex: 0, progress: 0 };
          continue;
        }

        const idx = binarySearch(player.replayData, time);
        if (idx < 0) {
          result[player.playerId] = { wordIndex: 0, charIndex: 0, progress: 0 };
          continue;
        }

        const snap = player.replayData[idx];
        let wordIndex = snap.w;
        let charIndex = snap.c;

        // Linear interpolation to next snapshot
        if (idx + 1 < player.replayData.length) {
          const next = player.replayData[idx + 1];
          const dt = next.t - snap.t;
          if (dt > 0) {
            const frac = (time - snap.t) / dt;
            if (next.w !== snap.w) {
              wordIndex = snap.w + Math.floor((next.w - snap.w) * frac);
            }
            charIndex = Math.round(snap.c + (next.c - snap.c) * frac);
          }
        }

        const progress = totalWords > 0 ? Math.min(1, wordIndex / totalWords) : 0;
        result[player.playerId] = { wordIndex, charIndex, progress };
      }
      return result;
    },
    [players, totalWords]
  );

  const animate = useCallback(
    (now: number) => {
      const delta = now - lastFrameRef.current;
      lastFrameRef.current = now;

      const newTime = currentTimeRef.current + delta * speedRef.current;
      if (newTime >= duration) {
        currentTimeRef.current = duration;
        setCurrentTime(duration);
        setState("paused");
        return;
      }

      currentTimeRef.current = newTime;
      setCurrentTime(newTime);
      rafRef.current = requestAnimationFrame(animate);
    },
    [duration]
  );

  const play = useCallback(() => {
    if (duration === 0) return;
    if (currentTimeRef.current >= duration) {
      currentTimeRef.current = 0;
      setCurrentTime(0);
    }
    setState("playing");
    lastFrameRef.current = performance.now();
    rafRef.current = requestAnimationFrame(animate);
  }, [animate, duration]);

  const pause = useCallback(() => {
    setState("paused");
    cancelAnimationFrame(rafRef.current);
  }, []);

  const seek = useCallback(
    (time: number) => {
      const clamped = Math.max(0, Math.min(duration, time));
      currentTimeRef.current = clamped;
      setCurrentTime(clamped);
    },
    [duration]
  );

  const changeSpeed = useCallback((newSpeed: number) => {
    speedRef.current = newSpeed;
    setSpeed(newSpeed);
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const playerProgress = getPlayerProgress(currentTime);

  return {
    state,
    currentTime,
    duration,
    speed,
    isPlaying: state === "playing",
    playerProgress,
    play,
    pause,
    seek,
    setSpeed: changeSpeed,
  };
}
