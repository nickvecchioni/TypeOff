"use client";

import React from "react";

interface CosmeticTitleProps {
  title: string | null | undefined;
}

/** Renders an active title below a username on profile */
export function CosmeticTitle({ title }: CosmeticTitleProps) {
  if (!title) return null;

  return (
    <span className="text-xs text-amber-400/70 font-medium">
      {getTitleText(title)}
    </span>
  );
}

const TITLE_TEXT: Record<string, string> = {
  s1_title_rookie: "Season Rookie",
  s1_title_grinder: "Grinder",
  s1_title_dedicated: "Dedicated",
  s1_title_typist: "Pro Typist",
  s1_title_swift: "Swift Fingers",
  s1_title_veteran: "Season Veteran",
  s1_title_elite: "Elite",
  s1_title_legend: "Legend",
  s1_title_master: "Season Master",
};

function getTitleText(titleId: string): string {
  return TITLE_TEXT[titleId] ?? titleId;
}
