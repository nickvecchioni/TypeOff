export default function LeaderboardLoading() {
  const gridCols =
    "grid-cols-[2rem_1fr_4rem_3.5rem] sm:grid-cols-[2rem_1fr_4.5rem_5rem_5rem_3.5rem_3.5rem_3.5rem]";

  return (
    <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-baseline justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="h-5 w-32 rounded bg-surface/40 animate-pulse" />
            <div className="flex gap-1">
              <div className="h-7 w-16 rounded-md bg-accent/15 animate-pulse" />
              <div className="h-7 w-12 rounded-md bg-surface/30 animate-pulse" />
            </div>
          </div>
          <div className="h-4 w-20 rounded bg-surface/30 animate-pulse" />
        </div>

        {/* Universe selector skeleton */}
        <div className="flex gap-1.5 mb-4">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-7 rounded-md bg-surface/30 animate-pulse"
              style={{ width: `${48 + i * 8}px` }}
            />
          ))}
        </div>

        {/* Table header */}
        <div
          className={`grid ${gridCols} items-center gap-3 px-4 py-2 border-b border-white/[0.04]`}
        >
          <span />
          <div className="h-3 w-12 rounded bg-surface/30 animate-pulse" />
          <div className="h-3 w-8 rounded bg-surface/30 animate-pulse ml-auto" />
          <div className="h-3 w-10 rounded bg-surface/30 animate-pulse ml-auto hidden sm:block" />
          <div className="h-3 w-10 rounded bg-surface/30 animate-pulse ml-auto hidden sm:block" />
          <div className="h-3 w-6 rounded bg-surface/30 animate-pulse ml-auto hidden sm:block" />
          <div className="h-3 w-8 rounded bg-surface/30 animate-pulse ml-auto hidden sm:block" />
          <div className="h-3 w-8 rounded bg-surface/30 animate-pulse ml-auto" />
        </div>

        {/* Row skeletons */}
        <div>
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className={`grid ${gridCols} items-center gap-3 px-4 py-2.5 rounded-lg ${i < 3 ? "bg-surface/30" : ""}`}
            >
              <div
                className="h-4 w-4 rounded bg-surface/40 animate-pulse"
                style={{ animationDelay: `${i * 50}ms` }}
              />
              <div className="flex items-center gap-2.5">
                <div
                  className="w-2 h-2 rounded-full bg-surface/40 animate-pulse shrink-0"
                  style={{ animationDelay: `${i * 50}ms` }}
                />
                <div className="flex flex-col gap-1">
                  <div
                    className="h-3.5 rounded bg-surface/40 animate-pulse"
                    style={{
                      width: `${70 + ((i * 37) % 50)}px`,
                      animationDelay: `${i * 50}ms`,
                    }}
                  />
                  <div
                    className="h-2.5 w-12 rounded bg-surface/25 animate-pulse"
                    style={{ animationDelay: `${i * 50}ms` }}
                  />
                </div>
              </div>
              <div
                className="h-3.5 w-8 rounded bg-surface/40 animate-pulse ml-auto"
                style={{ animationDelay: `${i * 50}ms` }}
              />
              <div
                className="h-3.5 w-10 rounded bg-surface/30 animate-pulse ml-auto hidden sm:block"
                style={{ animationDelay: `${i * 50}ms` }}
              />
              <div
                className="h-3.5 w-10 rounded bg-surface/30 animate-pulse ml-auto hidden sm:block"
                style={{ animationDelay: `${i * 50}ms` }}
              />
              <div
                className="h-3.5 w-6 rounded bg-surface/25 animate-pulse ml-auto hidden sm:block"
                style={{ animationDelay: `${i * 50}ms` }}
              />
              <div
                className="h-3.5 w-6 rounded bg-surface/25 animate-pulse ml-auto hidden sm:block"
                style={{ animationDelay: `${i * 50}ms` }}
              />
              <div
                className="h-3.5 w-6 rounded bg-surface/25 animate-pulse ml-auto"
                style={{ animationDelay: `${i * 50}ms` }}
              />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
