import { TypingTest } from "@/components/typing/TypingTest";
import { SoloStats } from "@/components/typing/SoloStats";

export default function SoloPage() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center px-4 pb-16 gap-12">
      <TypingTest />
      <SoloStats />
    </main>
  );
}
