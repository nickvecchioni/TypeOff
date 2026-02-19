"use client";

import React, { useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

interface RaceDataPoint {
  date: string;
  wpm: number;
  accuracy: number;
  elo: number;
}

interface PerformanceChartsProps {
  races: RaceDataPoint[];
}

type Tab = "wpm" | "accuracy" | "elo";

const TIER_LINES = [
  { elo: 1000, label: "Silver", color: "#9ca3af" },
  { elo: 1300, label: "Gold", color: "#eab308" },
  { elo: 1600, label: "Platinum", color: "#67e8f9" },
  { elo: 1900, label: "Diamond", color: "#3b82f6" },
  { elo: 2200, label: "Master", color: "#a855f7" },
  { elo: 2500, label: "GM", color: "#ef4444" },
];

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const TABS: { key: Tab; label: string }[] = [
  { key: "wpm", label: "WPM" },
  { key: "accuracy", label: "Accuracy" },
  { key: "elo", label: "ELO" },
];

export function PerformanceCharts({ races }: PerformanceChartsProps) {
  const [tab, setTab] = useState<Tab>("wpm");

  // Reverse so oldest is first (left side of chart)
  const data = [...races].reverse().map((r) => ({
    ...r,
    dateLabel: formatDate(r.date),
  }));

  return (
    <div>
      {/* Tab buttons */}
      <div className="flex gap-1 mb-4">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              tab === t.key
                ? "bg-accent/10 text-accent ring-1 ring-accent/20"
                : "text-muted/60 hover:text-muted hover:bg-white/[0.03]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Chart */}
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          {tab === "wpm" ? (
            <WpmChart data={data} />
          ) : tab === "accuracy" ? (
            <AccuracyChart data={data} />
          ) : (
            <EloChart data={data} />
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function ChartTooltipContent({ active, payload, label, unit }: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
  unit: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg bg-[#1a1a24] ring-1 ring-white/[0.08] px-3 py-2 text-xs shadow-xl">
      <div className="text-muted/60 mb-0.5">{label}</div>
      <div className="text-text font-bold tabular-nums">
        {unit === "%" ? `${payload[0].value.toFixed(1)}%` : Math.round(payload[0].value)}
        {unit !== "%" && <span className="text-muted/60 font-normal ml-1">{unit}</span>}
      </div>
    </div>
  );
}

function WpmChart({ data }: { data: Array<{ dateLabel: string; wpm: number }> }) {
  return (
    <AreaChart data={data}>
      <defs>
        <linearGradient id="wpmGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4d9eff" stopOpacity={0.2} />
          <stop offset="100%" stopColor="#4d9eff" stopOpacity={0} />
        </linearGradient>
      </defs>
      <XAxis
        dataKey="dateLabel"
        tick={{ fontSize: 10, fill: "rgba(255,255,255,0.3)" }}
        axisLine={false}
        tickLine={false}
      />
      <YAxis
        tick={{ fontSize: 10, fill: "rgba(255,255,255,0.3)" }}
        axisLine={false}
        tickLine={false}
        width={35}
      />
      <Tooltip content={<ChartTooltipContent unit="WPM" />} />
      <Area
        type="monotone"
        dataKey="wpm"
        stroke="#4d9eff"
        strokeWidth={2}
        fill="url(#wpmGrad)"
        dot={false}
        activeDot={{ r: 4, fill: "#4d9eff", stroke: "#0c0c12", strokeWidth: 2 }}
      />
    </AreaChart>
  );
}

function AccuracyChart({ data }: { data: Array<{ dateLabel: string; accuracy: number }> }) {
  const minAcc = Math.max(0, Math.floor(Math.min(...data.map((d) => d.accuracy)) - 2));
  return (
    <AreaChart data={data}>
      <defs>
        <linearGradient id="accGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3fb950" stopOpacity={0.2} />
          <stop offset="100%" stopColor="#3fb950" stopOpacity={0} />
        </linearGradient>
      </defs>
      <XAxis
        dataKey="dateLabel"
        tick={{ fontSize: 10, fill: "rgba(255,255,255,0.3)" }}
        axisLine={false}
        tickLine={false}
      />
      <YAxis
        domain={[minAcc, 100]}
        tick={{ fontSize: 10, fill: "rgba(255,255,255,0.3)" }}
        axisLine={false}
        tickLine={false}
        width={35}
      />
      <Tooltip content={<ChartTooltipContent unit="%" />} />
      <Area
        type="monotone"
        dataKey="accuracy"
        stroke="#3fb950"
        strokeWidth={2}
        fill="url(#accGrad)"
        dot={false}
        activeDot={{ r: 4, fill: "#3fb950", stroke: "#0c0c12", strokeWidth: 2 }}
      />
    </AreaChart>
  );
}

function EloChart({ data }: { data: Array<{ dateLabel: string; elo: number }> }) {
  const eloValues = data.map((d) => d.elo);
  const minElo = Math.min(...eloValues);
  const maxElo = Math.max(...eloValues);
  const visibleTiers = TIER_LINES.filter(
    (t) => t.elo >= minElo - 100 && t.elo <= maxElo + 100
  );

  return (
    <AreaChart data={data}>
      <defs>
        <linearGradient id="eloGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4d9eff" stopOpacity={0.2} />
          <stop offset="100%" stopColor="#4d9eff" stopOpacity={0} />
        </linearGradient>
      </defs>
      <XAxis
        dataKey="dateLabel"
        tick={{ fontSize: 10, fill: "rgba(255,255,255,0.3)" }}
        axisLine={false}
        tickLine={false}
      />
      <YAxis
        tick={{ fontSize: 10, fill: "rgba(255,255,255,0.3)" }}
        axisLine={false}
        tickLine={false}
        width={35}
      />
      <Tooltip content={<ChartTooltipContent unit="ELO" />} />
      {visibleTiers.map((t) => (
        <ReferenceLine
          key={t.elo}
          y={t.elo}
          stroke={t.color}
          strokeOpacity={0.2}
          strokeDasharray="4 4"
          label={{
            value: t.label,
            position: "right",
            fill: t.color,
            fontSize: 9,
            opacity: 0.5,
          }}
        />
      ))}
      <Area
        type="monotone"
        dataKey="elo"
        stroke="#4d9eff"
        strokeWidth={2}
        fill="url(#eloGrad)"
        dot={false}
        activeDot={{ r: 4, fill: "#4d9eff", stroke: "#0c0c12", strokeWidth: 2 }}
      />
    </AreaChart>
  );
}
