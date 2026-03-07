"use client";

import Link from "next/link";
import { useState, useRef, useEffect, useCallback } from "react";
import { ScrollDownHint } from "./ScrollDownHint";

const RANK_TIERS = [
  {
    name: "Grandmaster",
    range: "2500+",
    wpm: "200+",
    color: "#ef4444",
    textClass: "text-rank-grandmaster",
    flavor: "The pinnacle. Reserved for the fastest typists on the planet.",
    hasDivisions: false,
    icon: "GM",
  },
  {
    name: "Master",
    range: "2200 – 2499",
    wpm: "~170–200",
    color: "#a855f7",
    textClass: "text-rank-master",
    flavor: "The apex. You type faster than most people think.",
    hasDivisions: true,
    icon: "MA",
  },
  {
    name: "Diamond",
    range: "1900 – 2199",
    wpm: "~140–170",
    color: "#3b82f6",
    textClass: "text-rank-diamond",
    flavor: "Elite speed and consistency. Competitors fear your speed.",
    hasDivisions: true,
    icon: "DI",
  },
  {
    name: "Platinum",
    range: "1600 – 1899",
    wpm: "~110–140",
    color: "#67e8f9",
    textClass: "text-rank-platinum",
    flavor: "Serious skill. You're outpacing the majority.",
    hasDivisions: true,
    icon: "PL",
  },
  {
    name: "Gold",
    range: "1300 – 1599",
    wpm: "~80–110",
    color: "#eab308",
    textClass: "text-rank-gold",
    flavor: "Above average and climbing. Keep the momentum.",
    hasDivisions: true,
    icon: "GO",
  },
  {
    name: "Silver",
    range: "1000 – 1299",
    wpm: "~50–80",
    color: "#9ca3af",
    textClass: "text-rank-silver",
    flavor: "Solid foundation. Your fingers are warming up.",
    hasDivisions: true,
    icon: "SI",
  },
  {
    name: "Bronze",
    range: "0 – 999",
    wpm: "< 50",
    color: "#d97706",
    textClass: "text-rank-bronze",
    flavor: "Everyone starts here. Every race makes you faster.",
    hasDivisions: true,
    icon: "BR",
  },
];

const GAME_MODES = [
  {
    title: "Ranked",
    description:
      "ELO-matched 4-player races. Climb from Bronze to Grandmaster across 7 tiers.",
    gradient: "from-red-500/20 to-orange-500/10",
    accent: "#ef4444",
    keys: ["W", "P", "M"],
  },
  {
    title: "Solo",
    description:
      "Practice at your own pace. Words, quotes, code — multiple modes and difficulties.",
    gradient: "from-blue-500/20 to-cyan-500/10",
    accent: "#4d9eff",
    keys: ["A", "C", "C"],
  },
  {
    title: "Custom",
    description:
      "Create a party, invite friends, and race privately with your own settings.",
    gradient: "from-purple-500/20 to-pink-500/10",
    accent: "#a855f7",
    keys: ["F", "U", "N"],
  },
];

const FEATURES = [
  {
    title: "Analytics",
    description:
      "Per-key and bigram accuracy heatmaps, WPM trends, and weakness-ranked practice insights.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 3v18h18" />
        <path d="M7 16l4-8 4 4 5-9" />
      </svg>
    ),
  },
  {
    title: "Cosmetics",
    description:
      "Unlock badges, titles, name effects, cursor styles, and profile borders as you level up.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ),
  },
  {
    title: "Parties",
    description:
      "Group up with friends, chat in the lobby, and queue into private or ranked races together.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    title: "Spectate",
    description:
      "Watch live races in real time and follow top players on the leaderboard.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ),
  },
];

const GLOW_CLASS: Record<string, string> = {
  Bronze: "glow-bronze",
  Silver: "glow-silver",
  Gold: "glow-gold",
  Platinum: "glow-platinum",
  Diamond: "glow-diamond",
  Master: "glow-master",
};

/* ── Tilt hook for 3D hover effect ───────────────────────── */

function useTilt(intensity = 8) {
  const ref = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<React.CSSProperties>({});

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      setStyle({
        transform: `perspective(600px) rotateY(${x * intensity}deg) rotateX(${-y * intensity}deg) scale(1.02)`,
        transition: "transform 0.1s ease-out",
      });
    },
    [intensity]
  );

  const handleMouseLeave = useCallback(() => {
    setStyle({
      transform: "perspective(600px) rotateY(0deg) rotateX(0deg) scale(1)",
      transition: "transform 0.4s ease-out",
    });
  }, []);

  return { ref, style, handleMouseMove, handleMouseLeave };
}

