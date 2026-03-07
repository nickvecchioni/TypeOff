import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "TypeOff",
  description: "Sharpen your typing speed with solo practice drills",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
