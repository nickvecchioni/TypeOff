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
    <Link href="/" onClick={handleClick} className="nav-logo text-accent font-bold text-base flex items-center">
      <span className="nav-logo-text transition-[text-shadow] duration-300">
        TypeOff
      </span>
      <span className="inline-block w-[2px] h-[1em] bg-accent animate-blink ml-0.5 translate-y-px" />
    </Link>
  );
}
