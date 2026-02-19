"use client";

import { useRouter, useSearchParams } from "next/navigation";

type Tab = "ranked" | "solo";

export function LeaderboardTabs() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const active: Tab = searchParams.get("tab") === "solo" ? "solo" : "ranked";

  function switchTab(tab: Tab) {
    if (tab === active) return;
    if (tab === "solo") {
      router.replace("?tab=solo&mode=timed&duration=60");
    } else {
      router.replace("/leaderboard");
    }
  }

  return (
    <div className="flex items-center gap-1">
      <Chip active={active === "ranked"} onClick={() => switchTab("ranked")}>
        Ranked
      </Chip>
      <Chip active={active === "solo"} onClick={() => switchTab("solo")}>
        Solo
      </Chip>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
        active
          ? "bg-accent/15 text-accent ring-1 ring-accent/20"
          : "text-muted/60 hover:text-text hover:bg-white/[0.04]"
      }`}
    >
      {children}
    </button>
  );
}
