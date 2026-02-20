import type { Metadata } from "next"; // trigger deploy
import { JetBrains_Mono } from "next/font/google";
import Link from "next/link";
import { SessionProvider } from "@/components/auth/SessionProvider";
import { UserMenu } from "@/components/auth/UserMenu";
import { UsernameGuard } from "@/components/auth/UsernameGuard";
import { FriendsButton } from "@/components/social/FriendsButton";
import { NavNotifications } from "@/components/social/NavNotifications";
import { MobileNav } from "@/components/MobileNav";
import { NavLinks } from "@/components/NavLinks";
import { NotificationToast } from "@/components/social/NotificationToast";
import { SocketProvider } from "@/hooks/useSocket";
import { SocialProvider } from "@/hooks/useSocial";
import { ChatProvider } from "@/hooks/useChat";
import { NotificationProvider } from "@/hooks/useNotifications";
import { PartyProvider } from "@/hooks/useParty";
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
                <NavNotifications />
                <FriendsButton />
              </div>
            </nav>
            <div className="relative z-10 flex-1 flex flex-col min-h-0">
              {children}
            </div>
            <footer className="focus-fade relative z-10 flex items-center justify-center gap-3 py-3 text-[10px] text-muted/30">
              <span>TypeOff</span>
              <span>·</span>
              <Link href="/bug-report" className="hover:text-muted/60 transition-colors">
                Report a Bug
              </Link>
            </footer>
            <NotificationToast />
          </UsernameGuard>
          </NotificationProvider>
          </PartyProvider>
          </ChatProvider>
          </SocialProvider>
          </SocketProvider>
          </CosmeticProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
