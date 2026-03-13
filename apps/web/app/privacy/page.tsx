import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | TypeOff",
};

export default function PrivacyPage() {
  return (
    <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-10">
      <article className="max-w-3xl mx-auto space-y-6 text-sm text-muted leading-relaxed">
        <div className="animate-slide-up">
          <h1 className="text-2xl font-black text-text tracking-tight">Privacy Policy</h1>
          <p className="text-muted/60 mt-2">Last updated: March 7, 2026</p>
        </div>

        <section className="space-y-2 animate-slide-up" style={{ animationDelay: "80ms" }}>
          <h2 className="text-base font-bold text-text">1. Information We Collect</h2>
          <p>
            When you create an account via Google OAuth, we receive your name, email address, and
            profile picture from Google. We also collect gameplay data including typing speed,
            accuracy, race results, and replay data to provide leaderboards, analytics, and
            matchmaking.
          </p>
        </section>

        <section className="space-y-2 animate-slide-up" style={{ animationDelay: "140ms" }}>
          <h2 className="text-base font-bold text-text">2. How We Use Your Information</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Provide and improve the TypeOff service</li>
            <li>Match you with opponents of similar skill via ELO-based matchmaking</li>
            <li>Display your stats, rank, and profile to other users</li>
            <li>Process Pro subscription payments via Stripe</li>
            <li>Send in-app notifications (friend requests, race invites, achievements)</li>
            <li>Detect and prevent abuse or cheating</li>
          </ul>
        </section>

        <section className="space-y-2 animate-slide-up" style={{ animationDelay: "200ms" }}>
          <h2 className="text-base font-bold text-text">3. Cookies and Advertising</h2>
          <p>
            We use essential cookies for authentication and session management. Third-party
            advertising partners, including Google AdSense, may use cookies and similar technologies
            to serve ads based on your prior visits to this or other websites. Google&apos;s use of
            advertising cookies enables it and its partners to serve ads based on your visit to
            TypeOff and/or other sites on the Internet.
          </p>
          <p>
            You may opt out of personalized advertising by visiting{" "}
            <a
              href="https://www.google.com/settings/ads"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline"
            >
              Google Ads Settings
            </a>{" "}
            or{" "}
            <a
              href="https://www.aboutads.info/choices/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline"
            >
              www.aboutads.info
            </a>
            .
          </p>
        </section>

        <section className="space-y-2 animate-slide-up" style={{ animationDelay: "260ms" }}>
          <h2 className="text-base font-bold text-text">4. Data Sharing</h2>
          <p>
            We do not sell your personal information. We share data only with the following
            third-party services that are necessary to operate TypeOff:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Google</strong>: OAuth authentication and AdSense advertising</li>
            <li><strong>Stripe</strong>: payment processing for Pro subscriptions</li>
            <li><strong>Neon</strong>: database hosting</li>
          </ul>
        </section>

        <section className="space-y-2 animate-slide-up" style={{ animationDelay: "320ms" }}>
          <h2 className="text-base font-bold text-text">5. Data Retention</h2>
          <p>
            We retain your account and gameplay data for as long as your account is active. You may
            request deletion of your account and associated data by contacting us.
          </p>
        </section>

        <section className="space-y-2 animate-slide-up" style={{ animationDelay: "380ms" }}>
          <h2 className="text-base font-bold text-text">6. Children&apos;s Privacy</h2>
          <p>
            TypeOff is not directed at children under 13. We do not knowingly collect personal
            information from children under 13. If you believe we have collected such information,
            please contact us so we can delete it.
          </p>
        </section>

        <section className="space-y-2 animate-slide-up" style={{ animationDelay: "440ms" }}>
          <h2 className="text-base font-bold text-text">7. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. We will notify users of material
            changes by posting a notice on the site.
          </p>
        </section>

        <section className="space-y-2 animate-slide-up" style={{ animationDelay: "500ms" }}>
          <h2 className="text-base font-bold text-text">8. Contact</h2>
          <p>
            If you have questions about this Privacy Policy, you can reach us at{" "}
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
