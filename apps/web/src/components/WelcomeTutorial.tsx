"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";

const TUTORIAL_KEY = "typeoff-tutorial-v1";
const SPOTLIGHT_PAD = 8;
const SPOTLIGHT_RADIUS = 12;

type TooltipPosition = "bottom" | "top" | "left" | "right";

interface TourStep {
  target?: string; // data-tour attribute value (omit for centered card)
  title: string;
  body: string;
  position?: TooltipPosition;
  route?: string; // navigate here before showing this step
}

const STEPS: TourStep[] = [
  {
    title: "Welcome to TypeOff",
    body: "Competitive typing, ranked. Let's take a quick look around.",
  },
  {
    target: "mode-selector",
    title: "Pick Your Modes",
    body: "Choose one or more game modes. Each mode has its own ELO rating. One is picked at random each race.",
    position: "bottom",
    route: "/",
  },
  {
    target: "find-race",
    title: "Find a Race",
    body: "Queue up to race against other players and bots. ELO matchmaking keeps it fair.",
    position: "top",
    route: "/",
  },
  {
    target: "challenges",
    title: "Daily Challenges",
    body: "Complete challenges to earn bonus XP. New ones appear daily and weekly.",
    position: "top",
    route: "/",
  },
  {
    target: "level-widget",
    title: "Level Up",
    body: "Earn XP from races to level up and unlock cosmetics like badges, titles, and name effects.",
    position: "top",
    route: "/",
  },
  {
    target: "nav-solo",
    title: "Solo Practice",
    body: "Practice on your own with customizable modes, durations, and difficulty settings.",
    position: "bottom",
  },
  {
    target: "nav-leaderboard",
    title: "Leaderboard",
    body: "See where you rank against other typists across all modes.",
    position: "bottom",
  },
  {
    target: "nav-analytics",
    title: "Analytics",
    body: "Track your per-key and bigram accuracy to identify weaknesses and improve.",
    position: "bottom",
  },
  {
    title: "You're All Set",
    body: "Complete 3 placement races in any mode to get your rank. Good luck!",
  },
];

