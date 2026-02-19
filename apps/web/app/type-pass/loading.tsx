export default function TypePassLoading() {
  return (
    <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-8">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="h-8 w-48 rounded bg-surface/40 animate-pulse" />
        <div className="h-6 rounded bg-surface/30 animate-pulse" />
        <div className="h-48 rounded-xl bg-surface/40 animate-pulse" />
        <div className="h-64 rounded-xl bg-surface/30 animate-pulse" />
      </div>
    </main>
  );
}
