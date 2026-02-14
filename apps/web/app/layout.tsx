import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import { SessionProvider } from "@/components/auth/SessionProvider";
import { UserMenu } from "@/components/auth/UserMenu";
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
          <nav className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-6">
              <span className="text-accent font-bold">
                TypeOff
              </span>
            </div>
            <UserMenu />
          </nav>
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}
