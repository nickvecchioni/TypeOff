import { RaceArena } from "@/components/race/RaceArena";
import Link from "next/link";

export default function RacePage() {
  return (
    <main className="flex-1 overflow-y-auto min-h-0 animate-fade-in">
      <div className="min-h-full flex flex-col items-center px-4 py-4">
        <div className="flex-1" />
        <div className="flex items-center gap-6 mb-12">
          <Link href="/" className="text-3xl font-bold text-accent hover:opacity-80 transition-opacity">
            TypeOff
          </Link>
          <span className="text-muted text-sm bg-surface px-3 py-1 rounded-lg">
            Race
          </span>
        </div>
        <RaceArena />
        <div className="flex-1" />
      </div>
    </main>
  );
}
