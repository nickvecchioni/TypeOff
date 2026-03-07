"use client";

import React, { useState, useRef } from "react";

interface ActivityDay {
  date: string;
  count: number;
}

interface ActivityCalendarProps {
  activity: ActivityDay[];
}

const LAUNCH_YEAR = 2026;
const DAY_LABELS = ["", "Mon", "", "Wed", "", "Fri", ""];

function getColor(count: number, max: number): string {
  if (count === 0) return "bg-white/[0.04]";
  const pct = count / max;
  if (pct < 0.25) return "bg-accent/20";
  if (pct < 0.5) return "bg-accent/40";
  if (pct < 0.75) return "bg-accent/60";
  return "bg-accent";
}

export function ActivityCalendar({ activity }: ActivityCalendarProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<{
    date: string;
    count: number;
    x: number;
    y: number;
  } | null>(null);

  const today = new Date();

  // Start from Jan 1 of launch year, padded back to Sunday
  const startDay = new Date(LAUNCH_YEAR, 0, 1);
  startDay.setDate(startDay.getDate() - startDay.getDay());

  const activityMap = new Map(activity.map((a) => [a.date, a.count]));
  const maxCount = Math.max(1, ...activity.map((a) => a.count));

  // Build week columns
  const weeks: Array<Array<{ date: string; count: number; future: boolean }>> = [];
  const cursor = new Date(startDay);

  while (cursor <= today) {
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
  }
  // Pad last week to 7 rows
  const lastWeek = weeks[weeks.length - 1];
  if (lastWeek) {
    while (lastWeek.length < 7) {
      const dateStr = cursor.toISOString().slice(0, 10);
      lastWeek.push({ date: dateStr, count: 0, future: true });
      cursor.setDate(cursor.getDate() + 1);
    }
  }

  // Month labels: show when the week column crosses into a new month
  const monthLabels: Array<string | null> = weeks.map((week, wi) => {
    if (!week[0]) return null;
    const thisMonth = new Date(week[0].date + "T12:00:00").getMonth();
    if (wi === 0) {
      return new Date(week[0].date + "T12:00:00").toLocaleDateString("en-US", { month: "short" });
    }
    const prevWeek = weeks[wi - 1];
    if (!prevWeek?.[0]) return null;
    const prevMonth = new Date(prevWeek[0].date + "T12:00:00").getMonth();
    if (thisMonth !== prevMonth) {
      return new Date(week[0].date + "T12:00:00").toLocaleDateString("en-US", { month: "short" });
    }
    return null;
  });

  return (
    <div className="relative" ref={containerRef}>
      <div className="flex gap-0">
        {/* Day-of-week labels */}
        <div className="flex flex-col gap-[3px] mr-2 shrink-0" style={{ marginTop: 18 }}>
          {DAY_LABELS.map((label, i) => (
            <div
              key={i}
              className="h-[11px] w-6 text-[11px] text-muted/60 text-right leading-[11px]"
            >
              {label}
            </div>
          ))}
        </div>

        <div className="flex flex-col min-w-0">
          {/* Month labels */}
          <div className="flex gap-[3px] mb-1 h-[14px]">
            {weeks.map((_, wi) => (
              <div
                key={wi}
                className="w-[11px] shrink-0 text-[11px] text-muted/60 leading-[14px] overflow-visible whitespace-nowrap"
              >
                {monthLabels[wi] ?? ""}
              </div>
            ))}
          </div>

          {/* Cell grid */}
          <div className="flex gap-[3px] overflow-x-auto pb-1">
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-[3px] shrink-0">
                {week.map((day) => (
                  <div
                    key={day.date}
                    className={`w-[11px] h-[11px] rounded-[2px] cursor-default ${
                      day.future ? "opacity-0" : getColor(day.count, maxCount)
                    }`}
                    onMouseEnter={(e) => {
                      if (day.future) return;
                      const container = containerRef.current;
                      if (!container) return;
                      const containerRect = container.getBoundingClientRect();
                      const cellRect = e.currentTarget.getBoundingClientRect();
                      setTooltip({
                        date: day.date,
                        count: day.count,
                        x: cellRect.left - containerRect.left + cellRect.width / 2,
                        y: cellRect.top - containerRect.top,
                      });
                    }}
                    onMouseLeave={() => setTooltip(null)}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {tooltip && (
        <div
          className="absolute z-50 pointer-events-none bg-surface ring-1 ring-white/[0.08] rounded-lg px-2.5 py-1.5 text-xs text-text shadow-lg -translate-x-1/2"
          style={{ left: tooltip.x, top: tooltip.y - 36 }}
        >
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-accent tabular-nums">{tooltip.count}</span>
            <span className="text-muted/70">{tooltip.count === 1 ? "race" : "races"}</span>
          </div>
          <div className="text-xs text-muted/50 mt-0.5">
            {new Date(tooltip.date + "T12:00:00").toLocaleDateString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
            })}
          </div>
        </div>
      )}
    </div>
  );
}
