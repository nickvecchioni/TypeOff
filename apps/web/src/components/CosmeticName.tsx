"use client";

import React from "react";

interface CosmeticNameProps {
  nameColor: string | null | undefined;
  nameEffect: string | null | undefined;
  children: React.ReactNode;
}

/** Wraps a username with active name color and/or effect */
export function CosmeticName({
  nameColor,
  nameEffect,
  children,
}: CosmeticNameProps) {
  const style: React.CSSProperties = {};
  let className = "";

  if (nameColor && NAME_COLORS[nameColor]) {
    style.color = NAME_COLORS[nameColor];
  }

  if (nameEffect && EFFECT_CLASSES[nameEffect]) {
    className = EFFECT_CLASSES[nameEffect];
  }

  if (!nameColor && !nameEffect) {
    return <>{children}</>;
  }

  return (
    <span style={style} className={className}>
      {children}
    </span>
  );
}

const NAME_COLORS: Record<string, string> = {
  s1_color_sky: "#7dd3fc",
  s1_color_lime: "#a3e635",
  s1_color_violet: "#a78bfa",
  s1_color_rose: "#fb7185",
  s1_color_amber: "#fbbf24",
  s1_color_emerald: "#34d399",
  s1_color_cyan: "#22d3ee",
  s1_color_gold: "#facc15",
};

const EFFECT_CLASSES: Record<string, string> = {
  s1_effect_glow: "glow-subtle",
  s1_effect_pulse: "glow-pulse",
  s1_effect_rainbow: "glow-rainbow",
};
