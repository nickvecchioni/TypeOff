"use client";

import React, { useEffect, useRef, useState } from "react";
import { useSession, signIn } from "next-auth/react";
import Link from "next/link";
import type { TestStats, TestConfig, WpmSample } from "@typeoff/shared";
import { getQuoteByIndex, getCodeSnippet, getXpLevel, SOLO_DAILY_XP_CAP } from "@typeoff/shared";
import { WpmChart } from "@/components/typing/WpmChart";
import { KeyboardHeatmap } from "@/components/typing/KeyboardHeatmap";
import { ShareResultCard } from "@/components/shared/ShareResultCard";
import { AdBanner } from "@/components/AdBanner";

/* ── Speed Analysis ──────────────────────────────────────── */

function SpeedAnalysis({ wpmHistory, wpm }: { wpmHistory: WpmSample[]; wpm: number }) {
  const samples = wpmHistory.filter((s) => s.wpm > 0);
  if (samples.length < 4) return null;

  const sorted = [...samples].sort((a, b) => b.wpm - a.wpm);
  const fastest = sorted[0];
  const slowest = sorted[sorted.length - 1];

  // First half vs second half (warmup analysis)
  const mid = Math.floor(samples.length / 2);
  const firstHalf = samples.slice(0, mid);
  const secondHalf = samples.slice(mid);
  const firstAvg = firstHalf.reduce((s, v) => s + v.wpm, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((s, v) => s + v.wpm, 0) / secondHalf.length;
  const warmupDelta = secondAvg - firstAvg;
  const warmupPct = firstAvg > 0 ? Math.round((warmupDelta / firstAvg) * 100) : 0;

  // Speed variance (coefficient of variation)
  const mean = samples.reduce((s, v) => s + v.wpm, 0) / samples.length;
  const variance = samples.reduce((s, v) => s + (v.wpm - mean) ** 2, 0) / samples.length;
  const cv = mean > 0 ? Math.sqrt(variance) / mean : 0;
  const stabilityLabel =
    cv < 0.05 ? "Excellent" : cv < 0.10 ? "Good" : cv < 0.15 ? "Average" : "Inconsistent";
  const stabilityColor =
    cv < 0.05 ? "text-correct" : cv < 0.10 ? "text-accent" : cv < 0.15 ? "text-muted/70" : "text-error";

  // Peak sustained WPM (best 3-sample rolling average)
  let peakSustained = 0;
  if (samples.length >= 3) {
    for (let i = 0; i <= samples.length - 3; i++) {
      const avg = (samples[i].wpm + samples[i + 1].wpm + samples[i + 2].wpm) / 3;
      if (avg > peakSustained) peakSustained = avg;
    }
  }

  // Hesitation points (drops >15% from rolling average)
  const hesitations: number[] = [];
  for (let i = 2; i < samples.length; i++) {
    const prevAvg = (samples[i - 1].wpm + samples[i - 2].wpm) / 2;
    if (prevAvg > 0 && samples[i].wpm < prevAvg * 0.85) {
      hesitations.push(samples[i].elapsed);
    }
  }

  return (
    <div className="w-full rounded-xl bg-surface/20 ring-1 ring-white/[0.05] px-3 pt-2 pb-3 flex flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <div className="text-xs font-bold text-muted/50 uppercase tracking-widest">Speed Analysis</div>
        <span className="text-xs font-black text-accent/50 bg-accent/[0.06] ring-1 ring-accent/15 rounded px-1.5 py-0.5 uppercase tracking-wider leading-none">
          PRO
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="rounded-lg bg-surface/40 ring-1 ring-white/[0.04] px-3 py-2">
          <div className="text-xs text-muted/50 uppercase tracking-widest mb-1">Peak Sustained</div>
          <div className="text-lg font-black text-accent tabular-nums leading-none">
            {Math.floor(peakSustained)}
            <span className="text-[0.6em] opacity-40">.{(peakSustained % 1).toFixed(2).slice(2)}</span>
          </div>
          <div className="text-xs text-muted/60 mt-0.5">3-sec rolling avg</div>
        </div>

        <div className="rounded-lg bg-surface/40 ring-1 ring-white/[0.04] px-3 py-2">
          <div className="text-xs text-muted/50 uppercase tracking-widest mb-1">Fastest</div>
          <div className="text-lg font-black text-correct tabular-nums leading-none">{Math.floor(fastest.wpm)}</div>
          <div className="text-xs text-muted/60 mt-0.5">at {fastest.elapsed}s</div>
        </div>

        <div className="rounded-lg bg-surface/40 ring-1 ring-white/[0.04] px-3 py-2">
          <div className="text-xs text-muted/50 uppercase tracking-widest mb-1">Slowest</div>
          <div className="text-lg font-black text-error/80 tabular-nums leading-none">{Math.floor(slowest.wpm)}</div>
          <div className="text-xs text-muted/60 mt-0.5">at {slowest.elapsed}s</div>
        </div>

        <div className="rounded-lg bg-surface/40 ring-1 ring-white/[0.04] px-3 py-2">
          <div className="text-xs text-muted/50 uppercase tracking-widest mb-1">Stability</div>
          <div className={`text-sm font-black leading-none ${stabilityColor}`}>{stabilityLabel}</div>
          <div className="text-xs text-muted/60 mt-0.5">{Math.round((1 - cv) * 100)}% stable</div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted/60">
        <div className="flex items-center gap-1.5">
          <span className="text-muted/60">Warmup:</span>
          <span className="tabular-nums">{Math.floor(firstAvg)} → {Math.floor(secondAvg)} WPM</span>
          <span className={`font-bold tabular-nums ${warmupDelta > 0 ? "text-correct" : warmupDelta < 0 ? "text-error/70" : "text-muted/50"}`}>
            {warmupDelta > 0 ? "+" : ""}{warmupPct}%
          </span>
        </div>

        {hesitations.length > 0 ? (
          <div className="flex items-center gap-1.5">
            <span className="text-muted/60">Hesitations:</span>
            <span className="text-error/60 font-medium tabular-nums">
              {hesitations.length} drop{hesitations.length !== 1 ? "s" : ""}
            </span>
            <span className="text-muted/55">at {hesitations.map((t) => `${t}s`).join(", ")}</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <span className="text-muted/60">Hesitations:</span>
            <span className="text-correct/70 font-medium">None</span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Solo XP Panel ───────────────────────────────────────── */

interface SoloXpProgress {
  xpEarned: number;
  totalXp: number;
  level: number;
  levelUp: boolean;
  newRewards: Array<{ level: number; type: string; id: string; name: string; value: string }>;
  isPro: boolean;
  dailyXpUsed: number;
  dailyXpCap: number;
}

function SoloXpPanel({ xp }: { xp: SoloXpProgress }) {
  const [displayXp, setDisplayXp] = useState(0);
  const [barPct, setBarPct] = useState(0);
  const [levelUpVisible, setLevelUpVisible] = useState(false);
  const [animStarted, setAnimStarted] = useState(false);
  const rafRef = useRef<number>(0);

  const prevTotalXp = xp.totalXp - xp.xpEarned;
  const prevInfo = getXpLevel(prevTotalXp);
  const curInfo = getXpLevel(xp.totalXp);
  const prevPct = (prevInfo.currentXp / prevInfo.nextLevelXp) * 100;
  const finalPct = (curInfo.currentXp / curInfo.nextLevelXp) * 100;

  useEffect(() => {
    setBarPct(prevPct);
    const delay = setTimeout(() => {
      setAnimStarted(true);
      const startTime = performance.now();
      const duration = xp.levelUp ? 1800 : 1200;

      const animate = (now: number) => {
        const elapsed = now - startTime;
        const t = Math.min(elapsed / duration, 1);
        const ease = 1 - Math.pow(1 - t, 3);

        setDisplayXp(Math.round(xp.xpEarned * ease));

        if (xp.levelUp) {
          if (t < 0.45) {
            const p = t / 0.45;
            setBarPct(prevPct + (100 - prevPct) * (1 - Math.pow(1 - p, 3)));
          } else if (t < 0.55) {
            setBarPct(100);
            setLevelUpVisible(true);
          } else {
            const p = (t - 0.55) / 0.45;
            setBarPct(finalPct * (1 - Math.pow(1 - p, 3)));
          }
        } else {
          setBarPct(prevPct + (finalPct - prevPct) * ease);
        }

        if (t < 1) rafRef.current = requestAnimationFrame(animate);
      };

      rafRef.current = requestAnimationFrame(animate);
    }, 400);

    return () => { clearTimeout(delay); cancelAnimationFrame(rafRef.current); };
  }, [prevPct, finalPct, xp.levelUp, xp.xpEarned]);

  const displayLevel = xp.levelUp && !levelUpVisible ? xp.level - 1 : xp.level;
  const dailyPct = Math.min(100, (xp.dailyXpUsed / xp.dailyXpCap) * 100);
  const cappedOut = xp.dailyXpUsed >= xp.dailyXpCap;

  return (
    <div className="rounded-xl bg-surface/30 ring-1 ring-white/[0.04] overflow-hidden">
      <div className="h-px bg-gradient-to-r from-transparent via-accent/20 to-transparent" />
      <div className="px-3 py-2 sm:px-4 sm:py-2.5 flex flex-col gap-2">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-accent/80 uppercase tracking-wider">Level</h3>
          <span
            className={`text-base font-black tabular-nums transition-all duration-500 ${
              animStarted ? "opacity-100 text-accent" : "opacity-0"
            }`}
          >
            +{displayXp} XP
          </span>
        </div>

        {/* Level + XP bar */}
        <div className="rounded-lg px-3 py-2 ring-1 ring-accent/10 bg-surface/40 flex items-center gap-4">
          <div className="shrink-0 w-10 text-center">
            <div className="text-xs font-black text-muted/60 uppercase tracking-widest leading-none mb-0.5">LEVEL</div>
            <div className="text-3xl font-black tabular-nums leading-none text-text">
              {displayLevel}
            </div>
            {levelUpVisible && (
              <div className="text-correct text-xs font-black mt-0.5" style={{ animation: "fade-in 0.3s ease-out" }}>
                ▲ UP!
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-baseline justify-between mb-1.5">
              <span className="text-sm font-bold text-accent tabular-nums">
                {curInfo.currentXp.toLocaleString()}
                <span className="text-muted/60 font-normal"> / {curInfo.nextLevelXp.toLocaleString()} XP</span>
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-surface overflow-hidden">
              <div className="h-full flex">
                <div className="h-full bg-accent/35 shrink-0" style={{ width: `${prevPct}%` }} />
                <div className="h-full bg-accent shrink-0" style={{ width: `${Math.max(0, barPct - prevPct)}%` }} />
              </div>
            </div>
            <div className="text-sm text-muted/55 mt-1 tabular-nums">
              {(curInfo.nextLevelXp - curInfo.currentXp).toLocaleString()} XP to level {xp.level + 1}
            </div>
          </div>
        </div>

        {/* Daily cap indicator */}
        <div className="flex items-center gap-2 text-xs text-muted/50">
          <span className="shrink-0">Daily solo XP:</span>
          <div className="flex-1 h-1 rounded-full bg-surface overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${cappedOut ? "bg-muted/40" : "bg-accent/40"}`}
              style={{ width: `${dailyPct}%` }}
            />
          </div>
          <span className={`tabular-nums shrink-0 ${cappedOut ? "text-muted/70 font-bold" : ""}`}>
            {xp.dailyXpUsed.toLocaleString()} / {xp.dailyXpCap.toLocaleString()}
            {cappedOut && " (capped)"}
          </span>
        </div>

        {/* Pro multiplier hint */}
        {!xp.isPro && xp.xpEarned > 0 && (
          <div className="text-xs text-muted/40">
            <Link href="/pro" className="text-accent/50 hover:text-accent transition-colors">Pro</Link>
            {" "}members earn 1.5x XP
          </div>
        )}
      </div>
    </div>
  );
}

interface PracticeResultsProps {
  stats: TestStats;
  config: TestConfig;
  isPb: boolean | null;
  onRestart: () => void;
  seed?: number | null;
  xpProgress?: SoloXpProgress | null;
}

export function PracticeResults({ stats, config, isPb, onRestart, seed, xpProgress }: PracticeResultsProps) {
  const { data: session } = useSession();
  const isPro = session?.user?.isPro ?? false;
  const tabPressedRef = useRef(false);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || tag === "BUTTON" || tag === "A") return;

      if (e.key === "Tab") {
        e.preventDefault();
        tabPressedRef.current = true;
        return;
      }
      if (e.key === "Enter" && tabPressedRef.current) {
        e.preventDefault();
        tabPressedRef.current = false;
        onRestart();
        return;
      }
      tabPressedRef.current = false;
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onRestart]);

  const modeLabel = (() => {
    const parts: string[] = [];
    if (config.contentType === "quotes" || config.contentType === "custom" || config.contentType === "practice") {
      parts.push(config.contentType);
    } else {
      parts.push(config.mode === "timed" ? `${config.duration}s` : `${config.duration} words`);
      if (config.difficulty !== "easy") parts.push(config.difficulty);
      if (config.punctuation) parts.push("punct");
    }
    return parts.join(" · ");
  })();

  const showRawWpm = stats.rawWpm > 0 && Math.floor(stats.rawWpm) !== Math.floor(stats.wpm);

  return (
    <div className="flex flex-col gap-1.5 w-full animate-slide-up pb-1">
      {/* ── Hero stats ─────────────────────────────────────── */}
      <div
        className="relative rounded-xl overflow-hidden ring-1 ring-white/[0.06]"
        style={isPb ? { boxShadow: "0 0 40px rgba(63,185,80,0.12)" } : undefined}
      >
        {/* Gradient overlay */}
        <div
          className={`pointer-events-none absolute inset-0 ${
            isPb
              ? "bg-gradient-to-br from-correct/15 via-correct/3 to-transparent"
              : "bg-gradient-to-br from-accent/10 via-accent/3 to-transparent"
          }`}
        />

        {/* Accent bar */}
        <div className={`h-[3px] ${isPb ? "bg-correct" : "bg-accent opacity-50"}`} />

        {/* Main hero layout: WPM left | stats right */}
        <div className="relative flex flex-col sm:flex-row">
          {/* WPM — primary stat */}
          <div className="px-5 sm:px-7 py-3 flex flex-col justify-center sm:border-r sm:border-white/[0.04]">
            <div className="text-xs text-muted/60 uppercase tracking-wide mb-1">wpm</div>
            <div className="flex items-baseline gap-2">
              <div className="text-4xl sm:text-5xl font-black text-accent tabular-nums leading-none">
                {Math.floor(stats.wpm)}
                <span className="text-xl opacity-50">
                  .{(stats.wpm % 1).toFixed(2).slice(2)}
                </span>
              </div>
              {isPb && (
                <span className="text-xs font-black text-correct bg-correct/10 ring-1 ring-correct/30 rounded px-1.5 py-0.5 uppercase tracking-wider leading-none animate-fade-in">
                  PB
                </span>
              )}
            </div>
            {showRawWpm && (
              <div className="text-xs text-muted/65 tabular-nums mt-1">
                {Math.floor(stats.rawWpm)} raw
              </div>
            )}
          </div>

          {/* Secondary stats grid */}
          <div className="flex-1 grid grid-cols-3 divide-x divide-white/[0.04]">
            {/* Accuracy */}
            <div className="px-3 py-3 sm:px-4 flex flex-col justify-center">
              <div className="text-xs text-muted/60 uppercase tracking-wide mb-1">accuracy</div>
              <div className="text-2xl sm:text-3xl font-black text-text tabular-nums leading-none">
                {Math.floor(stats.accuracy)}
                <span className="text-sm opacity-50">
                  .{((stats.accuracy % 1) * 10).toFixed(0)}%
                </span>
              </div>
              {stats.misstypedChars > 0 && (
                <div className="text-xs text-error/50 tabular-nums mt-1">
                  {stats.misstypedChars} mistakes
                </div>
              )}
            </div>

            {/* Consistency */}
            <div className="px-3 py-3 sm:px-4 flex flex-col justify-center">
              <div className="text-xs text-muted/60 uppercase tracking-wide mb-1">consistency</div>
              <div className="text-2xl sm:text-3xl font-black text-text tabular-nums leading-none">
                {Math.floor(stats.consistency)}
                <span className="text-sm opacity-50">%</span>
              </div>
            </div>

            {/* Time + Mode */}
            <div className="px-3 py-3 sm:px-4 flex flex-col justify-center">
              <div className="text-xs text-muted/60 uppercase tracking-wide mb-1">{modeLabel}</div>
              <div className="text-2xl sm:text-3xl font-black text-text tabular-nums leading-none">
                {stats.time >= 60
                  ? <>{Math.floor(stats.time / 60)}<span className="text-sm opacity-50">:{String(Math.round(stats.time % 60)).padStart(2, "0")}</span></>
                  : <>{Math.round(stats.time)}<span className="text-sm opacity-50">s</span></>}
              </div>
            </div>
          </div>
        </div>

        {/* Character breakdown row */}
        <div className="relative flex items-center divide-x divide-white/[0.04] border-t border-white/[0.04]">
          <div className="flex items-center gap-3 px-4 py-1.5 text-xs tabular-nums">
            <span className="text-correct/70">
              <span className="font-bold">{stats.correctChars}</span>
              <span className="text-muted/50 ml-1">correct</span>
            </span>
            <span className="text-error/60">
              <span className="font-bold">{stats.incorrectChars}</span>
              <span className="text-muted/50 ml-1">incorrect</span>
            </span>
            {stats.extraChars > 0 && (
              <span className="text-muted/60">
                <span className="font-bold">{stats.extraChars}</span>
                <span className="text-muted/50 ml-1">extra</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Quote / Code info ────────────────────────────────── */}
      {config.contentType === "quotes" && seed != null && (() => {
        const quote = getQuoteByIndex(seed);
        return (
          <div className="rounded-xl bg-surface/30 ring-1 ring-white/[0.04] px-4 py-3 text-center">
            <div className="text-sm text-text/70 italic leading-relaxed">&ldquo;{quote.text}&rdquo;</div>
            <div className="text-xs text-muted/50 mt-1.5">&mdash; {quote.author}</div>
          </div>
        );
      })()}
      {config.contentType === "code" && seed != null && (() => {
        const snippet = getCodeSnippet(seed, config.codeLanguage);
        return (
          <div className="rounded-xl bg-surface/30 ring-1 ring-white/[0.04] px-4 py-2.5 flex items-center gap-2">
            <span className="text-xs font-mono text-accent/70">&lt;/&gt;</span>
            <span className="text-sm text-text/70">{snippet.name}</span>
            <span className="text-xs text-muted/60">{snippet.language}</span>
          </div>
        );
      })()}

      {/* ── Two-column grid ────────────────────────────────── */}
      <div
        className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 w-full"
        style={{ animation: "fade-in 0.3s ease-out 0.05s both" }}
      >
        {/* ── Left: WPM Chart ── */}
        <div className="flex flex-col gap-1.5">
          {stats.wpmHistory.length >= 2 && (
            <div className="rounded-xl bg-surface/20 ring-1 ring-white/[0.05] px-3 pt-2.5 pb-1.5 flex flex-col">
              <div className="text-xs font-bold text-muted/50 uppercase tracking-widest mb-0.5">WPM over time</div>
              <div className="w-full" style={{ aspectRatio: "600 / 240" }}>
                <WpmChart samples={stats.wpmHistory} />
              </div>
            </div>
          )}

          {/* Share + Sign-in */}
          <div className="flex flex-col items-center gap-3">
            {session?.user?.username && (
              <ShareResultCard
                data={{
                  variant: "solo",
                  wpm: stats.wpm,
                  accuracy: stats.accuracy,
                  consistency: stats.consistency,
                  modeLabel,
                  username: session.user!.username!,
                  date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
                }}
              />
            )}

            {!session?.user && (
              <div className="flex flex-col items-center gap-3 w-full">
                <p className="text-muted/60 text-xs">Sign in to save your result</p>
                <button
                  onClick={() => signIn("google", { callbackUrl: "/solo" })}
                  className="group flex items-center gap-3 rounded-lg bg-white/[0.05] ring-1 ring-white/[0.08] px-6 py-3.5 text-sm text-text hover:bg-white/[0.09] hover:ring-white/[0.15] transition-all"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  <span className="font-medium">Sign in with Google</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── Right: Keyboard Heatmap ── */}
        <div className="flex flex-col gap-1.5">
          {stats.keyStats && Object.keys(stats.keyStats).length > 0 && (
            <div className="rounded-xl bg-surface/20 ring-1 ring-white/[0.05] px-3 pt-2.5 pb-2 flex flex-col">
              <div className="text-xs font-bold text-muted/50 uppercase tracking-widest mb-2">Key Accuracy</div>
              <KeyboardHeatmap keyStats={stats.keyStats} />
              <div className="flex items-center gap-4 text-xs text-muted/70 tabular-nums mt-2">
                {(() => {
                  const totalCorrect = Object.values(stats.keyStats).reduce((s, k) => s + k.correct, 0);
                  const totalAll = Object.values(stats.keyStats).reduce((s, k) => s + k.total, 0);
                  const totalIncorrect = totalAll - totalCorrect;
                  return (
                    <>
                      <span><span className="text-correct font-semibold">{totalCorrect}</span> correct</span>
                      <span><span className="text-error font-semibold">{totalIncorrect}</span> incorrect</span>
                      <span><span className="text-text font-semibold">{totalAll}</span> total</span>
                    </>
                  );
                })()}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── XP Progress ──────────────────────────────────────── */}
      {session?.user ? (
        xpProgress && xpProgress.xpEarned > 0 ? (
          <SoloXpPanel xp={xpProgress} />
        ) : !xpProgress ? (
          <div className="rounded-xl bg-surface/30 ring-1 ring-white/[0.04] overflow-hidden">
            <div className="h-px bg-gradient-to-r from-transparent via-accent/20 to-transparent" />
            <div className="px-3 py-2 sm:px-4 sm:py-2.5 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="h-3 w-12 rounded bg-white/[0.04] animate-pulse" />
                <div className="h-3 w-16 rounded bg-white/[0.04] animate-pulse" />
              </div>
              <div className="rounded-lg px-3 py-2 ring-1 ring-white/[0.04] bg-surface/40 flex items-center gap-4">
                <div className="w-10 h-10 rounded bg-white/[0.04] animate-pulse shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-24 rounded bg-white/[0.04] animate-pulse" />
                  <div className="h-1.5 w-full rounded-full bg-surface" />
                  <div className="h-2.5 w-20 rounded bg-white/[0.04] animate-pulse" />
                </div>
              </div>
            </div>
          </div>
        ) : null
      ) : null}

      {/* ── Speed Analysis (Pro) ────────────────────────────── */}
      {isPro && stats.wpmHistory.length >= 4 && (
        <SpeedAnalysis wpmHistory={stats.wpmHistory} wpm={stats.wpm} />
      )}

      {/* ── Ad ──────────────────────────────────────────────── */}
      <AdBanner slot="practice_results" format="horizontal" className="w-full" />

      {/* ── Actions ────────────────────────────────────────── */}
      <div className="flex flex-col items-center gap-1.5 w-full max-w-lg mx-auto pt-1">
        <button
          onClick={onRestart}
          className="group w-full rounded-lg bg-accent/10 ring-1 ring-accent/30 text-accent py-2.5 text-sm font-bold hover:bg-accent hover:text-bg hover:ring-accent transition-all flex flex-col items-center gap-1"
          style={{ boxShadow: "0 0 20px rgba(77,158,255,0.08)" }}
        >
          <span>
            Type Again
            <span className="inline-block w-[2px] h-[1em] bg-current animate-blink ml-0.5 translate-y-px" />
          </span>
          <span className="text-xs font-normal text-accent/60 group-hover:text-bg/40 flex items-center gap-1">
            <kbd className="inline-flex items-center px-1 py-px rounded bg-white/[0.04] ring-1 ring-white/[0.07] text-xs font-medium">Tab</kbd>
            {" + "}
            <kbd className="inline-flex items-center px-1 py-px rounded bg-white/[0.04] ring-1 ring-white/[0.07] text-xs font-medium">Enter ↵</kbd>
          </span>
        </button>

        {/* Secondary actions */}
        <div className="flex items-center gap-1">
          <Link
            href="/analytics"
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-muted/60 hover:text-muted hover:bg-white/[0.02] transition-colors rounded"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="20" x2="18" y2="10" />
              <line x1="12" y1="20" x2="12" y2="4" />
              <line x1="6" y1="20" x2="6" y2="14" />
            </svg>
            <span className="text-xs font-medium">Analytics</span>
          </Link>
          <span className="text-muted/50 text-[10px]">·</span>
          <Link
            href="/history"
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-muted/60 hover:text-muted hover:bg-white/[0.02] transition-colors rounded"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span className="text-xs font-medium">History</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
