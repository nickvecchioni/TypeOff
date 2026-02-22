"use client";

import { useCallback } from "react";

const BG = "#0c0c12";
const SURFACE = "#16162a";
const ACCENT = "#4d9eff";
const TEXT = "#e8e8f0";
const MUTED = "#4b5563";
const MUTED_LIGHT = "#6b7280";
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

function drawDotGrid(ctx: CanvasRenderingContext2D, W: number, H: number) {
  ctx.fillStyle = "rgba(255,255,255,0.022)";
  for (let x = 40; x < W; x += 40) {
    for (let y = 40; y < H; y += 40) {
      ctx.beginPath();
      ctx.arc(x, y, 1, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawCard(ctx: CanvasRenderingContext2D, W: number, H: number) {
  ctx.fillStyle = SURFACE;
  roundRect(ctx, 24, 24, W - 48, H - 48, 10);
  ctx.fill();
}

function drawHeader(
  ctx: CanvasRenderingContext2D,
  W: number,
  badgeText: string,
  accentColor: string
) {
  // Logo
  ctx.font = "bold 12px monospace";
  ctx.fillStyle = MUTED_LIGHT;
  ctx.textAlign = "left";
  ctx.fillText("typeoff.gg", 44, 54);

  // Badge
  const badgeW = badgeText.length * 8.4 + 20;
  const badgeX = W - 44 - badgeW;
  ctx.fillStyle = accentColor + "22";
  roundRect(ctx, badgeX, 40, badgeW, 20, 4);
  ctx.fill();
  ctx.strokeStyle = accentColor + "44";
  ctx.lineWidth = 1;
  roundRect(ctx, badgeX, 40, badgeW, 20, 4);
  ctx.stroke();
  ctx.font = "bold 10px monospace";
  ctx.fillStyle = accentColor;
  ctx.textAlign = "center";
  ctx.fillText(badgeText, badgeX + badgeW / 2, 53.5);

  // Divider
  ctx.fillStyle = "rgba(255,255,255,0.05)";
  ctx.fillRect(44, 66, W - 88, 1);
}

function drawFooter(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  username: string,
  date: string
) {
  ctx.fillStyle = "rgba(255,255,255,0.04)";
  ctx.fillRect(44, H - 68, W - 88, 1);

  ctx.font = "bold 12px monospace";
  ctx.fillStyle = TEXT + "99";
  ctx.textAlign = "left";
  ctx.fillText(`@${username}`, 44, H - 48);

  ctx.font = "12px monospace";
  ctx.fillStyle = MUTED;
  ctx.textAlign = "right";
  ctx.fillText(date, W - 44, H - 48);
}

function drawSoloCard(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  data: SoloCardData
) {
  // Background
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);

  drawDotGrid(ctx, W, H);

  // Accent left stripe
  const stripeGrad = ctx.createLinearGradient(0, 0, 0, H);
  stripeGrad.addColorStop(0, ACCENT);
  stripeGrad.addColorStop(1, ACCENT + "30");
  ctx.fillStyle = stripeGrad;
  ctx.fillRect(0, 0, 3, H);

  drawCard(ctx, W, H);

  // Top accent line on card
  ctx.fillStyle = ACCENT + "50";
  ctx.fillRect(24, 24, W - 48, 1);

  drawHeader(ctx, W, "SOLO", ACCENT);

  // WPM — large, accent colored
  const wpmInt = Math.floor(data.wpm);
  const wpmDec = "." + (data.wpm % 1).toFixed(2).slice(2);
  ctx.font = "bold 72px monospace";
  ctx.fillStyle = ACCENT;
  ctx.textAlign = "left";
  ctx.fillText(wpmInt.toString(), 44, 158);
  const intW = ctx.measureText(wpmInt.toString()).width;
  ctx.font = "bold 30px monospace";
  ctx.fillStyle = ACCENT + "70";
  ctx.fillText(wpmDec, 44 + intW + 2, 151);
  ctx.font = "11px monospace";
  ctx.fillStyle = MUTED_LIGHT;
  ctx.fillText("wpm", 44, 173);

  // Accuracy
  const accStr = Math.floor(data.accuracy) + "%";
  ctx.font = "bold 46px monospace";
  ctx.fillStyle = TEXT;
  ctx.textAlign = "left";
  ctx.fillText(accStr, 272, 154);
  ctx.font = "11px monospace";
  ctx.fillStyle = MUTED_LIGHT;
  ctx.fillText("accuracy", 272, 173);

  // Consistency
  const conStr = Math.floor(data.consistency) + "%";
  ctx.font = "bold 46px monospace";
  ctx.fillStyle = TEXT + "bb";
  ctx.textAlign = "left";
  ctx.fillText(conStr, 458, 154);
  ctx.font = "11px monospace";
  ctx.fillStyle = MUTED_LIGHT;
  ctx.fillText("consistency", 458, 173);

  // Mode label
  ctx.font = "12px monospace";
  ctx.fillStyle = MUTED;
  ctx.textAlign = "left";
  ctx.fillText(data.modeLabel, 44, 208);

  drawFooter(ctx, W, H, data.username, data.date);
}

function drawRankedCard(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  data: RankedCardData
) {
  const rankColor = RANK_COLORS[data.rankTier.toLowerCase()] ?? ACCENT;
  const placementColor = PLACEMENT_COLORS[data.placement] ?? TEXT;

  // Background
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);

  drawDotGrid(ctx, W, H);

  // Rank-colored left stripe
  const stripeGrad = ctx.createLinearGradient(0, 0, 0, H);
  stripeGrad.addColorStop(0, rankColor);
  stripeGrad.addColorStop(1, rankColor + "30");
  ctx.fillStyle = stripeGrad;
  ctx.fillRect(0, 0, 3, H);

  drawCard(ctx, W, H);

  // Top rank line on card
  ctx.fillStyle = rankColor + "50";
  ctx.fillRect(24, 24, W - 48, 1);

  drawHeader(ctx, W, "RANKED", rankColor);

  // Placement — large, placement-colored
  ctx.font = "bold 62px monospace";
  ctx.fillStyle = placementColor;
  ctx.textAlign = "left";
  ctx.fillText(ordinal(data.placement), 44, 155);
  ctx.font = "11px monospace";
  ctx.fillStyle = MUTED_LIGHT;
  ctx.fillText(`of ${data.totalPlayers}`, 44, 171);

  // WPM
  const wpmInt = Math.floor(data.wpm);
  const wpmDec = "." + (data.wpm % 1).toFixed(2).slice(2);
  ctx.font = "bold 48px monospace";
  ctx.fillStyle = TEXT;
  ctx.textAlign = "left";
  ctx.fillText(wpmInt.toString(), 242, 152);
  const wIntW = ctx.measureText(wpmInt.toString()).width;
  ctx.font = "bold 21px monospace";
  ctx.fillStyle = TEXT + "70";
  ctx.fillText(wpmDec, 242 + wIntW + 2, 145);
  ctx.font = "11px monospace";
  ctx.fillStyle = MUTED_LIGHT;
  ctx.fillText("wpm", 242, 171);

  // Accuracy
  const accStr = Math.floor(data.accuracy) + "%";
  ctx.font = "bold 48px monospace";
  ctx.fillStyle = TEXT + "cc";
  ctx.textAlign = "left";
  ctx.fillText(accStr, 428, 152);
  ctx.font = "11px monospace";
  ctx.fillStyle = MUTED_LIGHT;
  ctx.fillText("accuracy", 428, 171);

  // Rank label + ELO
  ctx.font = "bold 13px monospace";
  ctx.fillStyle = rankColor;
  ctx.textAlign = "left";
  ctx.fillText(data.rankLabel, 44, 208);
  const rankLabelW = ctx.measureText(data.rankLabel).width;

  ctx.font = "12px monospace";
  ctx.fillStyle = MUTED_LIGHT;
  ctx.fillText(`${data.elo} ELO`, 44 + rankLabelW + 10, 208);

  // ELO change (right-aligned)
  const eloStr = (data.eloChange > 0 ? "+" : "") + data.eloChange;
  const eloColor =
    data.eloChange > 0 ? CORRECT : data.eloChange < 0 ? ERROR : MUTED_LIGHT;
  ctx.font = "bold 13px monospace";
  ctx.fillStyle = eloColor;
  ctx.textAlign = "right";
  ctx.fillText(eloStr, W - 44, 208);

  drawFooter(ctx, W, H, data.username, data.date);
}

export function useResultCard(data: ResultCardData) {
  const generate = useCallback((): HTMLCanvasElement => {
    const W = 640,
      H = 320;
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
