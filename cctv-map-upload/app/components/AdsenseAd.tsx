"use client";

import { useEffect } from "react";

const ADSENSE_CLIENT = "ca-pub-5522642786914614";
const ADSENSE_SLOT = "2270119583";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

type AdsenseAdProps = {
  className?: string;
  label?: string;
};

export default function AdsenseAd({ className = "", label = "광고" }: AdsenseAdProps) {
  useEffect(() => {
    try {
      window.adsbygoogle = window.adsbygoogle || [];
      window.adsbygoogle.push({});
    } catch {
      // AdSense can throw while the script is still initializing.
    }
  }, []);

  return (
    <aside className={`adSlot ${className}`} aria-label={label}>
      <ins
        className="adsbygoogle"
        data-ad-client={ADSENSE_CLIENT}
        data-ad-format="auto"
        data-ad-slot={ADSENSE_SLOT}
        data-full-width-responsive="true"
        style={{ display: "block" }}
      />
    </aside>
  );
}
