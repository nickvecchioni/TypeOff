import Link from "next/link";

const RANK_TIERS = [
  {
    name: "Master",
    range: "1800+",
    color: "border-rank-master text-rank-master",
    flavor: "The apex. You type faster than most people think.",
  },
  {
    name: "Diamond",
    range: "1500 – 1799",
    color: "border-rank-diamond text-rank-diamond",
    flavor: "Elite speed and consistency. Competitors fear your lobby.",
  },
  {
    name: "Platinum",
    range: "1300 – 1499",
    color: "border-rank-platinum text-rank-platinum",
    flavor: "Serious skill. You're outpacing the majority.",
  },
  {
    name: "Gold",
    range: "1100 – 1299",
    color: "border-rank-gold text-rank-gold",
    flavor: "Above average and climbing. Keep the momentum.",
  },
  {
    name: "Silver",
    range: "900 – 1099",
    color: "border-rank-silver text-rank-silver",
    flavor: "Solid foundation. Your fingers are warming up.",
  },
  {
    name: "Bronze",
    range: "0 – 899",
    color: "border-rank-bronze text-rank-bronze",
    flavor: "Everyone starts here. Every race makes you faster.",
  },
];

export default function RanksPage() {
  return (
    <main className="flex-1 overflow-y-auto px-6 py-8">
      <div className="max-w-2xl mx-auto space-y-10">
        {/* Hero */}
        <div>
          <h1 className="text-2xl font-bold text-accent">Rank System</h1>
          <p className="text-muted mt-2">
            Every race changes your ELO. Climb from Bronze to Master.
          </p>
        </div>

        {/* Rank Tier Cards */}
        <div className="space-y-3">
          {RANK_TIERS.map((tier) => (
            <div
              key={tier.name}
              className={`bg-surface rounded-lg p-4 border-l-4 ${tier.color.split(" ")[0]}`}
            >
              <div className="flex items-baseline justify-between">
                <span className={`text-lg font-bold ${tier.color.split(" ")[1]}`}>
                  {tier.name}
                </span>
                <span className="text-muted tabular-nums text-sm">
                  {tier.range}
                </span>
              </div>
              <p className="text-sm text-text/70 mt-1">{tier.flavor}</p>
            </div>
          ))}
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
            adaptive bots. Your average speed determines your starting ELO.
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
            <li>Accuracy is everything — one mistake ends the race</li>
            <li>Warm up before ranked</li>
            <li>Common words repeat — pattern recognition &gt; raw speed</li>
            <li>Stay consistent, don&apos;t tilt</li>
          </ul>
        </div>

        {/* CTA */}
        <div className="pt-2 pb-8">
          <Link
            href="/"
            className="inline-block rounded-lg bg-accent/20 text-accent px-6 py-2 hover:bg-accent/30 transition-colors font-bold"
          >
            Start racing
          </Link>
        </div>
      </div>
    </main>
  );
}
