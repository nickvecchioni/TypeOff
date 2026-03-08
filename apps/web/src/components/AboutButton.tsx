"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function AboutButton() {
  const pathname = usePathname();
  const isActive = pathname === "/about";

  return (
    <div className="relative group/tt flex items-center">
      <Link
        href="/about"
        className={`relative p-1.5 transition-colors ${
          isActive ? "text-text" : "text-muted hover:text-text"
        }`}
        aria-label="About"
      >
        {/* Info circle icon */}
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4" />
          <path d="M12 8h.01" />
        </svg>
      </Link>
      <span className="absolute top-full left-1/2 -translate-x-1/2 mt-1 px-2 py-0.5 rounded bg-surface ring-1 ring-white/[0.08] text-xs text-muted/70 whitespace-nowrap opacity-0 group-hover/tt:opacity-100 pointer-events-none transition-opacity duration-150 z-50">
        About
      </span>
    </div>
  );
}
