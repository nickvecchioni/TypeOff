"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";

export function AuthNavLinks() {
  const { data: session } = useSession();

  if (!session?.user) return null;

  return (
    <>
      <Link
        href="/solo"
        className="text-sm text-muted hover:text-text transition-colors"
      >
        Solo
      </Link>
    </>
  );
}