export function WelcomeTutorial() {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);
  const [exiting, setExiting] = useState(false);
  const [spotlightRect, setSpotlightRect] = useState<DOMRect | null>(null);
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});
  const tooltipRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const seen = localStorage.getItem(TUTORIAL_KEY);
    if (!seen) setVisible(true);
  }, []);

  // Position spotlight + tooltip when step changes
  const positionStep = useCallback(() => {
    const current = STEPS[step];
    if (!current?.target) {
      setSpotlightRect(null);
      setTooltipStyle({
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
      });
      return;
    }

    const el = document.querySelector(`[data-tour="${current.target}"]`);
    if (!el) {
      setSpotlightRect(null);
      setTooltipStyle({
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
      });
      return;
    }

    const rect = el.getBoundingClientRect();
    setSpotlightRect(rect);

    // Scroll element into view if needed
    el.scrollIntoView({ behavior: "smooth", block: "nearest" });

    // Calculate tooltip position
    requestAnimationFrame(() => {
      const tooltip = tooltipRef.current;
      const tw = tooltip?.offsetWidth ?? 320;
      const th = tooltip?.offsetHeight ?? 120;
      const pos = current.position ?? "bottom";
      const style: React.CSSProperties = { position: "fixed" };

      // Center horizontally relative to target
      let left = rect.left + rect.width / 2 - tw / 2;
      left = Math.max(12, Math.min(left, window.innerWidth - tw - 12));

      if (pos === "bottom") {
        style.top = rect.bottom + SPOTLIGHT_PAD + 12;
        style.left = left;
      } else if (pos === "top") {
        style.top = rect.top - SPOTLIGHT_PAD - th - 12;
        style.left = left;
        if ((style.top as number) < 12) {
          style.top = rect.bottom + SPOTLIGHT_PAD + 12;
        }
      } else if (pos === "left") {
        style.top = rect.top + rect.height / 2 - th / 2;
        style.left = rect.left - SPOTLIGHT_PAD - tw - 12;
      } else {
        style.top = rect.top + rect.height / 2 - th / 2;
        style.left = rect.right + SPOTLIGHT_PAD + 12;
      }

      setTooltipStyle(style);
    });
  }, [step]);

  // Navigate and reposition on step change
  useEffect(() => {
    if (!visible) return;
    const current = STEPS[step];
    if (current?.route && pathname !== current.route) {
      router.push(current.route);
      // Wait for navigation + render before positioning
      const timer = setTimeout(positionStep, 400);
      return () => clearTimeout(timer);
    }
    // Small delay to let DOM settle
    const timer = setTimeout(positionStep, 80);
    return () => clearTimeout(timer);
  }, [step, visible, pathname, router, positionStep]);

  // Reposition on resize
  useEffect(() => {
    if (!visible) return;
    const handler = () => positionStep();
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, [visible, positionStep]);

  const dismiss = useCallback(() => {
    setExiting(true);
    setTimeout(() => {
      setVisible(false);
      localStorage.setItem(TUTORIAL_KEY, "1");
    }, 300);
  }, []);

  const next = useCallback(() => {
    if (step < STEPS.length - 1) setStep((s) => s + 1);
    else dismiss();
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
  const hasTarget = !!spotlightRect;

  // Build clip-path to cut out the spotlight area from the overlay
  const clipPath = spotlightRect
    ? buildClipPath(spotlightRect)
    : undefined;

  return (
    <div
      className={`fixed inset-0 z-[60] transition-opacity duration-300 ${
        exiting ? "opacity-0" : "opacity-100"
      }`}
    >
      {/* Overlay with spotlight cutout */}
      <div
        className="absolute inset-0 bg-bg/85 backdrop-blur-[2px] transition-all duration-300"
        style={clipPath ? { clipPath } : undefined}
        onClick={dismiss}
      />

      {/* Spotlight ring glow */}
      {hasTarget && spotlightRect && (
        <div
          className="absolute pointer-events-none rounded-xl ring-2 ring-accent/40 transition-all duration-300"
          style={{
            top: spotlightRect.top - SPOTLIGHT_PAD,
            left: spotlightRect.left - SPOTLIGHT_PAD,
            width: spotlightRect.width + SPOTLIGHT_PAD * 2,
            height: spotlightRect.height + SPOTLIGHT_PAD * 2,
            boxShadow: "0 0 24px 4px rgba(77, 158, 255, 0.15)",
          }}
        />
      )}

      {/* Tooltip card */}
      <div
        ref={tooltipRef}
        className={`z-[61] w-80 rounded-xl bg-surface ring-1 ring-white/[0.1] shadow-2xl transition-all duration-300 ${
          exiting ? "scale-95 opacity-0" : "scale-100 opacity-100"
        }`}
        style={tooltipStyle}
      >
        {/* Progress dots */}
        <div className="flex items-center justify-center gap-1.5 pt-4 pb-1">
          {STEPS.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === step
                  ? "w-5 bg-accent"
                  : i < step
                  ? "w-1.5 bg-accent/40"
                  : "w-1.5 bg-white/[0.08]"
              }`}
            />
          ))}
        </div>

        <div className="px-5 pt-3 pb-4">
          <h3 className="text-base font-black text-text mb-1.5">
            {current.title}
          </h3>
          <p className="text-sm text-text/60 leading-relaxed">{current.body}</p>
        </div>

        <div className="flex items-center justify-between px-5 pb-4">
          <button
            onClick={dismiss}
            className="text-xs text-muted/40 hover:text-muted transition-colors"
          >
            Skip tour
          </button>
          <div className="flex items-center gap-2">
            {step > 0 && (
              <button
                onClick={prev}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-muted/60 hover:text-text hover:bg-white/[0.04] transition-all"
              >
                Back
              </button>
            )}
            <button
              onClick={next}
              className="px-4 py-1.5 rounded-lg text-xs font-bold bg-accent/[0.12] text-accent ring-1 ring-accent/25 hover:bg-accent hover:text-bg transition-all"
            >
              {isLast ? "Start Racing" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Build a polygon clip-path that covers everything EXCEPT the spotlight rectangle */
function buildClipPath(rect: DOMRect): string {
  const pad = SPOTLIGHT_PAD;
  const r = SPOTLIGHT_RADIUS;
  const t = rect.top - pad;
  const l = rect.left - pad;
  const b = rect.bottom + pad;
  const ri = rect.right + pad;

  // Outer rectangle (full viewport) with inner rounded-rect cutout
  // Using evenodd fill rule: outer polygon + inner polygon = hole
  return `polygon(evenodd,
    0 0, 100% 0, 100% 100%, 0 100%, 0 0,
    ${l + r}px ${t}px, ${ri - r}px ${t}px, ${ri}px ${t + r}px, ${ri}px ${b - r}px, ${ri - r}px ${b}px, ${l + r}px ${b}px, ${l}px ${b - r}px, ${l}px ${t + r}px, ${l + r}px ${t}px
  )`;
}
