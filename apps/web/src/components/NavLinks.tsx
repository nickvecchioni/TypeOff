"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_LINKS = [
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/ranks", label: "Ranks" },
  { href: "/solo", label: "Solo" },
  { href: "/cosmetics", label: "Cosmetics" },
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
                ? "text-text font-medium"
                : link.isPro
                  ? "text-accent/70 hover:text-accent"
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
