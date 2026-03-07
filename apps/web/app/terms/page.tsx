import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — TypeOff",
};

export default function TermsPage() {
  return (
    <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-10">
      <article className="max-w-3xl mx-auto space-y-6 text-sm text-muted leading-relaxed">
        <h1 className="text-2xl font-black text-text tracking-tight">Terms of Service</h1>
        <p className="text-muted/60">Last updated: March 7, 2026</p>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-text">1. Acceptance of Terms</h2>
          <p>
            By accessing or using TypeOff (&quot;the Service&quot;), you agree to be bound by these
            Terms of Service. If you do not agree, do not use the Service.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-text">2. Description of Service</h2>
          <p>
            TypeOff is a competitive typing game that offers ranked multiplayer races, solo practice,
            leaderboards, analytics, cosmetics, and optional Pro subscriptions. The Service is
            provided &quot;as is&quot; and may be updated, modified, or discontinued at any time.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-text">3. Accounts</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>You must sign in with a valid Google account to use ranked features.</li>
            <li>You are responsible for all activity under your account.</li>
            <li>You may not share, sell, or transfer your account.</li>
            <li>
              Usernames must not be offensive, impersonate others, or violate any applicable laws.
            </li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-text">4. Conduct</h2>
          <p>You agree not to:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Use bots, scripts, macros, or any automation to gain an unfair advantage</li>
            <li>Exploit bugs or vulnerabilities instead of reporting them</li>
            <li>Harass, threaten, or abuse other users via chat, direct messages, or any other means</li>
            <li>Attempt to manipulate your ELO rating, match results, or leaderboard rankings</li>
            <li>Circumvent bans, suspensions, or other enforcement actions</li>
          </ul>
          <p>
            Violations may result in warnings, temporary suspensions, or permanent bans at our
            discretion.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-text">5. Pro Subscriptions</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Pro subscriptions are billed monthly or yearly via Stripe.</li>
            <li>You may cancel at any time; access continues until the end of the billing period.</li>
            <li>Refunds are handled on a case-by-case basis.</li>
            <li>
              We reserve the right to change Pro pricing or features with reasonable notice.
            </li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-text">6. Intellectual Property</h2>
          <p>
            All content, design, code, and branding of TypeOff are owned by TypeOff or its
            licensors. You may not copy, modify, or redistribute any part of the Service without
            prior written permission.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-text">7. Disclaimer of Warranties</h2>
          <p>
            The Service is provided &quot;as is&quot; without warranties of any kind, express or
            implied. We do not guarantee uninterrupted access, error-free operation, or that your
            data will never be lost.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-text">8. Limitation of Liability</h2>
          <p>
            To the fullest extent permitted by law, TypeOff shall not be liable for any indirect,
            incidental, special, consequential, or punitive damages arising from your use of the
            Service.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-text">9. Changes to Terms</h2>
          <p>
            We may update these Terms from time to time. Continued use of the Service after changes
            constitutes acceptance of the revised Terms.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-text">10. Contact</h2>
          <p>
            Questions about these Terms can be sent to{" "}
            <a href="mailto:support@typeoff.gg" className="text-accent hover:underline">
              support@typeoff.gg
            </a>
            .
          </p>
        </section>
      </article>
    </main>
  );
}
