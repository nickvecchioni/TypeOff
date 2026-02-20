"use client";

import { useState } from "react";

export function ClanSectionCollapse({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(true);

  return (
    <section>
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full text-left text-xs font-bold text-muted/60 uppercase tracking-wider mb-3 flex items-center gap-3 group cursor-pointer"
      >
        <span className="flex items-center gap-2">
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="currentColor"
            className={`transition-transform ${collapsed ? "" : "rotate-90"}`}
          >
            <path d="M8 5v14l11-7z" />
          </svg>
          Clan
        </span>
        <span className="flex-1 h-px bg-white/[0.03]" />
      </button>
      {!collapsed && children}
    </section>
  );
}