/* ── Animated counter ────────────────────────────────────── */

function AnimatedNumber({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [value, setValue] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          const start = performance.now();
          const duration = 1200;
          function tick(now: number) {
            const progress = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setValue(Math.round(eased * target));
            if (progress < 1) requestAnimationFrame(tick);
          }
          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.5 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [target]);

  return (
    <span ref={ref} className="tabular-nums">
      {value}
      {suffix}
    </span>
  );
}

/* ── Interactive typing demo ─────────────────────────────── */

function TypingDemo() {
  const phrase = "the quick brown fox";
  const [typed, setTyped] = useState("");
  const [active, setActive] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!active) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Backspace") {
        setTyped((prev) => prev.slice(0, -1));
      } else if (e.key.length === 1 && typed.length < phrase.length) {
        setTyped((prev) => prev + e.key);
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [active, typed]);

  // Auto-reset when complete
  useEffect(() => {
    if (typed.length === phrase.length) {
      const timer = setTimeout(() => setTyped(""), 1500);
      return () => clearTimeout(timer);
    }
  }, [typed]);

  const isComplete = typed === phrase;

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onClick={() => setActive(true)}
      onBlur={() => setActive(false)}
      className={`group relative rounded-xl overflow-hidden ring-1 transition-all duration-300 cursor-pointer select-none ${
        active
          ? "ring-accent/40 bg-surface/60"
          : "ring-white/[0.06] bg-surface/20 hover:ring-white/[0.12]"
      }`}
    >
      <div className="px-5 py-5">
        <div className="text-xs text-muted/50 uppercase tracking-widest mb-3 font-bold">
          {active ? "Type along..." : "Click to try"}
        </div>
        <div className="font-mono text-lg tracking-wide leading-relaxed">
          {phrase.split("").map((char, i) => {
            const isTyped = i < typed.length;
            const isCorrect = isTyped && typed[i] === char;
            const isWrong = isTyped && typed[i] !== char;
            const isCursor = i === typed.length && active;
            return (
              <span key={i} className="relative">
                {isCursor && (
                  <span className="absolute left-0 top-0 bottom-0 w-[2px] bg-accent animate-blink" />
                )}
                <span
                  className={`transition-colors duration-100 ${
                    isCorrect
                      ? "text-text"
                      : isWrong
                        ? "text-red-400 bg-red-400/10"
                        : "text-muted/30"
                  }`}
                >
                  {char}
                </span>
              </span>
            );
          })}
        </div>
        {isComplete && (
          <div className="text-xs text-green-400 mt-2 animate-fade-in">
            Perfect!
          </div>
        )}
      </div>
    </div>
  );
}

/* ── ELO Simulator widget ────────────────────────────────── */

