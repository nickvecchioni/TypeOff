import { RaceArena } from "@/components/race/RaceArena";
import { ChallengesBanner } from "@/components/ChallengesBanner";

export default function Home() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center px-4 pb-16 gap-6">
      <ChallengesBanner />
      <RaceArena />
    </main>
  );
}
