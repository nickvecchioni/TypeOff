"use client";

import { useEffect, useState } from "react";

export function ScrollDownHint() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const main = document.querySelector("main");
    if (!main) return;

    function handleScroll() {
      if (main!.scrollTop > 40) setVisible(false);
    }

    main.addEventListener("scroll", handleScroll, { passive: true });
    return () => main.removeEventListener("scroll", handleScroll);
  }, []);

  if (!visible) return null;

  return (
    <div
      className="flex justify-center mt-6 transition-opacity duration-500"
      style={{ opacity: visible ? 0.3 : 0 }}
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-muted"
        style={{ animation: "bounce-down 1.5s ease-in-out infinite" }}
      >
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </div>
  );
}
