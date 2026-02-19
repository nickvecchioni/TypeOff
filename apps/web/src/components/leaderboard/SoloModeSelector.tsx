"use client";

import { useRouter, useSearchParams } from "next/navigation";

const TIME_OPTIONS = [15, 30, 60, 120];
const WORD_OPTIONS = [10, 25, 50, 100];

export function SoloModeSelector() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode") === "wordcount" ? "wordcount" : "timed";
  const duration = Number(searchParams.get("duration")) || (mode === "timed" ? 60 : 25);
  const durations = mode === "timed" ? TIME_OPTIONS : WORD_OPTIONS;

  function update(newMode: string, newDuration: number) {
    router.replace(`?tab=solo&mode=${newMode}&duration=${newDuration}`);
  }

  return (
    <div className="flex items-center justify-center gap-6">
      <div className="flex items-center gap-1">
        <Chip
          active={mode === "timed"}
          onClick={() => update("timed", TIME_OPTIONS[0])}
        >
          time
        </Chip>
        <Chip
          active={mode === "wordcount"}
          onClick={() => update("wordcount", WORD_OPTIONS[0])}
        >
          words
        </Chip>
      </div>

      <div className="w-px h-4 bg-white/[0.08]" />

      <div className="flex items-center gap-1">
        {durations.map((d) => (
          <Chip key={d} active={duration === d} onClick={() => update(mode, d)}>
            {d}
          </Chip>
        ))}
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
