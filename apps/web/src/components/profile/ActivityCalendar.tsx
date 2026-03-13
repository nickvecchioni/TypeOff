"use client";

import React, { useState, useRef } from "react";

interface ActivityDay {
  date: string;
  count: number;
}

interface ActivityCalendarProps {
  activity: ActivityDay[];
}

const WEEKS_TO_SHOW = 13; // ~3 months
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

  // Start WEEKS_TO_SHOW weeks ago, aligned to Sunday
  const startDay = new Date(today);
  startDay.setDate(startDay.getDate() - startDay.getDay() - (WEEKS_TO_SHOW - 1) * 7);

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

  // Month labels
  const monthLabels: Array<{ label: string; weekIndex: number }> = [];
  for (let wi = 0; wi < weeks.length; wi++) {
    const week = weeks[wi];
    if (!week[0]) continue;
    const thisMonth = new Date(week[0].date + "T12:00:00").getMonth();
    if (wi === 0) {
      monthLabels.push({
        label: new Date(week[0].date + "T12:00:00").toLocaleDateString("en-US", { month: "short" }),
        weekIndex: wi,
      });
    } else {
      const prevWeek = weeks[wi - 1];
      if (!prevWeek?.[0]) continue;
      const prevMonth = new Date(prevWeek[0].date + "T12:00:00").getMonth();
      if (thisMonth !== prevMonth) {
        monthLabels.push({
          label: new Date(week[0].date + "T12:00:00").toLocaleDateString("en-US", { month: "short" }),
          weekIndex: wi,
        });
      }
    }
  }

  // Use CSS grid to fill available width
  // Day label column is fixed width, remaining columns stretch equally
  const gridTemplateColumns = `24px repeat(${weeks.length}, 1fr)`;

  return (
    <div className="relative" ref={containerRef}>
      {/* Month labels row */}
      <div
        className="grid mb-1"
        style={{ gridTemplateColumns }}
      >
        {/* Empty cell for day-label column */}
        <div />
        {weeks.map((_, wi) => {
          const ml = monthLabels.find((m) => m.weekIndex === wi);
          return (
            <div key={wi} className="text-[11px] text-muted/60 leading-[14px] truncate">
              {ml?.label ?? ""}
            </div>
          );
        })}
      </div>

      {/* Grid: 7 rows (Sun–Sat), day labels + week columns */}
      {Array.from({ length: 7 }).map((_, dayIdx) => (
        <div
          key={dayIdx}
          className="grid gap-[3px] mb-[3px]"
          style={{ gridTemplateColumns }}
        >
          {/* Day label */}
          <div className="text-[11px] text-muted/60 text-right pr-1 leading-none flex items-center justify-end">
            {DAY_LABELS[dayIdx]}
          </div>
          {/* Cells for this day across all weeks */}
          {weeks.map((week, wi) => {
            const day = week[dayIdx];
            if (!day) return <div key={wi} />;
            return (
              <div
                key={wi}
                className={`aspect-square rounded-[2px] cursor-default ${
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
            );
          })}
        </div>
      ))}

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
