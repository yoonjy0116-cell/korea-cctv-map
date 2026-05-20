"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

type AdsenseAdProps = {
  className?: string;
  label: string;
  slot?: string;
};

const AD_CLIENT = "ca-pub-5522642786914614";
const DEFAULT_SLOT = "2270119583";

export default function AdsenseAd({ className = "", label, slot = DEFAULT_SLOT }: AdsenseAdProps) {
  useEffect(() => {
    try {
      window.adsbygoogle = window.adsbygoogle || [];
      window.adsbygoogle.push({});
    } catch {
      // Ad blockers can prevent AdSense from loading; the page should still work.
    }
  }, []);

  return (
    <aside className={`adSlot ${className}`} aria-label={label}>
      <ins
        className="adsbygoogle"
        data-ad-client={AD_CLIENT}
        data-ad-format="auto"
        data-ad-slot={slot}
        data-full-width-responsive="true"
      />
    </aside>
  );
}
