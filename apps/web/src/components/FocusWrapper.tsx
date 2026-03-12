"use client";

import { useFocusActive } from "@/contexts/SettingsContext";

export function FocusWrapper({ children }: { children: React.ReactNode }) {
  const [focusActive] = useFocusActive();
  return (
    <div className={`flex flex-col min-h-screen${focusActive ? " focus-active" : ""}`}>
      {children}
    </div>
  );
}
