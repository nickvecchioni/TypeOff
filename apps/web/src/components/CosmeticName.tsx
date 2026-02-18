"use client";

import React from "react";
import { NAME_COLORS, NAME_EFFECT_CLASSES } from "@typeoff/shared";

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

  if (nameEffect && NAME_EFFECT_CLASSES[nameEffect]) {
    className = NAME_EFFECT_CLASSES[nameEffect];
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
