"use client";

export function ClanTag({ tag }: { tag: string | null | undefined }) {
  if (!tag) return null;
  return (
    <span className="text-[10px] font-bold text-accent/50 shrink-0">[{tag}]</span>
  );
}
