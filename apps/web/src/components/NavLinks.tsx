"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";

const NAV_LINKS = [
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/solo", label: "Solo" },
  { href: "/analytics", label: "Analytics", authRequired: true },
  { href: "/cosmetics", label: "Cosmetics", authRequired: true },
  { href: "/pro", label: "Pro", isPro: true, authRequired: true },
];

export function NavLinks() {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <>
      {NAV_LINKS.filter((link) => !link.authRequired || session).map((link) => {
        const isActive =
          pathname === link.href || pathname.startsWith(link.href + "/");

        return (
          <Link
            key={link.href}
            href={link.href}
            data-tour={`nav-${link.label.toLowerCase()}`}
            className={`hidden md:inline text-sm transition-colors ${
              isActive
                ? link.isPro
                  ? "text-accent font-medium drop-shadow-[0_0_8px_rgba(77,158,255,0.5)]"
                  : "text-text font-medium"
                : link.isPro
                  ? "text-accent/90 hover:text-accent hover:drop-shadow-[0_0_6px_rgba(77,158,255,0.4)]"
                  : "text-muted hover:text-text"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </>
  );
}
