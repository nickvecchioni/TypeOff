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
}

const SettingsContext = createContext<SettingsContextValue>({
  settings: DEFAULT_SETTINGS,
  updateSettings: () => {},
});

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);

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

  return (
    <SettingsContext.Provider value={{ settings, updateSettings }}>
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
