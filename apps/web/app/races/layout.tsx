import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Race Replay — TypeOff",
  description: "Watch a typing race replay keystroke by keystroke",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
