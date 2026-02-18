"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
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

const DEFAULT: ActiveCosmetics = {
  activeBadge: null,
  activeTitle: null,
  activeNameColor: null,
  activeNameEffect: null,
  activeCursorStyle: null,
  activeProfileBorder: null,
  activeTypingTheme: null,
};

const CosmeticContext = createContext<ActiveCosmetics>(DEFAULT);

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

  return (
    <CosmeticContext.Provider value={cosmetics}>
      {children}
    </CosmeticContext.Provider>
  );
}

export function useActiveCosmetics(): ActiveCosmetics {
  return useContext(CosmeticContext);
}
