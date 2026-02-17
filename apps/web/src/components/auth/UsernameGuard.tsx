"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";

export function UsernameGuard({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  const isExempt = pathname === "/setup-username" || pathname === "/login";
  const needsUsername =
    status === "authenticated" && !session?.user?.username && !isExempt;

  useEffect(() => {
    if (needsUsername) {
      router.replace("/setup-username");
    }
  }, [needsUsername, router]);

  // While loading session or about to redirect, show nothing to avoid flash
  if (status === "loading" || needsUsername) {
    return null;
  }

  return <>{children}</>;
}
