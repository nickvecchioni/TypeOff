import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "TypeOff",
  description: "Sign in to TypeOff to track your typing speed and compete in ranked races",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
