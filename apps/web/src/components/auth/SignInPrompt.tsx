"use client";

import Link from "next/link";

interface SignInPromptProps {
  title?: string;
  message?: string;
}

export function SignInPrompt({
  title = "Sign in to continue",
  message = "Create an account to track your stats, compete in ranked races, and unlock cosmetics.",
}: SignInPromptProps) {
  return (
    <main className="flex-1 flex items-center justify-center px-4">
      <div className="text-center space-y-4 animate-fade-in max-w-sm">
        <h1 className="text-lg font-bold text-text">{title}</h1>
        <p className="text-xs text-muted/65 leading-relaxed">{message}</p>
        <div className="flex items-center justify-center gap-3 pt-1">
          <Link
            href="/signin"
            className="text-sm font-semibold text-accent bg-accent/[0.08] hover:bg-accent/[0.15] ring-1 ring-accent/20 px-5 py-2.5 rounded-lg transition-colors"
          >
            Sign in
          </Link>
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
