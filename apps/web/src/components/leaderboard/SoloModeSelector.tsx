"use client";

import { useRouter, useSearchParams } from "next/navigation";

const TIME_OPTIONS = [15, 30, 60, 120];
const WORD_OPTIONS = [10, 25, 50, 100];
const CATEGORIES = ["words", "mixed", "quotes", "code"] as const;
const DIFFICULTIES = ["easy", "medium", "hard"] as const;

export function SoloModeSelector() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const mode = searchParams.get("mode") === "wordcount" ? "wordcount" : "timed";
  const duration = Number(searchParams.get("duration")) || (mode === "timed" ? 15 : 25);
  const category = (CATEGORIES as readonly string[]).includes(searchParams.get("category") ?? "") ? searchParams.get("category")! : "words";
  const difficulty = (DIFFICULTIES as readonly string[]).includes(searchParams.get("difficulty") ?? "") ? searchParams.get("difficulty")! : "easy";
  const durations = mode === "timed" ? TIME_OPTIONS : WORD_OPTIONS;
  const isFixed = category === "quotes" || category === "code";

  function update(updates: Partial<{ mode: string; duration: number; category: string; difficulty: string }>) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", "solo");
    if (updates.mode !== undefined) {
      params.set("mode", updates.mode);
      params.set("duration", String(updates.mode === "timed" ? 15 : 25));
    }
    if (updates.duration !== undefined) params.set("duration", String(updates.duration));
    if (updates.category !== undefined) params.set("category", updates.category);
    if (updates.difficulty !== undefined) params.set("difficulty", updates.difficulty);
    router.replace(`?${params.toString()}`);
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Row 1: mode + duration */}
      <div className={`flex items-center justify-center gap-6 transition-opacity ${isFixed ? "opacity-20 pointer-events-none" : ""}`}>
        <div className="flex items-center gap-1">
          <Chip active={mode === "timed"} onClick={() => update({ mode: "timed" })}>time</Chip>
          <Chip active={mode === "wordcount"} onClick={() => update({ mode: "wordcount" })}>words</Chip>
        </div>
        <div className="w-px h-4 bg-white/[0.08]" />
        <div className="flex items-center gap-1">
          {durations.map((d) => (
            <Chip key={d} active={duration === d} onClick={() => update({ duration: d })}>
              {d}
            </Chip>
          ))}
        </div>
      </div>

      {/* Row 2: category + difficulty */}
      <div className="flex items-center justify-center gap-6">
        <div className="flex items-center gap-1">
          {CATEGORIES.map((c) => (
            <Chip key={c} active={category === c} onClick={() => update({ category: c })}>
              {c}
            </Chip>
          ))}
        </div>
        <div className="w-px h-4 bg-white/[0.08]" />
        <div className={`flex items-center gap-1 transition-opacity ${isFixed ? "opacity-20 pointer-events-none" : ""}`}>
          {DIFFICULTIES.map((d) => (
            <Chip key={d} active={difficulty === d} onClick={() => update({ difficulty: d })}>
              {d}
            </Chip>
          ))}
        </div>
      </div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
        active
          ? "bg-accent/15 text-accent ring-1 ring-accent/20"
          : "text-muted/60 hover:text-text hover:bg-white/[0.04]"
      }`}
    >
      {children}
    </button>
  );
}
