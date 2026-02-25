import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cosmetics — TypeOff",
  description: "Browse and equip badges, titles, name effects, themes, and more",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
