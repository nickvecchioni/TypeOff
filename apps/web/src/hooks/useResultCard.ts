"use client";

import { useCallback } from "react";

const BG = "#0a0a10";
const SURFACE = "#12121c";
const ACCENT = "#4d9eff";
const TEXT = "#e8e8f0";
const MUTED = "#3a3a4a";
const MUTED_LIGHT = "#5a5a6e";
const CORRECT = "#4ade80";
const ERROR = "#f87171";

const RANK_COLORS: Record<string, string> = {
  bronze: "#cd7f32",
  silver: "#9ca3af",
  gold: "#f59e0b",
  platinum: "#22d3ee",
  diamond: "#818cf8",
  master: "#c084fc",
  grandmaster: "#fb923c",
};

const PLACEMENT_COLORS: Record<number, string> = {
  1: "#f59e0b",
  2: "#9ca3af",
  3: "#cd7f32",
};

export interface SoloCardData {
  variant: "solo";
  wpm: number;
  accuracy: number;
  consistency: number;
  modeLabel: string;
  username: string;
  date: string;
}

export interface RankedCardData {
  variant: "ranked";
  wpm: number;
  accuracy: number;
  placement: number;
  totalPlayers: number;
  elo: number;
  eloChange: number;
  rankLabel: string;
  rankTier: string;
  username: string;
  date: string;
}

export type ResultCardData = SoloCardData | RankedCardData;

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/* ── Shared drawing helpers ─────────────────────────────── */

function drawBackground(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  accentColor: string
) {
  // Solid dark background
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);

  // Subtle radial glow from top-left
  const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, W * 0.7);
  glow.addColorStop(0, accentColor + "0a");
  glow.addColorStop(1, "transparent");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // Inner card
  ctx.fillStyle = SURFACE;
  roundRect(ctx, 1, 1, W - 2, H - 2, 12);
  ctx.fill();

  // Very subtle border
  ctx.strokeStyle = "rgba(255,255,255,0.06)";
  ctx.lineWidth = 1;
  roundRect(ctx, 1, 1, W - 2, H - 2, 12);
  ctx.stroke();

  // Thin accent line at top
  ctx.fillStyle = accentColor + "60";
  roundRect(ctx, 1, 1, W - 2, 2, 12);
  ctx.fill();
}

function drawStat(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  label: string,
  value: string,
  valueColor: string,
  fontSize: number
) {
  // Label above value
  ctx.font = `500 11px monospace`;
  ctx.fillStyle = MUTED_LIGHT;
  ctx.textAlign = "left";
  ctx.letterSpacing = "1px";
  ctx.fillText(label.toUpperCase(), x, y);
  ctx.letterSpacing = "0px";

  // Value
  ctx.font = `bold ${fontSize}px monospace`;
  ctx.fillStyle = valueColor;
  ctx.fillText(value, x, y + fontSize + 6);
}

function drawFooter(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  username: string,
  date: string,
  accentColor: string
) {
  const footerY = H - 40;

  // Thin separator
  ctx.fillStyle = "rgba(255,255,255,0.04)";
  ctx.fillRect(32, footerY, W - 64, 1);

  // Username
  ctx.font = "600 12px monospace";
  ctx.fillStyle = accentColor + "aa";
  ctx.textAlign = "left";
  ctx.fillText(username, 32, footerY + 22);

  // Date
  ctx.font = "12px monospace";
  ctx.fillStyle = MUTED;
  ctx.textAlign = "right";
  ctx.fillText(date, W - 32, footerY + 22);

  // Site
  ctx.textAlign = "center";
  ctx.fillStyle = MUTED;
  ctx.fillText("typeoff.gg", W / 2, footerY + 22);
}

/* ── Solo card ──────────────────────────────────────────── */

function drawSoloCard(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  data: SoloCardData
) {
  drawBackground(ctx, W, H, ACCENT);

  // Mode badge - top left
  ctx.font = "600 10px monospace";
  ctx.fillStyle = ACCENT + "40";
  ctx.textAlign = "left";
  ctx.letterSpacing = "2px";
  ctx.fillText("SOLO", 32, 36);
  ctx.letterSpacing = "0px";

  // Mode label - right of badge
  ctx.font = "12px monospace";
  ctx.fillStyle = MUTED_LIGHT;
  ctx.fillText(data.modeLabel, 80, 36);

  // ── Main WPM ──
  const wpmInt = Math.floor(data.wpm);
  const wpmDec = (data.wpm % 1).toFixed(2).slice(1); // ".XX"

  ctx.font = "bold 96px monospace";
  ctx.fillStyle = TEXT;
  ctx.textAlign = "left";
  ctx.fillText(wpmInt.toString(), 32, 140);
  const intW = ctx.measureText(wpmInt.toString()).width;

  ctx.font = "bold 40px monospace";
  ctx.fillStyle = TEXT + "50";
  ctx.fillText(wpmDec, 32 + intW, 133);

  ctx.font = "500 13px monospace";
  ctx.fillStyle = ACCENT;
  ctx.letterSpacing = "2px";
  ctx.fillText("WPM", 32, 160);
  ctx.letterSpacing = "0px";

  // ── Right column stats ──
  const statsX = W - 180;

  // Accuracy
  drawStat(ctx, statsX, 60, "accuracy", Math.floor(data.accuracy) + "%", TEXT, 36);

  // Consistency
  drawStat(
    ctx,
    statsX,
    130,
    "consistency",
    Math.floor(data.consistency) + "%",
    TEXT + "aa",
    36
  );

  drawFooter(ctx, W, H, data.username, data.date, ACCENT);
}

