"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

type AdFormat = "horizontal" | "rectangle" | "vertical" | "auto";

const FORMAT_STYLES: Record<AdFormat, { minWidth?: number; minHeight: number; display: string }> = {
  horizontal: { minHeight: 90, display: "block" },
  rectangle: { minHeight: 250, minWidth: 300, display: "inline-block" },
  vertical: { minHeight: 600, display: "block" },
  auto: { minHeight: 90, display: "block" },
};

interface AdBannerProps {
  slot: string;
  format?: AdFormat;
  className?: string;
}

export function AdBanner({ slot, format = "auto", className = "" }: AdBannerProps) {
  const { data: session, status } = useSession();
  const adRef = useRef<HTMLModElement>(null);
  const pushed = useRef(false);

  const isPro = session?.user?.isPro ?? false;

  useEffect(() => {
    if (isPro || status === "loading" || pushed.current) return;
    if (!adRef.current) return;

    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      pushed.current = true;
    } catch {
      // AdSense not loaded yet or ad blocker active
    }
  }, [isPro, status]);

  // Don't render ads for Pro users
  if (status !== "loading" && isPro) return null;

  // Don't render if no client ID configured
  const clientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;
  if (!clientId) return null;

  const style = FORMAT_STYLES[format];

  return (
    <div className={`flex items-center justify-center overflow-hidden ${className}`}>
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{
          display: style.display,
          width: style.minWidth ? `${style.minWidth}px` : "100%",
          minHeight: `${style.minHeight}px`,
        }}
        data-ad-client={clientId}
        data-ad-slot={slot}
        data-ad-format={format === "auto" ? "auto" : undefined}
        data-full-width-responsive={format === "auto" ? "true" : undefined}
      />
    </div>
  );
}
