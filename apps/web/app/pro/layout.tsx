import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "TypeOff",
  description: "Upgrade to TypeOff Pro for advanced analytics, adaptive practice, and exclusive cosmetics",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
