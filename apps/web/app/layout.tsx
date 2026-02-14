import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import Link from "next/link";
import { SessionProvider } from "@/components/auth/SessionProvider";
import { UserMenu } from "@/components/auth/UserMenu";
import { UsernameGuard } from "@/components/auth/UsernameGuard";
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
                <Link href="/" className="text-accent font-bold hover:text-accent/80 transition-colors">
                  TypeOff
                </Link>
                <Link
                  href="/leaderboard"
                  className="text-sm text-muted hover:text-text transition-colors"
                >
                  Leaderboard
                </Link>
              </div>
              <UserMenu />
            </nav>
            {children}
          </UsernameGuard>
        </SessionProvider>
      </body>
    </html>
  );
}
