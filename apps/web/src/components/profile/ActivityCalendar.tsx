"use client";

import React, { useState } from "react";

interface ActivityDay {
  date: string;
  count: number;
}

interface ActivityCalendarProps {
  activity: ActivityDay[];
}

function getColorClass(count: number, max: number): string {
  if (count === 0) return "bg-white/[0.04]";
  const pct = count / max;
  if (pct < 0.25) return "bg-accent/20";
  if (pct < 0.5) return "bg-accent/40";
  if (pct < 0.75) return "bg-accent/60";
  return "bg-accent";
}

export function ActivityCalendar({ activity }: ActivityCalendarProps) {
  const [tooltip, setTooltip] = useState<{ date: string; count: number; x: number; y: number } | null>(null);

  const today = new Date();
  const startDay = new Date(today);
  startDay.setDate(startDay.getDate() - 364);
  // Pad to Sunday
  startDay.setDate(startDay.getDate() - startDay.getDay());

  const activityMap = new Map(activity.map((a) => [a.date, a.count]));
  const maxCount = Math.max(1, ...activity.map((a) => a.count));

  const weeks: Array<Array<{ date: string; count: number; future: boolean }>> = [];
  const cursor = new Date(startDay);

  while (cursor <= today || weeks.length === 0 || weeks[weeks.length - 1].length < 7) {
    if (weeks.length === 0 || weeks[weeks.length - 1].length === 7) {
      weeks.push([]);
    }
    const dateStr = cursor.toISOString().slice(0, 10);
    weeks[weeks.length - 1].push({
      date: dateStr,
      count: activityMap.get(dateStr) ?? 0,
      future: cursor > today,
    });
    cursor.setDate(cursor.getDate() + 1);
    if (weeks.length > 55) break;
  }

  return (
    <div className="relative">
      <div className="flex gap-[3px] overflow-x-auto pb-1">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-[3px]">
            {week.map((day) => (
              <div
                key={day.date}
                className={`w-[11px] h-[11px] rounded-[2px] cursor-default ${
                  day.future ? "opacity-0" : getColorClass(day.count, maxCount)
                }`}
                onMouseEnter={(e) => {
                  if (day.future) return;
                  const rect = e.currentTarget.getBoundingClientRect();
                  setTooltip({ date: day.date, count: day.count, x: rect.left, y: rect.top });
                }}
                onMouseLeave={() => setTooltip(null)}
              />
            ))}
          </div>
        ))}
      </div>

      {tooltip && (
        <div
          className="fixed z-50 pointer-events-none bg-surface ring-1 ring-white/[0.08] rounded px-2 py-1 text-xs text-text shadow-lg"
          style={{ left: tooltip.x + 12, top: tooltip.y - 28 }}
        >
          <span className="font-bold text-accent tabular-nums">{tooltip.count}</span>
          {" "}
          {tooltip.count === 1 ? "test" : "tests"}
          {" — "}
          {new Date(tooltip.date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        </div>
      )}
    </div>
  );
}
