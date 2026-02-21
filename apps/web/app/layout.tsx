import type { Metadata, Viewport } from "next"; // trigger deploy
import { JetBrains_Mono } from "next/font/google";
import { SessionProvider } from "@/components/auth/SessionProvider";
import { ReportIssueButton } from "@/components/shared/ReportIssueButton";
import { UserMenu } from "@/components/auth/UserMenu";
import { UsernameGuard } from "@/components/auth/UsernameGuard";
import { FriendsButton } from "@/components/social/FriendsButton";
import { NavNotifications } from "@/components/social/NavNotifications";
import { MobileNav } from "@/components/MobileNav";
import { NavLinks } from "@/components/NavLinks";
import { NavLogo } from "@/components/NavLogo";
import { NotificationToast } from "@/components/social/NotificationToast";
import { PartyInviteToast } from "@/components/social/PartyInviteToast";
import { SocketProvider } from "@/hooks/useSocket";
import { SocialProvider } from "@/hooks/useSocial";
import { NotificationProvider } from "@/hooks/useNotifications";
import { PartyProvider } from "@/hooks/useParty";
import { DmProvider } from "@/hooks/useDm";
import { DirectMessageWindow } from "@/components/social/DirectMessageWindow";
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
          <DmProvider>
          <NotificationProvider>
          <UsernameGuard>
            <nav className="relative z-30 flex items-center justify-between px-4 sm:px-6 py-3">
              <div className="flex items-center gap-4 sm:gap-8">
                <MobileNav />
                <NavLogo />
                <NavLinks />
              </div>
              <div className="flex items-center gap-2 sm:gap-3">
                <NavNotifications />
                <FriendsButton />
                <UserMenu />
              </div>
            </nav>
            <div className="relative z-10 flex-1 flex flex-col min-h-0">
              {children}
            </div>
            <footer className="focus-fade relative z-10 flex items-center justify-center gap-3 py-3 text-[10px] text-muted/65">
              <span>TypeOff</span>
              <span>·</span>
              <ReportIssueButton />
            </footer>
            <NotificationToast />
            <PartyInviteToast />
            <DirectMessageWindow />
          </UsernameGuard>
          </NotificationProvider>
          </DmProvider>
          </PartyProvider>
          </SocialProvider>
          </SocketProvider>
          </CosmeticProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
