"use client";

import React, { useState, useEffect, useCallback } from "react";

const TUTORIAL_KEY = "typeoff-tutorial-v1";

interface Step {
  title: string;
  body: React.ReactNode;
}

const RANK_TIERS = [
  { name: "Bronze", color: "#d97706" },
  { name: "Silver", color: "#9ca3af" },
  { name: "Gold", color: "#eab308" },
  { name: "Platinum", color: "#67e8f9" },
  { name: "Diamond", color: "#3b82f6" },
  { name: "Master", color: "#a855f7" },
  { name: "Grandmaster", color: "#ef4444" },
];

const MODES = [
  { label: "Words", desc: "Plain lowercase words" },
  { label: "Mixed", desc: "Punctuation & numbers" },
  { label: "Quotes", desc: "Famous quotations" },
  { label: "Code", desc: "Real syntax, real pain" },
];

const STEPS: Step[] = [
  {
    title: "Welcome to TypeOff",
    body: (
      <div className="flex flex-col items-center gap-4">
        <p className="text-text/70 text-center leading-relaxed max-w-sm">
          Competitive typing, ranked. Race against other typists and bots,
          climb through the ranks, and prove you're the fastest.
        </p>
        <div className="flex items-center gap-3 mt-2">
          {["Race", "Rank Up", "Compete"].map((w) => (
            <span
              key={w}
              className="px-3 py-1 rounded-full text-xs font-bold bg-accent/[0.08] text-accent ring-1 ring-accent/20"
            >
              {w}
            </span>
          ))}
        </div>
      </div>
    ),
  },
  {
    title: "Multiplayer Racing",
    body: (
      <div className="flex flex-col gap-3">
        <p className="text-text/70 text-center leading-relaxed max-w-sm">
          Queue up and race against other players and bots. ELO matchmaking
          keeps it fair. Complete <span className="text-accent font-bold">3 placement races</span> per
          mode to calibrate your rank.
        </p>
        <div className="flex items-center justify-center gap-6 mt-2">
          <div className="flex flex-col items-center gap-1">
            <span className="text-2xl">4</span>
            <span className="text-xs text-muted/60">players per race</span>
          </div>
          <div className="w-px h-8 bg-white/[0.06]" />
          <div className="flex flex-col items-center gap-1">
            <span className="text-2xl">3</span>
            <span className="text-xs text-muted/60">placement races</span>
          </div>
          <div className="w-px h-8 bg-white/[0.06]" />
          <div className="flex flex-col items-center gap-1">
            <span className="text-2xl font-mono text-accent">ELO</span>
            <span className="text-xs text-muted/60">matchmaking</span>
          </div>
        </div>
      </div>
    ),
  },
  {
    title: "Four Game Modes",
    body: (
      <div className="flex flex-col gap-3">
        <p className="text-text/70 text-center leading-relaxed max-w-sm">
          Each mode has its own ELO rating. Select one or more before racing.
        </p>
        <div className="grid grid-cols-2 gap-2 mt-1">
          {MODES.map((m) => (
            <div
              key={m.label}
              className="rounded-lg bg-surface-bright/40 ring-1 ring-white/[0.04] px-3 py-2.5 text-center"
            >
              <div className="text-sm font-bold text-text/90">{m.label}</div>
              <div className="text-xs text-muted/50 mt-0.5">{m.desc}</div>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    title: "Climb the Ranks",
    body: (
      <div className="flex flex-col gap-3">
        <p className="text-text/70 text-center leading-relaxed max-w-sm">
          Seven tiers from Bronze to Grandmaster. Win races to climb, and track
          your peak rating on your profile.
        </p>
        <div className="flex items-center justify-center gap-1.5 mt-2 flex-wrap">
          {RANK_TIERS.map((r) => (
            <span
              key={r.name}
              className="px-2 py-1 rounded text-xs font-bold"
              style={{ color: r.color, backgroundColor: `${r.color}15` }}
            >
              {r.name}
            </span>
          ))}
        </div>
      </div>
    ),
  },
  {
    title: "Track Your Progress",
    body: (
      <div className="flex flex-col gap-3">
        <p className="text-text/70 text-center leading-relaxed max-w-sm">
          Practice solo to sharpen your skills. Track per-key and bigram
          accuracy, earn XP, unlock cosmetics, and complete daily challenges.
        </p>
        <div className="grid grid-cols-3 gap-2 mt-1">
          {[
            { label: "Solo Practice", sub: "Train at your pace" },
            { label: "Analytics", sub: "Key & bigram stats" },
            { label: "Cosmetics", sub: "Badges, titles & more" },
          ].map((f) => (
            <div
              key={f.label}
              className="rounded-lg bg-surface-bright/40 ring-1 ring-white/[0.04] px-2.5 py-2.5 text-center"
            >
              <div className="text-xs font-bold text-text/90">{f.label}</div>
              <div className="text-[10px] text-muted/50 mt-0.5">{f.sub}</div>
            </div>
          ))}
        </div>
      </div>
    ),
  },
];

export function WelcomeTutorial() {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const seen = localStorage.getItem(TUTORIAL_KEY);
    if (!seen) {
      setVisible(true);
    }
  }, []);

  const dismiss = useCallback(() => {
    setExiting(true);
    setTimeout(() => {
      setVisible(false);
      localStorage.setItem(TUTORIAL_KEY, "1");
    }, 300);
  }, []);

  const next = useCallback(() => {
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
    } else {
      dismiss();
    }
  }, [step, dismiss]);

  const prev = useCallback(() => {
    if (step > 0) setStep((s) => s - 1);
  }, [step]);

  useEffect(() => {
    if (!visible) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss();
      if (e.key === "ArrowRight" || e.key === "Enter") next();
      if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [visible, dismiss, next, prev]);

  if (!visible) return null;

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div
      className={`fixed inset-0 z-[60] flex items-center justify-center transition-opacity duration-300 ${
        exiting ? "opacity-0" : "opacity-100"
      }`}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-bg/90 backdrop-blur-sm"
        onClick={dismiss}
      />

      {/* Card */}
      <div
        className={`relative w-full max-w-md mx-4 rounded-2xl bg-surface ring-1 ring-white/[0.08] shadow-2xl overflow-hidden transition-all duration-300 ${
          exiting ? "scale-95 opacity-0" : "scale-100 opacity-100"
        }`}
      >
        {/* Progress dots */}
        <div className="flex items-center justify-center gap-1.5 pt-5 pb-2">
          {STEPS.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === step
                  ? "w-6 bg-accent"
                  : i < step
                  ? "w-1.5 bg-accent/40"
                  : "w-1.5 bg-white/[0.08]"
              }`}
            />
          ))}
        </div>

        {/* Content */}
        <div className="px-6 pt-4 pb-6">
          <h2 className="text-xl font-black text-center text-text mb-4">
            {current.title}
          </h2>
          <div className="flex justify-center">{current.body}</div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 pb-5">
          <button
            onClick={dismiss}
            className="text-xs text-muted/50 hover:text-muted transition-colors"
          >
            Skip
          </button>
          <div className="flex items-center gap-2">
            {step > 0 && (
              <button
                onClick={prev}
                className="px-4 py-1.5 rounded-lg text-sm font-medium text-muted/70 hover:text-text hover:bg-white/[0.04] transition-all"
              >
                Back
              </button>
            )}
            <button
              onClick={next}
              className="px-5 py-1.5 rounded-lg text-sm font-bold bg-accent/[0.12] text-accent ring-1 ring-accent/25 hover:bg-accent hover:text-bg transition-all"
            >
              {isLast ? "Get Started" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
