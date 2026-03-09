"use client";

import { useFocusActive } from "@/contexts/SettingsContext";

export function FocusWrapper({ children }: { children: React.ReactNode }) {
  const [focusActive] = useFocusActive();
  return (
    <div className={`flex flex-col flex-1 min-h-0${focusActive ? " focus-active" : ""}`}>
      {children}
    </div>
  );
}
