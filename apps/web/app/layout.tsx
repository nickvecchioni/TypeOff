import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import Link from "next/link";
import { SessionProvider } from "@/components/auth/SessionProvider";
import { UserMenu } from "@/components/auth/UserMenu";
import { UsernameGuard } from "@/components/auth/UsernameGuard";
import { SocketProvider } from "@/hooks/useSocket";
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
        <SessionProvider>
          <SocketProvider>
          <UsernameGuard>
            <nav className="relative z-10 flex items-center justify-between px-6 py-3 border-b border-white/[0.04]">
              <div className="flex items-center gap-5">
                <Link href="/" className="nav-logo flex items-center gap-2 text-accent font-bold text-sm">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 32 32"
                    fill="none"
                    aria-hidden
                    className="transition-[filter] duration-300"
                  >
                    <line x1="11" y1="25" x2="19" y2="5" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                    <line x1="15" y1="27" x2="23" y2="7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.55"/>
                  </svg>
                  <span className="nav-logo-text transition-[text-shadow] duration-300">
                    TypeOff
                  </span>
                </Link>
                <Link
                  href="/leaderboard"
                  className="text-xs text-muted hover:text-text transition-colors"
                >
                  Leaderboard
                </Link>
                <Link
                  href="/ranks"
                  className="text-xs text-muted hover:text-text transition-colors"
                >
                  Ranks
                </Link>
              </div>
              <UserMenu />
            </nav>
            <div className="relative z-10 flex-1 flex flex-col">
              {children}
            </div>
            <RankUpOverlay />
          </UsernameGuard>
          </SocketProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
