import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "TypeOff",
  description: "Report a bug or issue with TypeOff",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
