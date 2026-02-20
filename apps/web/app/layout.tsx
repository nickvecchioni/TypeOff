import type { Metadata } from "next"; // trigger deploy
import { JetBrains_Mono } from "next/font/google";
import Link from "next/link";
import { SessionProvider } from "@/components/auth/SessionProvider";
import { UserMenu } from "@/components/auth/UserMenu";
import { UsernameGuard } from "@/components/auth/UsernameGuard";
import { FriendsButton } from "@/components/social/FriendsButton";
import { NavNotifications } from "@/components/social/NavNotifications";
import { MobileNav } from "@/components/MobileNav";
import { NotificationToast } from "@/components/social/NotificationToast";
import { SocketProvider } from "@/hooks/useSocket";
import { SocialProvider } from "@/hooks/useSocial";
import { ChatProvider } from "@/hooks/useChat";
import { NotificationProvider } from "@/hooks/useNotifications";
import { CosmeticProvider } from "@/contexts/CosmeticContext";
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
          <CosmeticProvider>
          <SocketProvider>
          <SocialProvider>
          <ChatProvider>
          <NotificationProvider>
          <UsernameGuard>
            <nav className="relative z-30 flex items-center justify-between px-4 sm:px-6 py-3">
              <div className="flex items-center gap-4 sm:gap-8">
                <MobileNav />
                <Link href="/" className="nav-logo text-accent font-bold text-base">
                  <span className="nav-logo-text transition-[text-shadow] duration-300">
                    TypeOff
                  </span>
                </Link>
                <Link
                  href="/leaderboard"
                  className="hidden md:inline text-sm text-muted hover:text-text transition-colors"
                >
                  Leaderboard
                </Link>
                <Link
                  href="/ranks"
                  className="hidden md:inline text-sm text-muted hover:text-text transition-colors"
                >
                  Ranks
                </Link>
                <Link
                  href="/solo"
                  className="hidden md:inline text-sm text-muted hover:text-text transition-colors"
                >
                  Solo
                </Link>
                <Link
                  href="/spectate"
                  className="hidden md:inline text-sm text-muted hover:text-text transition-colors"
                >
                  Spectate
                </Link>
                <Link
                  href="/clans"
                  className="hidden md:inline text-sm text-muted hover:text-text transition-colors"
                >
                  Clans
                </Link>
                <Link
                  href="/pro"
                  className="hidden md:inline text-sm text-amber-400/70 hover:text-amber-400 transition-colors"
                >
                  Pro
                </Link>
              </div>
              <div className="flex items-center gap-2 sm:gap-3">
                <UserMenu />
                <NavNotifications />
                <FriendsButton />
              </div>
            </nav>
            <div className="relative z-10 flex-1 flex flex-col min-h-0">
              {children}
            </div>
            <NotificationToast />
          </UsernameGuard>
          </NotificationProvider>
          </ChatProvider>
          </SocialProvider>
          </SocketProvider>
          </CosmeticProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
