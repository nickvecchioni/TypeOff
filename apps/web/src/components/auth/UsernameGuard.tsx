"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";

export function UsernameGuard({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (
      status === "authenticated" &&
      !session?.user?.username &&
      pathname !== "/setup-username" &&
      pathname !== "/login"
    ) {
      router.replace("/setup-username");
    }
  }, [status, session, pathname, router]);

  return <>{children}</>;
}