/* ── Ranked card ────────────────────────────────────────── */

function drawRankedCard(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  data: RankedCardData
) {
  const rankColor = RANK_COLORS[data.rankTier.toLowerCase()] ?? ACCENT;
  const placementColor = PLACEMENT_COLORS[data.placement] ?? TEXT;

  drawBackground(ctx, W, H, rankColor);

  // Rank badge - top left
  ctx.font = "600 10px monospace";
  ctx.fillStyle = rankColor + "60";
  ctx.textAlign = "left";
  ctx.letterSpacing = "2px";
  ctx.fillText("RANKED", 32, 36);
  ctx.letterSpacing = "0px";

  // Rank label + ELO
  ctx.font = "bold 12px monospace";
  ctx.fillStyle = rankColor;
  ctx.fillText(data.rankLabel, 100, 36);

  const rankLabelW = ctx.measureText(data.rankLabel).width;
  ctx.font = "12px monospace";
  ctx.fillStyle = MUTED_LIGHT;
  ctx.fillText(`${data.elo}`, 108 + rankLabelW, 36);

  // ELO change - top right
  const eloStr = (data.eloChange > 0 ? "+" : "") + data.eloChange;
  const eloColor =
    data.eloChange > 0 ? CORRECT : data.eloChange < 0 ? ERROR : MUTED_LIGHT;
  ctx.font = "bold 13px monospace";
  ctx.fillStyle = eloColor;
  ctx.textAlign = "right";
  ctx.fillText(eloStr, W - 32, 36);

  // ── Placement - large ──
  ctx.font = "bold 86px monospace";
  ctx.fillStyle = placementColor;
  ctx.textAlign = "left";
  ctx.fillText(ordinal(data.placement), 32, 138);

  ctx.font = "500 13px monospace";
  ctx.fillStyle = MUTED_LIGHT;
  ctx.fillText(`of ${data.totalPlayers} players`, 32, 158);

  // ── Right column stats ──
  const statsX = W - 180;

  // WPM
  const wpmInt = Math.floor(data.wpm);
  const wpmDec = (data.wpm % 1).toFixed(2).slice(1);
  ctx.font = "500 11px monospace";
  ctx.fillStyle = MUTED_LIGHT;
  ctx.textAlign = "left";
  ctx.letterSpacing = "1px";
  ctx.fillText("WPM", statsX, 60);
  ctx.letterSpacing = "0px";

  ctx.font = "bold 36px monospace";
  ctx.fillStyle = TEXT;
  ctx.fillText(wpmInt.toString(), statsX, 96);
  const wIntW = ctx.measureText(wpmInt.toString()).width;
  ctx.font = "bold 18px monospace";
  ctx.fillStyle = TEXT + "50";
  ctx.fillText(wpmDec, statsX + wIntW, 93);

  // Accuracy
  drawStat(
    ctx,
    statsX,
    120,
    "accuracy",
    Math.floor(data.accuracy) + "%",
    TEXT + "cc",
    36
  );

  drawFooter(ctx, W, H, data.username, data.date, rankColor);
}

export function useResultCard(data: ResultCardData) {
  const generate = useCallback((): HTMLCanvasElement => {
    const W = 640,
      H = 280;
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return canvas;

    if (data.variant === "solo") {
      drawSoloCard(ctx, W, H, data);
    } else {
      drawRankedCard(ctx, W, H, data);
    }

    return canvas;
  }, [data]);

  const download = useCallback(() => {
    const canvas = generate();
    const link = document.createElement("a");
    link.download = `typeoff-${data.variant}-${Date.now()}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }, [generate, data.variant]);

  const copyToClipboard = useCallback(async () => {
    const canvas = generate();
    return new Promise<void>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error("Canvas to blob failed"));
          return;
        }
        navigator.clipboard
          .write([new ClipboardItem({ "image/png": blob })])
          .then(resolve)
          .catch(reject);
      }, "image/png");
    });
  }, [generate]);

  return { download, copyToClipboard };
}
