import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import Link from "next/link";
import { SessionProvider } from "@/components/auth/SessionProvider";
import { UserMenu } from "@/components/auth/UserMenu";
import { UsernameGuard } from "@/components/auth/UsernameGuard";
import { FriendsButton } from "@/components/social/FriendsButton";
import { SocketProvider } from "@/hooks/useSocket";
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
                <Link href="/" className="nav-logo text-accent font-bold text-base">
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
              </div>
              <div className="flex items-center gap-4">
                <FriendsButton />
                <UserMenu />
              </div>
            </nav>
            <div className="relative z-10 flex-1 flex flex-col">
              {children}
            </div>
          </UsernameGuard>
          </SocketProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
