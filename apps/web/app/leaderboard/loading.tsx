export default function LeaderboardLoading() {
  return (
    <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-8">
      <div className="max-w-3xl mx-auto">
        {/* Header skeleton */}
        <div className="flex items-baseline justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="h-5 w-32 rounded bg-surface/40 animate-pulse" />
            <div className="flex gap-1">
              <div className="h-7 w-16 rounded-md bg-surface/30 animate-pulse" />
              <div className="h-7 w-12 rounded-md bg-surface/30 animate-pulse" />
              <div className="h-7 w-10 rounded-md bg-surface/30 animate-pulse" />
            </div>
          </div>
          <div className="h-4 w-20 rounded bg-surface/30 animate-pulse" />
        </div>

        {/* Table header skeleton */}
        <div className="h-8 rounded bg-surface/20 animate-pulse mb-1" />

        {/* Row skeletons */}
        <div className="space-y-px">
          {[...Array(10)].map((_, i) => (
            <div
              key={i}
              className="h-11 rounded-lg bg-surface/20 animate-pulse"
              style={{ opacity: 1 - i * 0.08 }}
            />
          ))}
        </div>
      </div>
    </main>
  );
}
