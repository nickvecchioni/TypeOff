import { Suspense } from "react";
import { SpectatePageClient } from "@/components/spectate/SpectatePageClient";

export const metadata = {
  title: "TypeOff",
  description: "Watch live typing races in real-time",
};

export default function SpectatePage() {
  return (
    <main className="flex-1 flex flex-col px-4 py-8 max-w-6xl mx-auto w-full animate-fade-in">
      <Suspense>
        <SpectatePageClient />
      </Suspense>
    </main>
  );
}
