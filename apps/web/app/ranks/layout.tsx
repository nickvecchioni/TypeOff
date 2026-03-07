import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ranks — TypeOff",
  description: "Learn about the ranking system from Bronze to Grandmaster",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
