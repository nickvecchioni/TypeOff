"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_LINKS = [
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/ranks", label: "Ranks" },
  { href: "/solo", label: "Solo" },
  { href: "/clans", label: "Clans" },
  { href: "/pro", label: "Pro", isPro: true },
];

export function NavLinks() {
  const pathname = usePathname();

  return (
    <>
      {NAV_LINKS.map((link) => {
        const isActive =
          pathname === link.href || pathname.startsWith(link.href + "/");

        return (
          <Link
            key={link.href}
            href={link.href}
            className={`hidden md:inline text-sm transition-colors ${
              isActive
                ? link.isPro
                  ? "text-amber-400 font-medium"
                  : "text-accent font-medium"
                : link.isPro
                  ? "text-amber-400/70 hover:text-amber-400"
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
