import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex-1 flex items-center justify-center px-4">
      <div className="text-center space-y-4 animate-fade-in">
        <div className="text-5xl font-black tabular-nums text-accent/50">404</div>
        <h1 className="text-lg font-bold text-text">Page not found</h1>
        <p className="text-xs text-muted/65 max-w-xs mx-auto">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <Link
            href="/"
            className="text-sm font-semibold text-accent bg-accent/[0.08] hover:bg-accent/[0.15] ring-1 ring-accent/20 px-4 py-2 rounded-lg transition-colors"
          >
            Go home
          </Link>
          <Link
            href="/race"
            className="text-sm text-muted hover:text-text transition-colors"
          >
            Start a race
          </Link>
        </div>
      </div>
    </main>
  );
}