function EloSimulator() {
  const [elo, setElo] = useState(1000);
  const [history, setHistory] = useState<number[]>([1000]);

  function simulate(win: boolean) {
    const change = win
      ? Math.floor(Math.random() * 20 + 15)
      : -Math.floor(Math.random() * 15 + 10);
    const newElo = Math.max(0, elo + change);
    setElo(newElo);
    setHistory((prev) => [...prev.slice(-19), newElo]);
  }

  function getRankForElo(e: number) {
    if (e >= 2500) return RANK_TIERS[0];
    if (e >= 2200) return RANK_TIERS[1];
    if (e >= 1900) return RANK_TIERS[2];
    if (e >= 1600) return RANK_TIERS[3];
    if (e >= 1300) return RANK_TIERS[4];
    if (e >= 1000) return RANK_TIERS[5];
    return RANK_TIERS[6];
  }

  const currentRank = getRankForElo(elo);
  const maxH = Math.max(...history, 1200);
  const minH = Math.min(...history, 800);
  const range = maxH - minH || 1;

  return (
    <div className="rounded-xl overflow-hidden ring-1 ring-white/[0.06] bg-surface/20">
      <div className="px-5 py-4">
        <div className="text-xs text-muted/50 uppercase tracking-widest mb-3 font-bold">
          ELO Simulator
        </div>

        {/* ELO display */}
        <div className="flex items-baseline gap-3 mb-4">
          <span
            className="text-3xl font-black tabular-nums transition-colors duration-300"
            style={{ color: currentRank.color }}
          >
            {elo}
          </span>
          <span
            className="text-sm font-bold transition-colors duration-300"
            style={{ color: currentRank.color }}
          >
            {currentRank.name}
          </span>
        </div>

        {/* Mini sparkline */}
        <div className="h-12 flex items-end gap-[2px] mb-4">
          {history.map((val, i) => {
            const height = ((val - minH) / range) * 100;
            const isLast = i === history.length - 1;
            return (
              <div
                key={i}
                className="flex-1 rounded-t-sm transition-all duration-300"
                style={{
                  height: `${Math.max(height, 4)}%`,
                  backgroundColor: isLast
                    ? currentRank.color
                    : `${currentRank.color}40`,
                }}
              />
            );
          })}
        </div>

        {/* Buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => simulate(true)}
            className="flex-1 rounded-lg bg-green-500/10 text-green-400 text-xs font-bold py-2
                       hover:bg-green-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            Win Race
          </button>
          <button
            onClick={() => simulate(false)}
            className="flex-1 rounded-lg bg-red-500/10 text-red-400 text-xs font-bold py-2
                       hover:bg-red-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            Lose Race
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Game Mode Card (interactive) ────────────────────────── */

function GameModeCard({
  mode,
}: {
  mode: (typeof GAME_MODES)[number];
}) {
  const tilt = useTilt(6);
  const [pressed, setPressed] = useState<number | null>(null);

  return (
    <div
      ref={tilt.ref}
      style={tilt.style}
      onMouseMove={tilt.handleMouseMove}
      onMouseLeave={() => {
        tilt.handleMouseLeave();
        setPressed(null);
      }}
      className="relative rounded-xl overflow-hidden ring-1 ring-white/[0.06] hover:ring-white/[0.15] group cursor-default"
    >
      {/* Top accent bar */}
      <div
        className="h-[3px] transition-all duration-300 group-hover:h-[4px]"
        style={{ backgroundColor: `${mode.accent}99` }}
      />
      {/* Gradient overlay */}
      <div
        className="absolute inset-0 top-[3px] bg-gradient-to-b to-transparent pointer-events-none opacity-40 group-hover:opacity-80 transition-opacity duration-300"
        style={{
          backgroundImage: `linear-gradient(to bottom, ${mode.accent}22, transparent)`,
        }}
      />
      <div className="px-4 py-4 relative">
        <h3 className="text-sm font-bold text-text group-hover:text-white transition-colors">
          {mode.title}
        </h3>
        <p className="text-xs text-muted/70 mt-1.5 leading-relaxed group-hover:text-muted/90 transition-colors">
          {mode.description}
        </p>

        {/* Interactive keyboard keys */}
        <div className="flex gap-1.5 mt-3">
          {mode.keys.map((key, i) => (
            <button
              key={i}
              onMouseDown={() => setPressed(i)}
              onMouseUp={() => setPressed(null)}
              className={`w-7 h-7 rounded-md text-[10px] font-bold flex items-center justify-center
                         ring-1 ring-white/[0.08] transition-all duration-100 select-none
                         ${
                           pressed === i
                             ? "translate-y-[1px] bg-white/[0.12]"
                             : "bg-white/[0.04] hover:bg-white/[0.08]"
                         }`}
              style={{
                color: pressed === i ? mode.accent : undefined,
                boxShadow:
                  pressed === i
                    ? `0 0 12px ${mode.accent}30`
                    : "0 1px 2px rgba(0,0,0,0.3)",
              }}
            >
              {key}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Grandmaster Hero Card ───────────────────────────────── */

function GrandmasterCard({ tier }: { tier: (typeof RANK_TIERS)[number] }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="relative rounded-xl overflow-hidden glow-gm group cursor-default"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Top gradient accent bar */}
      <div
        className="h-[3px] transition-all duration-500"
        style={{
          background: hovered
            ? `linear-gradient(90deg, ${tier.color}, ${tier.color}, ${tier.color}80)`
            : `linear-gradient(90deg, ${tier.color}, ${tier.color}80, transparent)`,
        }}
      />
      {/* Animated gradient overlay */}
      <div
        className="absolute inset-0 top-[3px] pointer-events-none transition-opacity duration-500"
        style={{
          background: `radial-gradient(ellipse at ${hovered ? "50% 0%" : "30% 0%"}, ${tier.color}20, transparent 70%)`,
          opacity: hovered ? 1 : 0.5,
        }}
      />
      {/* Shimmer on hover */}
      {hovered && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(105deg, transparent 40%, rgba(239,68,68,0.06) 45%, rgba(239,68,68,0.12) 50%, rgba(239,68,68,0.06) 55%, transparent 60%)",
            animation: "shimmer 2s ease-in-out infinite",
          }}
        />
      )}
      <div className="bg-rank-grandmaster/[0.06] px-5 py-5 relative">
        <div className="flex items-baseline justify-between gap-4">
          <div className="flex items-center gap-3">
            {/* Rank emblem */}
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center text-xs font-black transition-all duration-300"
              style={{
                backgroundColor: `${tier.color}18`,
                color: tier.color,
                boxShadow: hovered
                  ? `0 0 20px ${tier.color}30, 0 0 40px ${tier.color}10`
                  : "none",
                transform: hovered ? "scale(1.1)" : "scale(1)",
              }}
            >
              {tier.icon}
            </div>
            <span
              className="text-lg font-black text-rank-grandmaster tracking-tight transition-all duration-300"
              style={{
                textShadow: hovered
                  ? `0 0 24px ${tier.color}50, 0 0 48px ${tier.color}20`
                  : "none",
              }}
            >
              {tier.name}
            </span>
          </div>
          <div className="text-right">
            <span className="text-sm text-muted tabular-nums font-bold">
              {tier.range}
            </span>
            <span className="block text-xs text-muted/60 tabular-nums mt-0.5">
              {tier.wpm} wpm
            </span>
          </div>
        </div>
        <p className="text-xs text-muted/70 mt-2 group-hover:text-muted/90 transition-colors">
          {tier.flavor}
        </p>
      </div>
    </div>
  );
}

/* ── Standard Rank Card ──────────────────────────────────── */

function RankCard({ tier }: { tier: (typeof RANK_TIERS)[number] }) {
  const [hovered, setHovered] = useState(false);
  const [divisionFill, setDivisionFill] = useState([false, false, false]);

  // Animate division bars on hover
  useEffect(() => {
    if (hovered) {
      const timers = [
        setTimeout(() => setDivisionFill([true, false, false]), 100),
        setTimeout(() => setDivisionFill([true, true, false]), 250),
        setTimeout(() => setDivisionFill([true, true, true]), 400),
      ];
      return () => timers.forEach(clearTimeout);
    } else {
      setDivisionFill([false, false, false]);
    }
  }, [hovered]);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`relative rounded-xl overflow-hidden bg-surface/20 ring-1 ring-white/[0.06]
                  hover:ring-white/[0.12] transition-all duration-300 cursor-default group
                  ${GLOW_CLASS[tier.name] ?? ""}`}
      style={{
        boxShadow: hovered
          ? `0 0 24px ${tier.color}18, 0 0 60px ${tier.color}08`
          : undefined,
        transform: hovered ? "translateX(4px)" : "translateX(0)",
      }}
    >
      {/* Left accent bar */}
      <div
        className="absolute left-0 top-0 bottom-0 transition-all duration-300"
        style={{
          backgroundColor: tier.color,
          width: hovered ? "4px" : "3px",
          boxShadow: hovered ? `0 0 12px ${tier.color}40` : "none",
        }}
      />
      {/* Gradient overlay */}
      <div
        className="absolute inset-0 left-[3px] bg-gradient-to-r to-transparent pointer-events-none transition-opacity duration-300"
        style={{
          backgroundImage: `linear-gradient(to right, ${tier.color}${hovered ? "20" : "14"}, transparent)`,
        }}
      />
      <div className="pl-5 pr-4 py-3.5 relative">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {/* Rank emblem */}
            <div
              className="w-8 h-8 rounded-md flex items-center justify-center text-[10px] font-black transition-all duration-300"
              style={{
                backgroundColor: `${tier.color}15`,
                color: tier.color,
                transform: hovered ? "scale(1.1) rotate(-2deg)" : "scale(1)",
                boxShadow: hovered
                  ? `0 0 16px ${tier.color}25`
                  : "none",
              }}
            >
              {tier.icon}
            </div>
            <span
              className={`font-bold ${tier.textClass} transition-all duration-300`}
              style={{
                textShadow: hovered
                  ? `0 0 16px ${tier.color}40`
                  : "none",
              }}
            >
              {tier.name}
            </span>
            {/* Division segments — animated fill */}
            {tier.hasDivisions && (
              <div className="flex items-center gap-[3px]">
                {[0.2, 0.45, 0.8].map((baseOp, di) => (
                  <span
                    key={di}
                    className="rounded-full transition-all duration-300"
                    style={{
                      backgroundColor: tier.color,
                      opacity: divisionFill[di] ? 1 : baseOp,
                      width: divisionFill[di] ? "16px" : "12px",
                      height: "3px",
                    }}
                  />
                ))}
              </div>
            )}
          </div>
          <div className="text-right">
            <span className="text-xs text-muted tabular-nums font-medium group-hover:text-text/80 transition-colors">
              {tier.range}
            </span>
            <span className="block text-xs text-muted/60 tabular-nums group-hover:text-muted/80 transition-colors">
              {tier.wpm} wpm
            </span>
          </div>
        </div>
        <p className="text-xs text-muted/65 mt-1.5 group-hover:text-muted/90 transition-colors">
          {tier.flavor}
        </p>
      </div>
    </div>
  );
}

/* ── Feature Card ────────────────────────────────────────── */

function FeatureCard({
  feature,
  index,
}: {
  feature: (typeof FEATURES)[number];
  index: number;
}) {
  const tilt = useTilt(5);
  const [hovered, setHovered] = useState(false);

  return (
    <div
      ref={tilt.ref}
      style={tilt.style}
      onMouseMove={tilt.handleMouseMove}
      onMouseLeave={() => {
        tilt.handleMouseLeave();
        setHovered(false);
      }}
      onMouseEnter={() => setHovered(true)}
      className="rounded-lg bg-surface/30 ring-1 ring-accent/[0.06] hover:ring-accent/[0.15] px-4 py-4 group transition-all duration-300 cursor-default"
    >
      <div className="flex items-start gap-3">
        <div
          className="text-accent/50 group-hover:text-accent transition-all duration-300 mt-0.5"
          style={{
            transform: hovered ? "scale(1.15)" : "scale(1)",
            filter: hovered ? "drop-shadow(0 0 8px rgba(77,158,255,0.3))" : "none",
          }}
        >
          {feature.icon}
        </div>
        <div>
          <h3 className="text-xs font-bold text-accent/60 group-hover:text-accent/90 uppercase tracking-widest mb-2 transition-colors">
            {feature.title}
          </h3>
          <p className="text-xs text-text/60 leading-relaxed group-hover:text-text/80 transition-colors">
            {feature.description}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ── Info Card ───────────────────────────────────────────── */

function InfoCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="rounded-lg bg-surface/30 ring-1 ring-accent/[0.06] hover:ring-accent/[0.12] px-4 py-3.5 transition-all duration-300 cursor-default group"
      style={{
        transform: hovered ? "translateY(-2px)" : "translateY(0)",
      }}
    >
      <h3 className="text-xs font-bold text-accent/60 group-hover:text-accent/80 uppercase tracking-widest mb-2 transition-colors">
        {title}
      </h3>
      <p className="text-xs text-text/60 leading-relaxed group-hover:text-text/80 transition-colors">
        {children}
      </p>
    </div>
  );
}

/* ── Stat Card ───────────────────────────────────────────── */

function StatCard({
  label,
  value,
  suffix,
}: {
  label: string;
  value: number;
  suffix?: string;
}) {
  return (
    <div className="rounded-lg bg-surface/20 ring-1 ring-white/[0.06] px-4 py-3 text-center group hover:ring-accent/[0.15] transition-all duration-300 hover:bg-surface/30">
      <div className="text-2xl font-black text-accent/80 group-hover:text-accent transition-colors">
        <AnimatedNumber target={value} suffix={suffix} />
      </div>
      <div className="text-xs text-muted/50 mt-1 uppercase tracking-wider font-medium">
        {label}
      </div>
    </div>
  );
}

/* ── Main Page ───────────────────────────────────────────── */

export default function AboutPage() {
  return (
    <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-8">
      <div className="max-w-4xl mx-auto">
        {/* ── 1. Hero Intro ─────────────────────────────────── */}
        <div className="mb-8 animate-slide-up">
          <h1 className="text-2xl font-black tracking-wider text-glow-accent">
            <span className="text-accent">Type</span>
            <span className="text-text">Off</span>
          </h1>
          <p className="text-muted text-sm mt-2">
            Competitive typing — ranked multiplayer with ELO matchmaking.
          </p>
          <p className="text-muted/60 text-xs mt-1">
            Race head-to-head, climb the ladder, and prove you&apos;re the
            fastest.
          </p>
        </div>

        {/* ── Typing Demo ───────────────────────────────────── */}
        <div
          className="mb-10 animate-slide-up"
          style={{ animationDelay: "40ms" }}
        >
          <TypingDemo />
        </div>

        {/* ── Quick Stats ───────────────────────────────────── */}
        <div
          className="grid grid-cols-3 gap-3 mb-14 animate-slide-up"
          style={{ animationDelay: "60ms" }}
        >
          <StatCard label="Rank Tiers" value={7} />
          <StatCard label="Max ELO" value={3000} suffix="+" />
          <StatCard label="Players / Race" value={4} />
        </div>

        {/* ── 2. Game Modes ─────────────────────────────────── */}
        <div
          className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-14 animate-slide-up"
          style={{ animationDelay: "80ms" }}
        >
          {GAME_MODES.map((mode) => (
            <GameModeCard key={mode.title} mode={mode} />
          ))}
        </div>

        {/* ── 3. Rank System ────────────────────────────────── */}
        <h2
          className="text-xs font-bold text-muted/50 uppercase tracking-widest mb-4 animate-slide-up"
          style={{ animationDelay: "160ms" }}
        >
          Rank System
        </h2>

        <div className="space-y-2">
          {RANK_TIERS.map((tier, i) => (
            <div
              key={tier.name}
              className="animate-slide-up"
              style={{ animationDelay: `${200 + i * 50}ms` }}
            >
              {tier.name === "Grandmaster" ? (
                <GrandmasterCard tier={tier} />
              ) : (
                <RankCard tier={tier} />
              )}
            </div>
          ))}
        </div>

        {/* Scroll hint */}
        <ScrollDownHint />

        {/* ── ELO Simulator + Info Grid ─────────────────────── */}
        <div
          className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-12 animate-slide-up"
          style={{ animationDelay: "550ms" }}
        >
          {/* ELO Simulator spans a column */}
          <EloSimulator />

          <div className="space-y-3">
            <InfoCard title="Divisions">
              Each rank has three divisions: III, II, and I.
              Division&nbsp;III is the entry point, I is the top. Clear
              Division&nbsp;I to advance to the next rank. Grandmaster has
              no divisions.
            </InfoCard>

            <InfoCard title="Placement">
              Your first race determines your starting ELO based on
              typing speed, so you match with players at your level from
              the start.
            </InfoCard>
          </div>

          <InfoCard title="ELO System">
            4-player races. Your ELO shifts based on relative skill —
            beat higher-rated players for bigger gains, lose to
            lower-rated ones for steeper penalties. First 30 races
            adjust faster.
          </InfoCard>

          <InfoCard title="Matchmaking">
            Matched by skill level. If no opponent is found quickly, the
            search widens. After 20 seconds, you&apos;ll race a bot
            calibrated to your ELO.
          </InfoCard>
        </div>

        {/* Tips */}
        <div
          className="mt-4 animate-slide-up"
          style={{ animationDelay: "600ms" }}
        >
          <div className="rounded-lg bg-gradient-to-b from-accent/[0.04] to-surface/25 ring-1 ring-white/[0.04] hover:ring-white/[0.08] px-5 py-4 transition-all duration-300 group">
            <h3 className="text-xs font-bold text-accent/60 uppercase tracking-widest mb-3">
              Tips for Climbing
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5">
              {[
                "Stay accurate — mistakes cost time",
                "Warm up before ranked",
                "Pattern recognition > raw speed",
                "Stay consistent, don\u2019t tilt",
              ].map((tip) => (
                <div
                  key={tip}
                  className="flex items-center gap-2 text-xs text-text/60 group-hover:text-text/75 transition-colors"
                >
                  <span className="w-1 h-1 rounded-full bg-accent/40 group-hover:bg-accent/70 shrink-0 transition-colors" />
                  {tip}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── 4. Features ─────────────────────────────────────── */}
        <div
          className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-14 animate-slide-up"
          style={{ animationDelay: "650ms" }}
        >
          {FEATURES.map((feat, i) => (
            <FeatureCard key={feat.title} feature={feat} index={i} />
          ))}
        </div>

        {/* ── 5. Start Racing CTA ─────────────────────────────── */}
        <div
          className="mt-12 pb-8 text-center animate-slide-up"
          style={{ animationDelay: "780ms" }}
        >
          <Link
            href="/"
            className="inline-block rounded-lg bg-accent text-bg px-8 py-3 text-sm font-bold tracking-wide uppercase
                       hover:bg-accent/90 hover:scale-[1.03] hover:shadow-[0_0_30px_rgba(77,158,255,0.25)]
                       active:scale-[0.98] transition-all duration-200 glow-accent"
          >
            Start Racing
          </Link>
        </div>
      </div>
    </main>
  );
}
