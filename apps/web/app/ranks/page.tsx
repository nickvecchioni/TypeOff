import Link from "next/link";

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

export default function RanksPage() {
  return (
    <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-10 animate-fade-in">
          <h1 className="text-lg font-black text-text uppercase tracking-wider">
            Rank System
          </h1>
          <p className="text-muted text-sm mt-1">
            Every race changes your ELO. Climb from Bronze&nbsp;III to Grandmaster.
          </p>
        </div>

        {/* Rank Ladder */}
        <div className="space-y-2">
          {RANK_TIERS.map((tier, i) => (
            <div
              key={tier.name}
              className="animate-slide-up"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              {tier.name === "Grandmaster" ? (
                <GrandmasterCard tier={tier} />
              ) : (
                <RankCard tier={tier} />
              )}
            </div>
          ))}
        </div>

        {/* Info Grid */}
        <div
          className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-12 animate-slide-up"
          style={{ animationDelay: "450ms" }}
        >
          <InfoCard title="Divisions">
            Each rank has three divisions: III, II, and I. Division&nbsp;III is the
            entry point, I is the top. Clear Division&nbsp;I to advance to the next
            rank. Grandmaster has no divisions.
          </InfoCard>

          <InfoCard title="ELO System">
            4-player races. Your ELO shifts based on relative skill — beat
            higher-rated players for bigger gains, lose to lower-rated ones for
            steeper penalties. First 30 races adjust faster.
          </InfoCard>

          <InfoCard title="Placement">
            Your first race determines your starting ELO based on typing speed,
            so you match with players at your level from the start.
          </InfoCard>

          <InfoCard title="Matchmaking">
            Matched by skill level. If no opponent is found quickly, the search
            widens. After 20 seconds, you&apos;ll race a bot calibrated to your
            ELO.
          </InfoCard>
        </div>

        {/* Tips */}
        <div
          className="mt-4 animate-slide-up"
          style={{ animationDelay: "520ms" }}
        >
          <div className="rounded-lg bg-surface/25 ring-1 ring-white/[0.04] px-5 py-4">
            <h3 className="text-[11px] font-bold text-accent/60 uppercase tracking-widest mb-3">
              Tips for Climbing
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5">
              {[
                "Stay accurate — mistakes cost time",
                "Warm up before ranked",
                "Pattern recognition > raw speed",
                "Stay consistent, don\u2019t tilt",
              ].map((tip) => (
                <div key={tip} className="flex items-center gap-2 text-xs text-text/60">
                  <span className="w-1 h-1 rounded-full bg-accent/40 shrink-0" />
                  {tip}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CTA */}
        <div
          className="mt-10 pb-8 animate-slide-up"
          style={{ animationDelay: "580ms" }}
        >
          <Link
            href="/"
            className="inline-block rounded-lg bg-accent text-bg px-8 py-3 text-sm font-bold tracking-wide uppercase hover:bg-accent/90 transition-colors glow-accent"
          >
            Start Racing
          </Link>
        </div>
      </div>
    </main>
  );
}

/* ── Grandmaster Hero Card ────────────────────────────────── */

function GrandmasterCard({ tier }: { tier: (typeof RANK_TIERS)[number] }) {
  return (
    <div className="relative rounded-lg overflow-hidden glow-gm">
      {/* Top gradient accent bar */}
      <div
        className="h-[3px]"
        style={{
          background: `linear-gradient(90deg, ${tier.color}, ${tier.color}80, transparent)`,
        }}
      />
      <div className="bg-rank-grandmaster/[0.06] px-5 py-5">
        <div className="flex items-baseline justify-between gap-4">
          <span className="text-lg font-black text-rank-grandmaster tracking-tight">
            {tier.name}
          </span>
          <div className="text-right">
            <span className="text-sm text-muted tabular-nums font-bold">
              {tier.range}
            </span>
            <span className="block text-[10px] text-muted/40 tabular-nums mt-0.5">
              {tier.wpm} wpm
            </span>
          </div>
        </div>
        <p className="text-xs text-muted/70 mt-2">{tier.flavor}</p>
      </div>
    </div>
  );
}

/* ── Standard Rank Card ───────────────────────────────────── */

function RankCard({ tier }: { tier: (typeof RANK_TIERS)[number] }) {
  return (
    <div className="relative rounded-lg overflow-hidden bg-surface/20 ring-1 ring-white/[0.04] hover:ring-white/[0.08] transition-all">
      {/* Left accent bar */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[3px]"
        style={{ backgroundColor: tier.color }}
      />
      <div className="pl-5 pr-4 py-3.5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className={`font-bold ${tier.textClass}`}>{tier.name}</span>
            {/* Division segments — 3 bars of increasing opacity */}
            {tier.hasDivisions && (
              <div className="flex items-center gap-[3px]">
                <span
                  className="w-3 h-[3px] rounded-full"
                  style={{ backgroundColor: tier.color, opacity: 0.2 }}
                />
                <span
                  className="w-3 h-[3px] rounded-full"
                  style={{ backgroundColor: tier.color, opacity: 0.45 }}
                />
                <span
                  className="w-3 h-[3px] rounded-full"
                  style={{ backgroundColor: tier.color, opacity: 0.8 }}
                />
              </div>
            )}
          </div>
          <div className="text-right">
            <span className="text-xs text-muted tabular-nums font-medium">
              {tier.range}
            </span>
            <span className="block text-[10px] text-muted/40 tabular-nums">
              {tier.wpm} wpm
            </span>
          </div>
        </div>
        <p className="text-xs text-muted/50 mt-1.5">{tier.flavor}</p>
      </div>
    </div>
  );
}

/* ── Info Card ────────────────────────────────────────────── */

function InfoCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg bg-surface/25 ring-1 ring-white/[0.04] px-4 py-3.5">
      <h3 className="text-[11px] font-bold text-muted/50 uppercase tracking-widest mb-2">
        {title}
      </h3>
      <p className="text-xs text-text/60 leading-relaxed">{children}</p>
    </div>
  );
}
