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
  },
  {
    name: "Master",
    range: "2200 – 2499",
    wpm: "~170–200",
    color: "#a855f7",
    textClass: "text-rank-master",
    flavor: "The apex. You type faster than most people think.",
    hasDivisions: true,
  },
  {
    name: "Diamond",
    range: "1900 – 2199",
    wpm: "~140–170",
    color: "#3b82f6",
    textClass: "text-rank-diamond",
    flavor: "Elite speed and consistency. Competitors fear your speed.",
    hasDivisions: true,
  },
  {
    name: "Platinum",
    range: "1600 – 1899",
    wpm: "~110–140",
    color: "#67e8f9",
    textClass: "text-rank-platinum",
    flavor: "Serious skill. You're outpacing the majority.",
    hasDivisions: true,
  },
  {
    name: "Gold",
    range: "1300 – 1599",
    wpm: "~80–110",
    color: "#eab308",
    textClass: "text-rank-gold",
    flavor: "Above average and climbing. Keep the momentum.",
    hasDivisions: true,
  },
  {
    name: "Silver",
    range: "1000 – 1299",
    wpm: "~50–80",
    color: "#9ca3af",
    textClass: "text-rank-silver",
    flavor: "Solid foundation. Your fingers are warming up.",
    hasDivisions: true,
  },
  {
    name: "Bronze",
    range: "0 – 999",
    wpm: "< 50",
    color: "#d97706",
    textClass: "text-rank-bronze",
    flavor: "Everyone starts here. Every race makes you faster.",
    hasDivisions: true,
  },
];

const FEATURES = [
  {
    title: "Analytics",
    description:
      "Per-key and bigram accuracy heatmaps, WPM trends, and weakness-ranked practice insights.",
    href: "/analytics",
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
    href: "/cosmetics",
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
    href: "/race",
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
    href: "/spectate",
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
}: {
  feature: (typeof FEATURES)[number];
}) {
  const tilt = useTilt(5);
  const [hovered, setHovered] = useState(false);

  return (
    <Link
      href={feature.href}
      ref={tilt.ref as React.Ref<HTMLAnchorElement>}
      style={tilt.style}
      onMouseMove={tilt.handleMouseMove as unknown as React.MouseEventHandler<HTMLAnchorElement>}
      onMouseLeave={() => {
        tilt.handleMouseLeave();
        setHovered(false);
      }}
      onMouseEnter={() => setHovered(true)}
      className="rounded-lg bg-surface/30 ring-1 ring-accent/[0.06] hover:ring-accent/[0.15] px-4 py-4 group transition-all duration-300 block"
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
    </Link>
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

/* ── Main Page ───────────────────────────────────────────── */

export default function AboutPage() {
  return (
    <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-8">
      <div className="max-w-4xl mx-auto">
        {/* ── 1. Hero Intro ─────────────────────────────────── */}
        <div className="mb-8 animate-slide-up">
          <h1 className="text-2xl font-black tracking-wider text-accent text-glow-accent">
            TypeOff
          </h1>
          <p className="text-muted text-sm mt-2">
            Competitive typing — ranked multiplayer with ELO matchmaking.
          </p>
          <p className="text-muted/60 text-xs mt-1">
            Race head-to-head, climb the ladder, and prove you&apos;re the
            fastest.
          </p>
        </div>

        {/* ── 2. Rank System ────────────────────────────────── */}
        <Link
          href="/ranks"
          className="text-xs font-bold text-muted/50 hover:text-muted/80 uppercase tracking-widest mb-4 animate-slide-up block transition-colors"
          style={{ animationDelay: "160ms" }}
        >
          Rank System →
        </Link>

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

        {/* ── Info Grid ────────────────────────────────────── */}
        <div
          className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-12 animate-slide-up"
          style={{ animationDelay: "550ms" }}
        >
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
          {FEATURES.map((feat) => (
            <FeatureCard key={feat.title} feature={feat} />
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
