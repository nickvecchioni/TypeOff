"use client";

import { useRouter, useSearchParams } from "next/navigation";

const UNIVERSES = [
  { value: "all", label: "All" },
  { value: "words", label: "Words" },
  { value: "quotes", label: "Quotes" },
  { value: "code", label: "Code" },
  { value: "special", label: "Special" },
] as const;

export function UniverseSelector() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const active = searchParams.get("universe") ?? "all";

  function select(universe: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (universe === "all") {
      params.delete("universe");
    } else {
      params.set("universe", universe);
    }
    router.replace(`?${params.toString()}`);
  }

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {UNIVERSES.map((u) => (
        <button
          key={u.value}
          onClick={() => select(u.value)}
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
            active === u.value
              ? "bg-accent/15 text-accent ring-1 ring-accent/20"
              : "text-muted/60 hover:text-text hover:bg-white/[0.04]"
          }`}
        >
          {u.label}
        </button>
      ))}
    </div>
  );
}
