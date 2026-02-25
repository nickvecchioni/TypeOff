"use client";

import React, { useRef, useState } from "react";
import type { WpmSample } from "@typeoff/shared";

interface OpponentLine {
  name: string;
  samples: WpmSample[];
  color: string;
}

interface WpmChartProps {
  samples: WpmSample[];
  compact?: boolean;
  opponents?: OpponentLine[];
}

const CHART_WIDTH = 600;

const OPPONENT_COLORS = [
  "rgba(255,255,255,0.18)",
  "rgba(255,255,255,0.14)",
  "rgba(255,255,255,0.10)",
  "rgba(255,255,255,0.08)",
];

export function WpmChart({ samples, compact = false, opponents }: WpmChartProps) {
  const CHART_HEIGHT = compact ? 90 : 240;
  const PADDING = compact
    ? { top: 8, right: 16, bottom: 14, left: 36 }
    : { top: 12, right: 16, bottom: 24, left: 44 };
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (samples.length < 2) return null;

  const innerWidth = CHART_WIDTH - PADDING.left - PADDING.right;
  const innerHeight = CHART_HEIGHT - PADDING.top - PADDING.bottom;

  // Include opponent WPMs in the max calculation for proper scaling
  const allWpms = [
    ...samples.map((s) => Math.max(s.wpm, s.raw)),
    ...(opponents ?? []).flatMap((o) => o.samples.map((s) => s.wpm)),
  ];
  const rawMax = Math.max(...allWpms, 10);
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

  const samplesToPath = (s: WpmSample[]) =>
    s.map((pt, i) => `${i === 0 ? "M" : "L"} ${scaleX(pt.elapsed)} ${scaleY(pt.wpm)}`).join(" ");

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
      preserveAspectRatio="none"
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
            x={PADDING.left - 6}
            y={scaleY(tick)}
            fill="var(--color-muted)"
            fontSize={compact ? 9 : 11}
            textAnchor="end"
            dominantBaseline="middle"
            fillOpacity={0.7}
          >
            {tick}
          </text>
        </g>
      ))}

      {/* Opponent WPM lines (rendered behind main line) */}
      {(opponents ?? []).map((opp, idx) => (
        <g key={`opp-${idx}`}>
          <path
            d={samplesToPath(opp.samples)}
            fill="none"
            stroke={opp.color || OPPONENT_COLORS[idx % OPPONENT_COLORS.length]}
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="4 3"
          />
          {/* Name label at the end of the line */}
          {opp.samples.length > 0 && (
            <text
              x={scaleX(opp.samples[opp.samples.length - 1].elapsed) + 4}
              y={scaleY(opp.samples[opp.samples.length - 1].wpm)}
              fill={opp.color || OPPONENT_COLORS[idx % OPPONENT_COLORS.length]}
              fontSize={8}
              dominantBaseline="middle"
              fillOpacity={0.7}
            >
              {opp.name}
            </text>
          )}
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

      {/* Error dots — red markers where errors occurred that second */}
      {samples.map((s, i) => {
        const cumErr = (x: WpmSample) => Math.max(0, (x.raw - x.wpm) * x.elapsed / 12);
        const prev = i > 0 ? samples[i - 1] : null;
        const errCount = Math.max(0, Math.round(cumErr(s) - (prev ? cumErr(prev) : 0)));
        return errCount > 0 ? (
          <circle
            key={`err-${i}`}
            cx={scaleX(s.elapsed)}
            cy={scaleY(s.wpm)}
            r={hoveredIdx === i ? 5 : 3.5}
            fill="#f87171"
            fillOpacity={0.85}
          />
        ) : null;
      })}

      {/* Hover crosshair + tooltip */}
      {hovered !== null && hoveredIdx !== null && (() => {
        const x = scaleX(hovered.elapsed);
        const y = scaleY(hovered.wpm);
        const timeSec = hovered.elapsed;
        const wpmVal = Math.round(hovered.wpm);

        // Cumulative error chars = (raw - wpm) * elapsed / 12
        const cumErrors = (s: WpmSample) => Math.max(0, (s.raw - s.wpm) * s.elapsed / 12);
        const prevSample = hoveredIdx > 0 ? samples[hoveredIdx - 1] : null;
        const errorsThisSecond = Math.max(0, Math.round(cumErrors(hovered) - (prevSample ? cumErrors(prevSample) : 0)));

        const hasErrors = errorsThisSecond > 0;
        const TOOLTIP_W = 100;
        const TOOLTIP_H = hasErrors ? 42 : 30;
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
            <circle cx={x} cy={y} r={4} fill={hasErrors ? "#f87171" : "var(--color-accent)"} />
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
            <text x={tx + 8} y={ty + 12} fill="var(--color-accent)" fontSize={12} fontWeight="700">
              {wpmVal} wpm
            </text>
            {/* Error count */}
            {hasErrors && (
              <text x={tx + 8} y={ty + 24} fill="#f87171" fontSize={10} fillOpacity={0.85}>
                {errorsThisSecond} {errorsThisSecond === 1 ? "error" : "errors"}
              </text>
            )}
            {/* Time */}
            <text x={tx + 8} y={ty + (hasErrors ? 36 : 24)} fill="var(--color-muted)" fontSize={10} fillOpacity={0.7}>
              at {timeSec}s
            </text>
          </g>
        );
      })()}

      {/* X-axis label */}
      <text
        x={CHART_WIDTH / 2}
        y={PADDING.top + innerHeight + (compact ? 10 : 16)}
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
