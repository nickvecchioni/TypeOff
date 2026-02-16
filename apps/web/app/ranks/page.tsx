import Link from "next/link";

const RANK_TIERS = [
  {
    name: "Grandmaster",
    range: "2200+",
    text: "text-rank-grandmaster",
    card: "bg-gradient-to-r from-rank-grandmaster/10 to-rank-grandmaster/3 ring-1 ring-rank-grandmaster/30 shadow-[0_0_24px_rgba(239,68,68,0.2)]",
    flavor: "The pinnacle. Reserved for the fastest typists on the planet.",
    divisions: null,
    featured: true,
  },
  {
    name: "Master",
    range: "1800 – 2199",
    text: "text-rank-master",
    card: "bg-rank-master/6 ring-1 ring-rank-master/25 shadow-[0_0_16px_rgba(168,85,247,0.12)]",
    flavor: "The apex. You type faster than most people think.",
    divisions: "III → II → I (each ~133 ELO)",
    featured: false,
  },
  {
    name: "Diamond",
    range: "1500 – 1799",
    text: "text-rank-diamond",
    card: "bg-rank-diamond/6 ring-1 ring-rank-diamond/25 shadow-[0_0_16px_rgba(59,130,246,0.12)]",
    flavor: "Elite speed and consistency. Competitors fear your lobby.",
    divisions: "III → II → I (each 100 ELO)",
    featured: false,
  },
  {
    name: "Platinum",
    range: "1300 – 1499",
    text: "text-rank-platinum",
    card: "bg-rank-platinum/5 ring-1 ring-rank-platinum/15",
    flavor: "Serious skill. You're outpacing the majority.",
    divisions: "III → II → I (each ~67 ELO)",
    featured: false,
  },
  {
    name: "Gold",
    range: "1100 – 1299",
    text: "text-rank-gold",
    card: "bg-rank-gold/5 ring-1 ring-rank-gold/15",
    flavor: "Above average and climbing. Keep the momentum.",
    divisions: "III → II → I (each ~67 ELO)",
    featured: false,
  },
  {
    name: "Silver",
    range: "900 – 1099",
    text: "text-rank-silver",
    card: "bg-rank-silver/5 ring-1 ring-rank-silver/15",
    flavor: "Solid foundation. Your fingers are warming up.",
    divisions: "III → II → I (each ~67 ELO)",
    featured: false,
  },
  {
    name: "Bronze",
    range: "0 – 899",
    text: "text-rank-bronze",
    card: "bg-rank-bronze/5 ring-1 ring-rank-bronze/15",
    flavor: "Everyone starts here. Every race makes you faster.",
    divisions: "III → II → I (each 300 ELO)",
    featured: false,
  },
];

export default function RanksPage() {
  return (
    <main className="flex-1 overflow-y-auto px-6 py-8">
      <div className="max-w-2xl mx-auto space-y-10 animate-fade-in">
        {/* Hero */}
        <div>
          <h1 className="text-2xl font-black text-accent">Rank System</h1>
          <p className="text-muted mt-2">
            Every race changes your ELO. Climb from Bronze III to Grandmaster.
          </p>
        </div>

        {/* Rank Tier Cards */}
        <div className="space-y-3">
          {RANK_TIERS.map((tier) => (
            <div
              key={tier.name}
              className={`rounded-lg ${tier.card} ${
                tier.featured ? "p-5" : "p-4"
              }`}
            >
              <div className="flex items-baseline justify-between">
                <span
                  className={`font-bold ${tier.text} ${
                    tier.featured ? "text-xl" : "text-lg"
                  }`}
                >
                  {tier.name}
                </span>
                <span className="text-muted tabular-nums text-sm">
                  {tier.range}
                </span>
              </div>
              <p className="text-sm text-text/70 mt-1">{tier.flavor}</p>
              {tier.divisions && (
                <p className="text-xs text-muted mt-1">
                  Divisions: {tier.divisions}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Divisions */}
        <div>
          <h2 className="text-lg font-bold text-text mb-3">Divisions</h2>
          <div className="space-y-3 text-sm text-text/80">
            <p>
              Each rank (except Grandmaster) has three divisions: III, II, and I.
              Division III is the entry point, I is the top. Promote through
              divisions by winning races, and when you clear Division I you
              advance to the next rank.
            </p>
          </div>
        </div>

        {/* How ELO Works */}
        <div>
          <h2 className="text-lg font-bold text-text mb-3">How ELO Works</h2>
          <div className="space-y-3 text-sm text-text/80">
            <p>
              Win a race and your ELO goes up. Lose and it goes down. Simple.
            </p>
            <p>
              Beat someone rated higher than you and you&apos;ll gain more
              points. Lose to someone rated lower and the penalty is steeper.
              The system rewards punching above your weight.
            </p>
            <p>
              Your first 30 races use a higher adjustment factor so you reach
              your true skill level faster. After that, changes settle down.
            </p>
          </div>
        </div>

        {/* Placement Races */}
        <div>
          <h2 className="text-lg font-bold text-text mb-3">Placement Races</h2>
          <p className="text-sm text-text/80 mb-4">
            Before you get a rank, you play 3 calibration races against
            adaptive bots. Your average speed determines your starting ELO —
            up to Grandmaster for elite typists.
          </p>
          <div className="flex items-center gap-0">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center">
                <div className="w-8 h-8 rounded-full bg-surface border-2 border-muted flex items-center justify-center text-sm font-bold text-muted">
                  {step}
                </div>
                {step < 3 && (
                  <div className="w-12 h-0.5 bg-muted" />
                )}
              </div>
            ))}
            <div className="w-12 h-0.5 bg-accent" />
            <span className="text-accent font-bold text-sm ml-1">
              Ranked!
            </span>
          </div>
        </div>

        {/* Matchmaking */}
        <div>
          <h2 className="text-lg font-bold text-text mb-3">Matchmaking</h2>
          <p className="text-sm text-text/80">
            You&apos;re matched with players close to your skill level. If no
            human opponent is found quickly, the search widens. If it still
            can&apos;t find anyone, you&apos;ll race a bot calibrated to your
            ELO.
          </p>
        </div>

        {/* Tips */}
        <div>
          <h2 className="text-lg font-bold text-text mb-3">
            Tips for Climbing
          </h2>
          <ul className="space-y-2 text-sm text-text/80 list-disc list-inside">
            <li>Stay accurate — mistakes cost time</li>
            <li>Warm up before ranked</li>
            <li>Common words repeat — pattern recognition &gt; raw speed</li>
            <li>Stay consistent, don&apos;t tilt</li>
          </ul>
        </div>

        {/* CTA */}
        <div className="pt-2 pb-8">
          <Link
            href="/"
            className="inline-block rounded-xl border border-accent/30 bg-accent/15 text-accent px-8 py-3 font-bold hover:bg-accent/25 hover:border-accent/50 hover:shadow-[0_0_24px_rgba(56,189,248,0.2)] transition-all duration-200"
          >
            Start racing
          </Link>
        </div>
      </div>
    </main>
  );
}
