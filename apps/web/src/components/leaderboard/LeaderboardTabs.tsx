"use client";

import { useRouter, useSearchParams } from "next/navigation";

type Tab = "ranked" | "solo" | "pp" | "clans";

export function LeaderboardTabs() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawTab = searchParams.get("tab");
  const active: Tab = rawTab === "solo" ? "solo" : rawTab === "pp" ? "pp" : rawTab === "clans" ? "clans" : "ranked";

  function switchTab(tab: Tab) {
    if (tab === active) return;
    if (tab === "solo") {
      router.replace("?tab=solo&mode=timed&duration=60");
    } else if (tab === "pp") {
      router.replace("?tab=pp");
    } else if (tab === "clans") {
      router.replace("?tab=clans");
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
      <Chip active={active === "pp"} onClick={() => switchTab("pp")}>
        PP
      </Chip>
      <Chip active={active === "clans"} onClick={() => switchTab("clans")}>
        Clans
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
