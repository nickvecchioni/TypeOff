"use client";

import React from "react";
import { TITLE_TEXTS } from "@typeoff/shared";

interface CosmeticTitleProps {
  title: string | null | undefined;
}

/** Renders an active title below a username on profile */
export function CosmeticTitle({ title }: CosmeticTitleProps) {
  if (!title) return null;

  const text = TITLE_TEXTS[title] ?? title;

  return (
    <span className="text-xs text-amber-400/70 font-medium">
      {text}
    </span>
  );
}
