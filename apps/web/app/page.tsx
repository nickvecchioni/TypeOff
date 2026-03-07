import { RaceArena } from "@/components/race/RaceArena";

export default function Home() {
  return (
    <main className="flex-1 flex flex-col items-center px-4 gap-6 min-h-0 overflow-hidden animate-fade-in">
      <RaceArena />
    </main>
  );
}
