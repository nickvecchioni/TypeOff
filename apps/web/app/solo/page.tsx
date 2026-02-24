import { PracticeArena } from "@/components/practice/PracticeArena";

export default async function SoloPage({
  searchParams,
}: {
  searchParams: Promise<{ drill?: string; bigrams?: string }>;
}) {
  const params = await searchParams;
  const initialDrill = params.drill === "true";
  const initialBigrams = params.bigrams?.split(",").filter(Boolean) ?? [];

  return (
    <main className="flex-1 flex flex-col items-center justify-center px-4 pb-16 gap-6">
      <PracticeArena
        initialDrill={initialDrill}
        initialBigrams={initialBigrams.length > 0 ? initialBigrams : undefined}
      />
    </main>
  );
}
