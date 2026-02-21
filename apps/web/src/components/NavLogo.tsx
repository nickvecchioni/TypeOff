"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLogo() {
  const pathname = usePathname();

  function handleClick() {
    if (pathname === "/") {
      window.dispatchEvent(new CustomEvent("nav-go-home"));
    }
  }

  return (
    <Link href="/" onClick={handleClick} className="nav-logo text-accent font-bold text-base">
      <span className="nav-logo-text transition-[text-shadow] duration-300">
        TypeOff
      </span>
    </Link>
  );
}
