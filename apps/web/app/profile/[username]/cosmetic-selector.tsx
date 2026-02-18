"use client";

import React, { useEffect, useState } from "react";
import { SEASON_1 } from "@typeoff/shared";

interface CosmeticsData {
  unlocked: Array<{ cosmeticId: string; seasonId: string }>;
  active: {
    activeBadge: string | null;
    activeTitle: string | null;
    activeNameColor: string | null;
    activeNameEffect: string | null;
  };
}

const REWARD_MAP = new Map(SEASON_1.rewards.map((r) => [r.id, r]));

export function CosmeticSelector() {
  const [data, setData] = useState<CosmeticsData | null>(null);
  const [saving, setSaving] = useState(false);
  const [active, setActive] = useState({
    activeBadge: null as string | null,
    activeTitle: null as string | null,
    activeNameColor: null as string | null,
    activeNameEffect: null as string | null,
  });

  useEffect(() => {
    fetch("/api/cosmetics")
      .then((r) => r.json())
      .then((d: CosmeticsData) => {
        setData(d);
        setActive(d.active);
      })
      .catch(() => {});
  }, []);

  if (!data || data.unlocked.length === 0) return null;

  const badges = data.unlocked
    .map((u) => REWARD_MAP.get(u.cosmeticId))
    .filter((r) => r?.type === "badge");
  const titles = data.unlocked
    .map((u) => REWARD_MAP.get(u.cosmeticId))
    .filter((r) => r?.type === "title");
  const colors = data.unlocked
    .map((u) => REWARD_MAP.get(u.cosmeticId))
    .filter((r) => r?.type === "nameColor");
  const effects = data.unlocked
    .map((u) => REWARD_MAP.get(u.cosmeticId))
    .filter((r) => r?.type === "nameEffect");

  async function save(newActive: typeof active) {
    setSaving(true);
    setActive(newActive);
    try {
      await fetch("/api/cosmetics", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newActive),
      });
    } finally {
      setSaving(false);
    }
  }

  function toggleCosmetic(
    field: keyof typeof active,
    id: string,
  ) {
    const newActive = {
      ...active,
      [field]: active[field] === id ? null : id,
    };
    save(newActive);
  }

  return (
    <div className="space-y-4">
      <h3 className="text-xs font-bold text-muted/60 uppercase tracking-wider">
        Cosmetics {saving && <span className="text-muted/40 normal-case">(saving...)</span>}
      </h3>

      {badges.length > 0 && (
        <div>
          <p className="text-[11px] text-muted mb-1.5">Badges</p>
          <div className="flex flex-wrap gap-1.5">
            {badges.map((r) => r && (
              <button
                key={r.id}
                onClick={() => toggleCosmetic("activeBadge", r.id)}
                className={`text-lg w-9 h-9 rounded-lg flex items-center justify-center ring-1 transition-all ${
                  active.activeBadge === r.id
                    ? "ring-amber-400 bg-amber-400/10"
                    : "ring-white/[0.06] hover:ring-white/[0.12]"
                }`}
                title={r.name}
              >
                {r.value}
              </button>
            ))}
          </div>
        </div>
      )}

      {titles.length > 0 && (
        <div>
          <p className="text-[11px] text-muted mb-1.5">Titles</p>
          <div className="flex flex-wrap gap-1.5">
            {titles.map((r) => r && (
              <button
                key={r.id}
                onClick={() => toggleCosmetic("activeTitle", r.id)}
                className={`text-xs px-3 py-1.5 rounded-lg ring-1 transition-all ${
                  active.activeTitle === r.id
                    ? "ring-amber-400 bg-amber-400/10 text-amber-400"
                    : "ring-white/[0.06] text-muted hover:ring-white/[0.12]"
                }`}
              >
                {r.value}
              </button>
            ))}
          </div>
        </div>
      )}

      {colors.length > 0 && (
        <div>
          <p className="text-[11px] text-muted mb-1.5">Name Colors</p>
          <div className="flex flex-wrap gap-1.5">
            {colors.map((r) => r && (
              <button
                key={r.id}
                onClick={() => toggleCosmetic("activeNameColor", r.id)}
                className={`w-7 h-7 rounded-full ring-2 transition-all ${
                  active.activeNameColor === r.id
                    ? "ring-white scale-110"
                    : "ring-transparent hover:ring-white/30"
                }`}
                style={{ backgroundColor: r.value }}
                title={r.name}
              />
            ))}
          </div>
        </div>
      )}

      {effects.length > 0 && (
        <div>
          <p className="text-[11px] text-muted mb-1.5">Name Effects</p>
          <div className="flex flex-wrap gap-1.5">
            {effects.map((r) => r && (
              <button
                key={r.id}
                onClick={() => toggleCosmetic("activeNameEffect", r.id)}
                className={`text-xs px-3 py-1.5 rounded-lg ring-1 transition-all ${
                  active.activeNameEffect === r.id
                    ? "ring-amber-400 bg-amber-400/10 text-amber-400"
                    : "ring-white/[0.06] text-muted hover:ring-white/[0.12]"
                }`}
              >
                {r.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
