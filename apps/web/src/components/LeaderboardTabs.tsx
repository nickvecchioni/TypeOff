"use client";

import React, { useState } from "react";
import { SoloLeaderboard } from "./SoloLeaderboard";

const TABS = ["Race", "Solo"] as const;

export function LeaderboardTabs({
  raceContent,
}: {
  raceContent: React.ReactNode;
}) {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Race");

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-1 rounded-lg bg-surface p-1 mb-6 w-fit">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 text-sm rounded-md transition-colors ${
              tab === t
                ? "bg-accent text-bg font-bold"
                : "text-muted hover:text-text"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Race" ? raceContent : <SoloLeaderboard />}
    </div>
  );
}
