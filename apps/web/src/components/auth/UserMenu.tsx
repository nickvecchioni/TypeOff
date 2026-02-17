"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";

export function UserMenu() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return <div className="w-8 h-8 rounded-full bg-surface animate-pulse" />;
  }

  if (!session?.user) {
    return null;
  }

  const profileHref = session.user.username
    ? `/profile/${session.user.username}`
    : "#";

  return (
    <Link
      href={profileHref}
      className="text-sm text-text hover:text-accent transition-colors"
    >
      {session.user.username ?? "set username"}
    </Link>
  );
}
