"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";

export function UsernameGuard({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const hasRendered = useRef(false);

  const isExempt = pathname === "/setup-username" || pathname === "/login";
  const needsUsername =
    status === "authenticated" && !session?.user?.username && !isExempt;

  useEffect(() => {
    if (needsUsername) {
      router.replace("/setup-username");
    }
  }, [needsUsername, router]);

  // Only suppress rendering on the very first load (before we know auth state).
  // Once we've rendered children, never return null — session refreshes mid-race
  // would unmount the entire component tree and destroy state.
  if (!hasRendered.current) {
    if (status === "loading" || needsUsername) {
      return null;
    }
    hasRendered.current = true;
  }

  return <>{children}</>;
}
