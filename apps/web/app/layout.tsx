import type { Metadata, Viewport } from "next"; // trigger deploy
import { JetBrains_Mono } from "next/font/google";
import Link from "next/link";
import { SessionProvider } from "@/components/auth/SessionProvider";
import { ReportIssueButton } from "@/components/shared/ReportIssueButton";
import { UserMenu } from "@/components/auth/UserMenu";
import { UsernameGuard } from "@/components/auth/UsernameGuard";
import { FriendsButton } from "@/components/social/FriendsButton";
import { NavNotifications } from "@/components/social/NavNotifications";
import { MobileNav } from "@/components/MobileNav";
import { NavLinks } from "@/components/NavLinks";
import { NotificationToast } from "@/components/social/NotificationToast";
import { PartyInviteToast } from "@/components/social/PartyInviteToast";
import { SocketProvider } from "@/hooks/useSocket";
import { SocialProvider } from "@/hooks/useSocial";
import { NotificationProvider } from "@/hooks/useNotifications";
import { PartyProvider } from "@/hooks/useParty";
import { CosmeticProvider } from "@/contexts/CosmeticContext";
import "./globals.css";

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "TypeOff — Ranked Competitive Typing",
  description: "Race real players in ELO-matched typing battles. Climb from Bronze to Grandmaster.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
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
          <PartyProvider>
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
                <NavLinks />
              </div>
              <div className="flex items-center gap-2 sm:gap-3">
                <UserMenu />
                <ReportIssueButton />
                <NavNotifications />
                <FriendsButton />
              </div>
            </nav>
            <div className="relative z-10 flex-1 flex flex-col min-h-0">
              {children}
            </div>
            <footer className="focus-fade relative z-10 flex items-center justify-center gap-3 py-3 text-[10px] text-muted/30">
              <span>TypeOff</span>
            </footer>
            <NotificationToast />
            <PartyInviteToast />
          </UsernameGuard>
          </NotificationProvider>
          </PartyProvider>
          </SocialProvider>
          </SocketProvider>
          </CosmeticProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
