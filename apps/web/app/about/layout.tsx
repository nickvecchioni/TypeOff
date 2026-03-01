import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About — TypeOff",
  description: "Learn about TypeOff — game modes, the rank system, and features",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
