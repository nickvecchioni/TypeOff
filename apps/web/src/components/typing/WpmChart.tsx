"use client";

import React from "react";
import type { WpmSample } from "@typeoff/shared";

interface WpmChartProps {
  samples: WpmSample[];
}

const CHART_WIDTH = 600;
const CHART_HEIGHT = 220;
const PADDING = { top: 16, right: 20, bottom: 32, left: 52 };

export function WpmChart({ samples }: WpmChartProps) {
  if (samples.length < 2) return null;

  const innerWidth = CHART_WIDTH - PADDING.left - PADDING.right;
  const innerHeight = CHART_HEIGHT - PADDING.top - PADDING.bottom;

  const rawMax = Math.max(...samples.map((s) => Math.max(s.wpm, s.raw)), 10);
  const minTime = samples[0].elapsed;
  const maxTime = samples[samples.length - 1].elapsed || 1;
  const timeRange = maxTime - minTime || 1;

  // Compute clean y-axis ticks (multiples of a nice step)
  const niceStep = rawMax <= 50 ? 10 : rawMax <= 120 ? 25 : 50;
  const yMax = Math.ceil((rawMax * 1.1) / niceStep) * niceStep;
  const tickCount = Math.min(6, Math.max(3, yMax / niceStep));
  const yTicks = Array.from({ length: tickCount + 1 }, (_, i) =>
    Math.round((i * yMax) / tickCount / niceStep) * niceStep
  ).filter((v, i, a) => a.indexOf(v) === i);

  const scaleX = (t: number) => PADDING.left + ((t - minTime) / timeRange) * innerWidth;
  const scaleY = (v: number) => PADDING.top + innerHeight - (v / yMax) * innerHeight;

  const toPath = (key: "wpm" | "raw") =>
    samples
      .map((s, i) => `${i === 0 ? "M" : "L"} ${scaleX(s.elapsed)} ${scaleY(s[key])}`)
      .join(" ");

  // Area fill path (close at bottom)
  const areaPath =
    toPath("wpm") +
    ` L ${scaleX(samples[samples.length - 1].elapsed)} ${PADDING.top + innerHeight}` +
    ` L ${scaleX(samples[0].elapsed)} ${PADDING.top + innerHeight} Z`;

  return (
    <svg
      viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
      className="w-full max-w-2xl"
      role="img"
      aria-label="WPM over time chart"
    >
      <defs>
        <linearGradient id="wpmGradient" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.2" />
          <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Grid lines */}
      {yTicks.map((tick) => (
        <g key={tick}>
          <line
            x1={PADDING.left}
            x2={CHART_WIDTH - PADDING.right}
            y1={scaleY(tick)}
            y2={scaleY(tick)}
            stroke="var(--color-surface-bright)"
            strokeWidth={1}
          />
          <text
            x={PADDING.left - 10}
            y={scaleY(tick) + 5}
            fill="var(--color-muted)"
            fontSize={13}
            textAnchor="end"
          >
            {tick}
          </text>
        </g>
      ))}

      {/* Area fill under WPM line */}
      <path d={areaPath} fill="url(#wpmGradient)" />

      {/* Raw WPM line */}
      <path
        d={toPath("raw")}
        fill="none"
        stroke="var(--color-muted)"
        strokeWidth={1.5}
        strokeOpacity={0.3}
        strokeDasharray="4 4"
      />

      {/* WPM line */}
      <path
        d={toPath("wpm")}
        fill="none"
        stroke="var(--color-accent)"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Dots on WPM line */}
      {samples.map((s, i) => (
        <circle
          key={i}
          cx={scaleX(s.elapsed)}
          cy={scaleY(s.wpm)}
          r={2.5}
          fill="var(--color-accent)"
        />
      ))}

      {/* X-axis label */}
      <text
        x={CHART_WIDTH / 2}
        y={CHART_HEIGHT - 6}
        fill="var(--color-muted)"
        fontSize={13}
        textAnchor="middle"
      >
        seconds
      </text>
    </svg>
  );
}
