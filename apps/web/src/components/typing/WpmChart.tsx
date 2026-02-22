"use client";

import React, { useRef, useState } from "react";
import type { WpmSample } from "@typeoff/shared";

interface WpmChartProps {
  samples: WpmSample[];
}

const CHART_WIDTH = 600;
const CHART_HEIGHT = 140;
const PADDING = { top: 12, right: 16, bottom: 24, left: 44 };

export function WpmChart({ samples }: WpmChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

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

  // Area fill path under WPM line (close at bottom)
  const areaPath =
    toPath("wpm") +
    ` L ${scaleX(samples[samples.length - 1].elapsed)} ${PADDING.top + innerHeight}` +
    ` L ${scaleX(samples[0].elapsed)} ${PADDING.top + innerHeight} Z`;

  // Error area: fill between raw (top) and wpm (bottom) lines
  const errorAreaPath =
    samples.map((s, i) => `${i === 0 ? "M" : "L"} ${scaleX(s.elapsed)} ${scaleY(s.raw)}`).join(" ") +
    " " +
    samples.slice().reverse().map((s, i) => `${i === 0 ? "L" : "L"} ${scaleX(s.elapsed)} ${scaleY(s.wpm)}`).join(" ") +
    " Z";

  function handleMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * CHART_WIDTH;
    let closest = 0;
    let minDist = Infinity;
    samples.forEach((s, i) => {
      const d = Math.abs(scaleX(s.elapsed) - mouseX);
      if (d < minDist) { minDist = d; closest = i; }
    });
    setHoveredIdx(closest);
  }

  const hovered = hoveredIdx !== null ? samples[hoveredIdx] : null;

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
      className="w-full h-full"
      role="img"
      aria-label="WPM over time chart"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setHoveredIdx(null)}
      style={{ cursor: "crosshair" }}
    >
      <defs>
        <linearGradient id="wpmGradient" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0.02" />
        </linearGradient>
        <linearGradient id="errorGradient" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#f87171" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#f87171" stopOpacity="0.05" />
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
            stroke="rgba(255,255,255,0.07)"
            strokeWidth={1}
          />
          <text
            x={PADDING.left - 10}
            y={scaleY(tick) + 5}
            fill="var(--color-muted)"
            fontSize={12}
            textAnchor="end"
          >
            {tick}
          </text>
        </g>
      ))}

      {/* Error area fill between raw and wpm */}
      <path d={errorAreaPath} fill="url(#errorGradient)" />

      {/* Area fill under WPM line */}
      <path d={areaPath} fill="url(#wpmGradient)" />

      {/* Bottom axis line */}
      <line
        x1={PADDING.left}
        x2={CHART_WIDTH - PADDING.right}
        y1={PADDING.top + innerHeight}
        y2={PADDING.top + innerHeight}
        stroke="rgba(255,255,255,0.1)"
        strokeWidth={1}
      />

      {/* Raw WPM line */}
      <path
        d={toPath("raw")}
        fill="none"
        stroke="var(--color-muted)"
        strokeWidth={1.5}
        strokeOpacity={0.5}
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
          r={hoveredIdx === i ? 4 : 2.5}
          fill="var(--color-accent)"
        />
      ))}

      {/* Hover crosshair + tooltip */}
      {hovered !== null && hoveredIdx !== null && (() => {
        const x = scaleX(hovered.elapsed);
        const y = scaleY(hovered.wpm);
        const timeSec = (hovered.elapsed / 1000).toFixed(1);
        const wpmVal = Math.round(hovered.wpm);
        const rawVal = Math.round(hovered.raw);

        const TOOLTIP_W = 108;
        const TOOLTIP_H = 36;
        const flipLeft = x + TOOLTIP_W + 14 > CHART_WIDTH - PADDING.right;
        const tx = flipLeft ? x - TOOLTIP_W - 8 : x + 8;
        const ty = Math.max(PADDING.top, Math.min(y - TOOLTIP_H / 2, PADDING.top + innerHeight - TOOLTIP_H));

        return (
          <g pointerEvents="none">
            {/* Vertical crosshair */}
            <line
              x1={x} x2={x}
              y1={PADDING.top}
              y2={PADDING.top + innerHeight}
              stroke="rgba(255,255,255,0.18)"
              strokeWidth={1}
              strokeDasharray="3 3"
            />
            {/* Highlighted dot */}
            <circle cx={x} cy={y} r={4} fill="var(--color-accent)" />
            {/* Tooltip background */}
            <rect
              x={tx} y={ty}
              width={TOOLTIP_W} height={TOOLTIP_H}
              rx={4}
              fill="rgba(12,12,20,0.92)"
              stroke="rgba(255,255,255,0.08)"
              strokeWidth={1}
            />
            {/* WPM value */}
            <text x={tx + 8} y={ty + 14} fill="var(--color-accent)" fontSize={12} fontWeight="700">
              {wpmVal} wpm
            </text>
            {/* Time + raw */}
            <text x={tx + 8} y={ty + 28} fill="var(--color-muted)" fontSize={10} fillOpacity={0.7}>
              {timeSec}s · raw {rawVal}
            </text>
          </g>
        );
      })()}

      {/* X-axis label */}
      <text
        x={CHART_WIDTH / 2}
        y={CHART_HEIGHT - 5}
        fill="var(--color-muted)"
        fontSize={9}
        textAnchor="middle"
        fillOpacity={0.4}
      >
        seconds
      </text>
    </svg>
  );
}
