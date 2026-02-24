"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_LINKS = [
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/ranks", label: "Ranks" },
  { href: "/solo", label: "Solo" },
  { href: "/cosmetics", label: "Cosmetics" },
  { href: "/pro", label: "Pro", className: "text-accent/70" },
];

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const close = useCallback(() => setOpen(false), []);

  return (
    <>
      {/* Hamburger button */}
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="relative z-50 flex items-center justify-center w-8 h-8 text-muted hover:text-text transition-colors md:hidden"
        aria-label={open ? "Close menu" : "Open menu"}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 18 18"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        >
          {open ? (
            <>
              <line x1="4" y1="4" x2="14" y2="14" />
              <line x1="14" y1="4" x2="4" y2="14" />
            </>
          ) : (
            <>
              <line x1="2" y1="5" x2="16" y2="5" />
              <line x1="2" y1="9" x2="16" y2="9" />
              <line x1="2" y1="13" x2="16" y2="13" />
            </>
          )}
        </svg>
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-bg/80 backdrop-blur-sm md:hidden"
          onClick={close}
        />
      )}

      {/* Slide-down panel */}
      <div
        className={`fixed top-0 left-0 right-0 z-40 bg-surface border-b border-white/[0.06] pt-14 pb-4 px-4 transition-transform duration-200 ease-out md:hidden ${
          open ? "translate-y-0" : "-translate-y-full"
        }`}
      >
        <nav className="flex flex-col gap-1">
          {NAV_LINKS.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={close}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  isActive
                    ? "bg-white/[0.06] text-text font-medium"
                    : link.className
                      ? `${link.className} hover:text-accent hover:bg-white/[0.04]`
                      : "text-muted hover:text-text hover:bg-white/[0.04]"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
          <div className="border-t border-white/[0.06] mt-2 pt-2">
            <Link
              href="/bug-report"
              onClick={close}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                pathname === "/bug-report"
                  ? "bg-white/[0.06] text-text font-medium"
                  : "text-muted/65 hover:text-muted hover:bg-white/[0.04]"
              }`}
            >
              Report a Bug
            </Link>
          </div>
        </nav>
      </div>
    </>
  );
}
