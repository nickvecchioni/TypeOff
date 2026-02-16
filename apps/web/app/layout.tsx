import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import Link from "next/link";
import { SessionProvider } from "@/components/auth/SessionProvider";
import { UserMenu } from "@/components/auth/UserMenu";
import { UsernameGuard } from "@/components/auth/UsernameGuard";
import { AuthNavLinks } from "@/components/auth/AuthNavLinks";
import { SocketProvider } from "@/hooks/useSocket";
import { AchievementToast } from "@/components/AchievementToast";
import { RankUpOverlay } from "@/components/RankUpOverlay";
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
        {/* Background atmosphere */}
        <div className="fixed inset-0 pointer-events-none" aria-hidden="true">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(167,139,250,0.06),transparent_60%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_40%_40%_at_50%_100%,rgba(167,139,250,0.03),transparent_60%)]" />
        </div>

        <SessionProvider>
          <SocketProvider>
          <UsernameGuard>
            <nav className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-surface-bright/50">
              <div className="flex items-center gap-6">
                <Link href="/" className="nav-logo flex items-center gap-2.5 text-accent font-bold">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 32 32"
                    fill="none"
                    aria-hidden
                    className="transition-[filter] duration-300"
                  >
                    <g transform="rotate(-20 16 16)">
                      <line x1="16" y1="5" x2="16" y2="27" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                      <line x1="11" y1="5" x2="21" y2="5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                      <line x1="11" y1="27" x2="21" y2="27" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                    </g>
                    <g transform="rotate(20 16 16)">
                      <line x1="16" y1="5" x2="16" y2="27" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                      <line x1="11" y1="5" x2="21" y2="5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                      <line x1="11" y1="27" x2="21" y2="27" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                    </g>
                  </svg>
                  <span className="nav-logo-text transition-[text-shadow] duration-300">
                    TypeOff
                  </span>
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
                <AuthNavLinks />
              </div>
              <UserMenu />
            </nav>
            <div className="relative z-10 flex-1 flex flex-col">
              {children}
            </div>
            <AchievementToast />
            <RankUpOverlay />
          </UsernameGuard>
          </SocketProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
