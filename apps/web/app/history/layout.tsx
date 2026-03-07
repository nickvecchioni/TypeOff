import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "TypeOff",
  description: "Browse and review your past typing race results",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
