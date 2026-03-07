import { RaceArena } from "@/components/race/RaceArena";

export default function Home() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center px-4 py-6 gap-6 min-h-0 overflow-y-auto animate-fade-in">
      <RaceArena />
    </main>
  );
}
