import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Race — TypeOff",
  description: "Queue up for a ranked typing race with ELO matchmaking",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
