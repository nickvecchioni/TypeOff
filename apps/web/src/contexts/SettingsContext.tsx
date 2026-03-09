"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";

export interface UserSettings {
  smoothCaret: boolean;
  showLiveWpm: boolean;
  showLiveAccuracy: boolean;
  focusMode: boolean;
  fontSize: "small" | "medium" | "large";
}

export const DEFAULT_SETTINGS: UserSettings = {
  smoothCaret: true,
  showLiveWpm: true,
  showLiveAccuracy: false,
  focusMode: true,
  fontSize: "medium",
};

interface SettingsContextValue {
  settings: UserSettings;
  updateSettings: (next: UserSettings) => void;
  focusActive: boolean;
  setFocusActive: (active: boolean) => void;
}

const SettingsContext = createContext<SettingsContextValue>({
  settings: DEFAULT_SETTINGS,
  updateSettings: () => {},
  focusActive: false,
  setFocusActive: () => {},
});

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [focusActive, setFocusActive] = useState(false);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/preferences")
      .then((r) => r.json())
      .then((data) => {
        if (data.settings) {
          setSettings((prev) => ({ ...prev, ...data.settings }));
        }
      })
      .catch(() => {});
  }, [status]);

  const updateSettings = useCallback((next: UserSettings) => {
    setSettings(next);
  }, []);

  const setFocusActiveCb = useCallback((active: boolean) => {
    setFocusActive(active);
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, focusActive, setFocusActive: setFocusActiveCb }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): UserSettings {
  return useContext(SettingsContext).settings;
}

export function useUpdateSettings(): (next: UserSettings) => void {
  return useContext(SettingsContext).updateSettings;
}

export function useFocusActive(): [boolean, (active: boolean) => void] {
  const ctx = useContext(SettingsContext);
  return [ctx.focusActive, ctx.setFocusActive];
}
