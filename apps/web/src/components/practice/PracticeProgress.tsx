"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

interface Snapshot {
  accuracy: number;
  totalCount: number;
  date: string;
}

interface ProgressItem {
  target: string;
  type: string;
  snapshots: Snapshot[];
}

export function PracticeProgress() {
  const { data: session } = useSession();
  const isPro = session?.user?.isPro ?? false;
  const [progress, setProgress] = useState<ProgressItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.user?.id || !isPro) {
      setLoading(false);
      return;
    }
    fetch("/api/practice-progress")
      .then((r) => r.json())
      .then((d) => { if (d.progress) setProgress(d.progress); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [session?.user?.id, isPro]);

  if (loading) {
    return <div className="h-20 rounded-xl bg-surface/30 animate-pulse" />;
  }

  if (progress.length === 0) {
    return (
      <div className="rounded-xl bg-surface/40 ring-1 ring-white/[0.04] px-4 py-3 text-center">
        <p className="text-xs text-muted/60">No progress data yet. Complete solo practice sessions to start tracking accuracy trends.</p>
      </div>
    );
  }

  // Sort by most recent snapshot, show items with at least 2 data points
  const trackable = progress
    .filter((p) => p.snapshots.length >= 2)
    .sort((a, b) => {
      const aLast = a.snapshots[a.snapshots.length - 1];
      const bLast = b.snapshots[b.snapshots.length - 1];
      return new Date(bLast.date).getTime() - new Date(aLast.date).getTime();
    })
    .slice(0, 10);

  if (trackable.length === 0) {
    return (
      <div className="rounded-xl bg-surface/40 ring-1 ring-white/[0.04] px-4 py-3 text-center">
        <p className="text-xs text-muted/60">Complete a few more drills to see progress trends.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {trackable.map((item) => (
        <ProgressRow key={`${item.type}-${item.target}`} item={item} />
      ))}
    </div>
  );
}

function ProgressRow({ item }: { item: ProgressItem }) {
  const snapshots = item.snapshots;
  const first = snapshots[0];
  const last = snapshots[snapshots.length - 1];
  const delta = last.accuracy - first.accuracy;
  const deltaPct = Math.round(delta * 100);
  const isPositive = delta > 0;

  return (
    <div className="rounded-lg bg-surface/40 ring-1 ring-white/[0.04] px-4 py-2.5 flex items-center gap-3">
      <div className="w-12 shrink-0">
        <span className="text-accent font-bold text-sm">{item.target}</span>
        <span className="text-[11px] text-muted/50 block">{item.type}</span>
      </div>

      {/* Sparkline */}
      <div className="flex-1 min-w-0">
        <Sparkline data={snapshots.map((s) => s.accuracy)} />
      </div>

      {/* Current accuracy */}
      <div className="text-right shrink-0 w-16">
        <span className="text-xs font-bold text-text tabular-nums">
          {Math.round(last.accuracy * 100)}%
        </span>
        <span className={`block text-xs font-medium tabular-nums ${
          isPositive ? "text-correct/70" : delta < 0 ? "text-error/70" : "text-muted/50"
        }`}>
          {isPositive ? "↑" : delta < 0 ? "↓" : "—"}{" "}
          {Math.abs(deltaPct)}%
        </span>
      </div>
    </div>
  );
}

function Sparkline({ data }: { data: number[] }) {
  if (data.length < 2) return null;

  const w = 120;
  const h = 24;
  const padding = 2;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 0.01;

  const points = data.map((v, i) => {
    const x = padding + (i / (data.length - 1)) * (w - padding * 2);
    const y = h - padding - ((v - min) / range) * (h - padding * 2);
    return `${x},${y}`;
  });

  const isImproving = data[data.length - 1] > data[0];
  const color = isImproving ? "#22c55e" : "#ef4444";

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height: h }}>
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        opacity="0.7"
      />
    </svg>
  );
}
