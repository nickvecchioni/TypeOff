import type { Metadata, Viewport } from "next"; // trigger deploy
import { JetBrains_Mono } from "next/font/google";
import { SessionProvider } from "@/components/auth/SessionProvider";
import Link from "next/link";
import { ReportIssueButton } from "@/components/shared/ReportIssueButton";
import { UserMenu } from "@/components/auth/UserMenu";
import { UsernameGuard } from "@/components/auth/UsernameGuard";
import { FriendsButton } from "@/components/social/FriendsButton";
import { AboutButton } from "@/components/AboutButton";
import { SettingsButton } from "@/components/SettingsButton";
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
import { SettingsProvider } from "@/contexts/SettingsContext";
import { FocusWrapper } from "@/components/FocusWrapper";
import "./globals.css";

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

const APP_URL = "https://typeoff.gg";
const TITLE = "TypeOff";
const DESCRIPTION =
  "Race real players in ELO-matched typing battles. Climb from Bronze to Grandmaster.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  metadataBase: new URL(APP_URL),
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: APP_URL,
    siteName: "TypeOff",
    type: "website",
    images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    site: "@typeoffgg",
  },
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
      <head>
        {process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID && (
          <script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID}`}
            crossOrigin="anonymous"
          />
        )}
      </head>
      <body className={`${jetbrainsMono.variable} font-mono antialiased min-h-screen flex flex-col`}>
        <SessionProvider>
          <SettingsProvider>
          <CosmeticProvider>
          <SocketProvider>
          <SocialProvider>
          <PartyProvider>
          <DmProvider>
          <NotificationProvider>
          <UsernameGuard>
            <FocusWrapper>
            <nav className="focus-fade relative z-30 flex items-center justify-between px-4 sm:px-6 py-3">
              <div className="flex items-center gap-4 sm:gap-8">
                <MobileNav />
                <NavLogo />
                <NavLinks />
              </div>
              <div className="flex items-center gap-2 sm:gap-3">
                <AboutButton />
                <NavNotifications />
                <FriendsButton />
                <SettingsButton />
                <UserMenu />
              </div>
            </nav>
            <div className="relative z-10 flex-1 flex flex-col">
              {children}
            </div>
            <footer className="focus-fade relative z-10 flex items-center justify-center gap-3 py-3 text-sm text-muted/80">
              <Link href="/privacy" className="hover:text-muted transition-colors">Privacy</Link>
              <span>·</span>
              <Link href="/terms" className="hover:text-muted transition-colors">Terms</Link>
              <span>·</span>
              <ReportIssueButton />
            </footer>
            </FocusWrapper>
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
          </SettingsProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
