"use client";

import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex-1 flex items-center justify-center px-4">
      <div className="text-center space-y-4 animate-fade-in">
        <h1 className="text-lg font-bold text-text">Something went wrong</h1>
        <p className="text-xs text-muted/65 max-w-sm mx-auto">
          {error.digest
            ? `An unexpected error occurred (${error.digest}).`
            : "An unexpected error occurred."}
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="text-sm font-semibold text-accent bg-accent/[0.08] hover:bg-accent/[0.15] ring-1 ring-accent/20 px-4 py-2 rounded-lg transition-colors"
          >
            Try again
          </button>
          <Link
            href="/"
            className="text-sm text-muted hover:text-text transition-colors"
          >
            Go home
          </Link>
        </div>
      </div>
    </main>
  );
}
