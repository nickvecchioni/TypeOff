"use client";

function formatTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

const SPEEDS = [0.5, 1, 2, 4];

interface ReplayControlsProps {
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  speed: number;
  onPlay: () => void;
  onPause: () => void;
  onSeek: (time: number) => void;
  onSetSpeed: (speed: number) => void;
}

export function ReplayControls({
  currentTime,
  duration,
  isPlaying,
  speed,
  onPlay,
  onPause,
  onSeek,
  onSetSpeed,
}: ReplayControlsProps) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-surface/40 ring-1 ring-white/[0.04] px-4 py-2.5">
      {/* Play/Pause */}
      <button
        onClick={isPlaying ? onPause : onPlay}
        className="text-text hover:text-accent transition-colors shrink-0"
        aria-label={isPlaying ? "Pause" : "Play"}
      >
        {isPlaying ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="4" width="4" height="16" rx="1" />
            <rect x="14" y="4" width="4" height="16" rx="1" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>

      {/* Time */}
      <span className="text-xs text-muted tabular-nums shrink-0 w-12 text-right">
        {formatTime(currentTime)}
      </span>

      {/* Scrubber */}
      <input
        type="range"
        min={0}
        max={duration}
        value={currentTime}
        onChange={(e) => onSeek(parseFloat(e.target.value))}
        className="flex-1 h-1 bg-surface-bright rounded-full appearance-none cursor-pointer accent-accent [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent [&::-webkit-slider-thumb]:appearance-none"
      />

      {/* Duration */}
      <span className="text-xs text-muted/40 tabular-nums shrink-0 w-12">
        {formatTime(duration)}
      </span>

      {/* Speed buttons */}
      <div className="flex items-center gap-1 shrink-0">
        {SPEEDS.map((s) => (
          <button
            key={s}
            onClick={() => onSetSpeed(s)}
            className={`text-[10px] font-bold px-1.5 py-0.5 rounded transition-colors tabular-nums ${
              speed === s
                ? "bg-accent/20 text-accent"
                : "text-muted/40 hover:text-muted"
            }`}
          >
            {s}x
          </button>
        ))}
      </div>
    </div>
  );
}
