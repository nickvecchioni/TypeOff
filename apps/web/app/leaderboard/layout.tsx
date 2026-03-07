import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "TypeOff",
  description: "Global typing leaderboards ranked by PP, text, and universe",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
