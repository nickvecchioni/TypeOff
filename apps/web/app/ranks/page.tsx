import Link from "next/link";

const RANK_TIERS = [
  {
    name: "Grandmaster",
    range: "2500+",
    wpm: "200+",
    text: "text-rank-grandmaster",
    ring: "ring-rank-grandmaster/30",
    bg: "bg-rank-grandmaster/[0.06]",
    glowClass: "glow-gm",
    flavor: "The pinnacle. Reserved for the fastest typists on the planet.",
    divisions: null,
  },
  {
    name: "Master",
    range: "2200 – 2499",
    wpm: "~170–200",
    text: "text-rank-master",
    ring: "ring-rank-master/20",
    bg: "bg-rank-master/[0.04]",
    glowClass: "",
    flavor: "The apex. You type faster than most people think.",
    divisions: "III → II → I",
  },
  {
    name: "Diamond",
    range: "1900 – 2199",
    wpm: "~140–170",
    text: "text-rank-diamond",
    ring: "ring-rank-diamond/20",
    bg: "bg-rank-diamond/[0.04]",
    glowClass: "",
    flavor: "Elite speed and consistency. Competitors fear your speed.",
    divisions: "III → II → I",
  },
  {
    name: "Platinum",
    range: "1600 – 1899",
    wpm: "~110–140",
    text: "text-rank-platinum",
    ring: "ring-rank-platinum/15",
    bg: "bg-rank-platinum/[0.03]",
    glowClass: "",
    flavor: "Serious skill. You're outpacing the majority.",
    divisions: "III → II → I",
  },
  {
    name: "Gold",
    range: "1300 – 1599",
    wpm: "~80–110",
    text: "text-rank-gold",
    ring: "ring-rank-gold/15",
    bg: "bg-rank-gold/[0.03]",
    glowClass: "",
    flavor: "Above average and climbing. Keep the momentum.",
    divisions: "III → II → I",
  },
  {
    name: "Silver",
    range: "1000 – 1299",
    wpm: "~50–80",
    text: "text-rank-silver",
    ring: "ring-rank-silver/15",
    bg: "bg-rank-silver/[0.03]",
    glowClass: "",
    flavor: "Solid foundation. Your fingers are warming up.",
    divisions: "III → II → I",
  },
  {
    name: "Bronze",
    range: "0 – 999",
    wpm: "< 50",
    text: "text-rank-bronze",
    ring: "ring-rank-bronze/15",
    bg: "bg-rank-bronze/[0.03]",
    glowClass: "",
    flavor: "Everyone starts here. Every race makes you faster.",
    divisions: "III → II → I",
  },
];

export default function RanksPage() {
  return (
    <main className="flex-1 overflow-y-auto px-6 py-8">
      <div className="max-w-2xl mx-auto space-y-8 animate-fade-in">
        {/* Header */}
        <div>
          <h1 className="text-lg font-black text-text uppercase tracking-wider">
            Rank System
          </h1>
          <p className="text-muted text-sm mt-1">
            Every race changes your ELO. Climb from Bronze III to Grandmaster.
          </p>
        </div>

        {/* Rank Tier Cards */}
        <div className="space-y-2">
          {RANK_TIERS.map((tier) => {
            const isGM = tier.name === "Grandmaster";
            return (
              <div
                key={tier.name}
                className={`relative rounded-lg ring-1 ${tier.ring} ${tier.bg} px-4 py-3.5 ${isGM ? "py-5" : ""} ${tier.glowClass}`}
              >
                <div className="flex items-baseline justify-between gap-4">
                  <div className="flex items-baseline gap-2">
                    <span className={`font-bold ${tier.text} ${isGM ? "text-lg" : "text-base"}`}>
                      {tier.name}
                    </span>
                    {tier.divisions && (
                      <span className="text-xs text-muted/50 hidden sm:inline">
                        {tier.divisions}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-muted tabular-nums font-medium">
                    {tier.range}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-1 gap-4">
                  <p className="text-xs text-muted">{tier.flavor}</p>
                  <span className="text-xs text-muted/50 tabular-nums shrink-0">
                    {tier.wpm} wpm
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Info sections */}
        <div className="space-y-6">
          <InfoSection title="Divisions">
            Each rank (except Grandmaster) has three divisions: III, II, and I.
            Division III is the entry point, I is the top. Promote through
            divisions by placing well in races, and when you clear Division I
            you advance to the next rank.
          </InfoSection>

          <InfoSection title="How ELO Works">
            <p>
              Each race is 4 players. Your ELO changes based on where you
              place relative to each opponent&apos;s rating — finish above a
              higher-rated player and you&apos;ll gain more, finish below a
              lower-rated one and the penalty is steeper.
            </p>
            <p className="mt-2">
              Your first 30 races use a higher adjustment factor so you reach
              your true skill level faster. After that, changes settle down.
            </p>
          </InfoSection>

          <InfoSection title="Placement Races">
            <p className="mb-3">
              Before you get a rank, you play 3 calibration races per mode.
              Your speed determines your starting ELO.
            </p>
            <div className="flex items-center gap-0">
              {[1, 2, 3].map((step) => (
                <div key={step} className="flex items-center">
                  <div className="w-7 h-7 rounded-full bg-surface ring-1 ring-white/[0.08] flex items-center justify-center text-xs font-bold text-muted">
                    {step}
                  </div>
                  {step < 3 && <div className="w-8 h-px bg-white/[0.06]" />}
                </div>
              ))}
              <div className="w-8 h-px bg-accent/40" />
              <span className="text-accent font-bold text-xs">Ranked</span>
            </div>
          </InfoSection>

          <InfoSection title="Matchmaking">
            You&apos;re matched with players close to your skill level. If no
            human opponent is found quickly, the search widens. If it still
            can&apos;t find anyone, you&apos;ll race a bot calibrated to your
            ELO.
          </InfoSection>

          <InfoSection title="Tips for Climbing">
            <ul className="space-y-1 text-sm text-text/70 list-none">
              <li className="flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-accent/50 shrink-0" />
                Stay accurate — mistakes cost time
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-accent/50 shrink-0" />
                Warm up before ranked
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-accent/50 shrink-0" />
                Common words repeat — pattern recognition &gt; raw speed
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-accent/50 shrink-0" />
                Stay consistent, don&apos;t tilt
              </li>
            </ul>
          </InfoSection>
        </div>

        {/* CTA */}
        <div className="pb-8">
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

function InfoSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h2 className="text-xs font-bold text-muted/60 uppercase tracking-wider mb-2 flex items-center gap-3">
        {title}
        <span className="flex-1 h-px bg-white/[0.03]" />
      </h2>
      <div className="text-sm text-text/70">{children}</div>
    </div>
  );
}
