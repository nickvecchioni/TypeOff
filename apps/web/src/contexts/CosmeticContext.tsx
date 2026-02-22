"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";

interface ActiveCosmetics {
  activeBadge: string | null;
  activeTitle: string | null;
  activeNameColor: string | null;
  activeNameEffect: string | null;
  activeCursorStyle: string | null;
  activeProfileBorder: string | null;
  activeTypingTheme: string | null;
}

interface CosmeticContextValue {
  cosmetics: ActiveCosmetics;
  updateCosmetics: (c: ActiveCosmetics) => void;
}

const DEFAULT: ActiveCosmetics = {
  activeBadge: null,
  activeTitle: null,
  activeNameColor: null,
  activeNameEffect: null,
  activeCursorStyle: null,
  activeProfileBorder: null,
  activeTypingTheme: null,
};

const CosmeticContext = createContext<CosmeticContextValue>({
  cosmetics: DEFAULT,
  updateCosmetics: () => {},
});

export function CosmeticProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const [cosmetics, setCosmetics] = useState<ActiveCosmetics>(DEFAULT);

  useEffect(() => {
    if (!session?.user?.id) {
      setCosmetics(DEFAULT);
      return;
    }

    fetch("/api/cosmetics")
      .then((r) => r.json())
      .then((data) => {
        if (data.active) {
          setCosmetics({
            activeBadge: data.active.activeBadge ?? null,
            activeTitle: data.active.activeTitle ?? null,
            activeNameColor: data.active.activeNameColor ?? null,
            activeNameEffect: data.active.activeNameEffect ?? null,
            activeCursorStyle: data.active.activeCursorStyle ?? null,
            activeProfileBorder: data.active.activeProfileBorder ?? null,
            activeTypingTheme: data.active.activeTypingTheme ?? null,
          });
        }
      })
      .catch(() => {});
  }, [session?.user?.id]);

  const updateCosmetics = useCallback((c: ActiveCosmetics) => {
    setCosmetics(c);
  }, []);

  return (
    <CosmeticContext.Provider value={{ cosmetics, updateCosmetics }}>
      {children}
    </CosmeticContext.Provider>
  );
}

/** Read active cosmetics (e.g. for nav bar, race results) */
export function useActiveCosmetics(): ActiveCosmetics {
  return useContext(CosmeticContext).cosmetics;
}

/** Push a cosmetics update into the global context (e.g. after equipping) */
export function useUpdateCosmetics(): (c: ActiveCosmetics) => void {
  return useContext(CosmeticContext).updateCosmetics;
}
