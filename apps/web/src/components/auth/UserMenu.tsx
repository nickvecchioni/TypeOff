"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";

export function UserMenu() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return <div className="w-8 h-8 rounded-full bg-surface animate-pulse" />;
  }

  if (!session?.user) {
    return (
      <Link
        href="/login"
        className="text-sm text-muted hover:text-accent transition-colors"
      >
        Sign in
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-text">{session.user.name}</span>
      {session.user.image && (
        <img
          src={session.user.image}
          alt=""
          className="w-8 h-8 rounded-full"
        />
      )}
      <button
        onClick={() => signOut()}
        className="text-sm text-muted hover:text-error transition-colors"
      >
        Sign out
      </button>
    </div>
  );
}
