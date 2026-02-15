import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import Link from "next/link";
import { SessionProvider } from "@/components/auth/SessionProvider";
import { UserMenu } from "@/components/auth/UserMenu";
import { UsernameGuard } from "@/components/auth/UsernameGuard";
import { AchievementToast } from "@/components/AchievementToast";
import "./globals.css";

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "TypeOff",
  description: "Race your friends in real-time typing battles",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${jetbrainsMono.variable} font-mono antialiased h-full flex flex-col`}>
        <SessionProvider>
          <UsernameGuard>
            <nav className="flex items-center justify-between px-6 py-4">
              <div className="flex items-center gap-6">
                <Link href="/" className="flex items-center gap-2 text-accent font-bold hover:text-accent/80 transition-colors">
                  <svg width="20" height="20" viewBox="0 0 32 32" fill="none" aria-hidden>
                    <path d="M8 7 L14 16 L8 25" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <line x1="16" y1="25" x2="24" y2="25" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round"/>
                  </svg>
                  TypeOff
                </Link>
                <Link
                  href="/leaderboard"
                  className="text-sm text-muted hover:text-text transition-colors"
                >
                  Leaderboard
                </Link>
                <Link
                  href="/ranks"
                  className="text-sm text-muted hover:text-text transition-colors"
                >
                  Ranks
                </Link>
                <Link
                  href="/practice"
                  className="text-sm text-muted hover:text-text transition-colors"
                >
                  Practice
                </Link>
                <Link
                  href="/lobby"
                  className="text-sm text-muted hover:text-text transition-colors"
                >
                  Lobby
                </Link>
                <Link
                  href="/tournament"
                  className="text-sm text-muted hover:text-text transition-colors"
                >
                  Tournament
                </Link>
                <Link
                  href="/spectate"
                  className="text-sm text-muted hover:text-text transition-colors"
                >
                  Watch
                </Link>
              </div>
              <UserMenu />
            </nav>
            {children}
            <AchievementToast />
          </UsernameGuard>
        </SessionProvider>
      </body>
    </html>
  );
}
