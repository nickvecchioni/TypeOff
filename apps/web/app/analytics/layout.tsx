import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Analytics — TypeOff",
  description: "Per-key heatmaps, bigram accuracy, and WPM trends",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
