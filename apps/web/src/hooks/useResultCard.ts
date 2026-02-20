"use client";

import { useCallback, useRef } from "react";

interface CardData {
  wpm: number;
  accuracy: number;
  rankLabel: string;
  username: string;
  mode: string;
  date: string;
}

const BG = "#0c0c12";
const ACCENT = "#4d9eff";
const TEXT = "#e8e8f0";
const MUTED = "#6b7280";
const SURFACE = "#1a1a2e";

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
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

export function useResultCard(data: CardData) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const draw = useCallback((canvas: HTMLCanvasElement) => {
    const W = 640, H = 320;
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Background
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, W, H);

    // Accent top border
    ctx.fillStyle = ACCENT;
    ctx.fillRect(0, 0, W, 3);

    // Surface card panel
    ctx.fillStyle = SURFACE;
    roundRect(ctx, 32, 28, W - 64, H - 56, 12);
    ctx.fill();

    // WPM — large
    ctx.font = "bold 72px monospace";
    ctx.fillStyle = ACCENT;
    ctx.textAlign = "left";
    ctx.fillText(Math.floor(data.wpm).toString(), 56, 112);

    ctx.font = "bold 24px monospace";
    ctx.fillStyle = MUTED;
    const wpmDecimal = "." + (data.wpm % 1).toFixed(2).slice(2);
    ctx.font = "bold 72px monospace";
    const intW = ctx.measureText(Math.floor(data.wpm).toString()).width;
    ctx.font = "24px monospace";
    ctx.fillStyle = MUTED;
    ctx.fillText(wpmDecimal, 56 + intW + 2, 112);

    ctx.font = "14px monospace";
    ctx.fillStyle = MUTED;
    ctx.fillText("wpm", 56, 134);

    // Accuracy
    ctx.font = "bold 48px monospace";
    ctx.fillStyle = TEXT;
    ctx.textAlign = "right";
    ctx.fillText(`${Math.floor(data.accuracy)}%`, W - 56, 105);

    ctx.font = "14px monospace";
    ctx.fillStyle = MUTED;
    ctx.fillText("accuracy", W - 56, 128);

    // Rank/mode label
    ctx.textAlign = "left";
    ctx.font = "bold 16px monospace";
    ctx.fillStyle = ACCENT;
    ctx.fillText(data.rankLabel, 56, 190);

    // Bottom row
    ctx.font = "13px monospace";
    ctx.fillStyle = MUTED;
    ctx.textAlign = "left";
    ctx.fillText(`@${data.username}`, 56, 248);

    ctx.textAlign = "center";
    ctx.fillText(data.mode, W / 2, 248);

    ctx.textAlign = "right";
    ctx.fillText(data.date, W - 56, 248);

    // Watermark
    ctx.font = "11px monospace";
    ctx.fillStyle = MUTED + "60";
    ctx.textAlign = "right";
    ctx.fillText("typeoff.gg", W - 56, 272);
  }, [data]);

  const generate = useCallback((): HTMLCanvasElement => {
    const canvas = document.createElement("canvas");
    canvasRef.current = canvas;
    draw(canvas);
    return canvas;
  }, [draw]);

  const download = useCallback(() => {
    const canvas = generate();
    const link = document.createElement("a");
    link.download = `typeoff-${Date.now()}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }, [generate]);

  const copyToClipboard = useCallback(async () => {
    const canvas = generate();
    return new Promise<void>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) { reject(new Error("Canvas to blob failed")); return; }
        navigator.clipboard.write([new ClipboardItem({ "image/png": blob })])
          .then(resolve).catch(reject);
      }, "image/png");
    });
  }, [generate]);

  return { download, copyToClipboard };
}
