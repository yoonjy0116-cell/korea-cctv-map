import { NextResponse } from "next/server";

import { getRegionSummaries } from "../../../lib/cctvData";

export const runtime = "nodejs";
export const revalidate = 86400;

const SITE_URL = "https://cctv.idlun.com";

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export async function GET() {
  const regions = await getRegionSummaries();
  const urls = regions
    .map((region) => {
      const path = region.path.map(encodeURIComponent).join("/");
      const loc = `${SITE_URL}/region/${path}`;
      return `<url><loc>${escapeXml(loc)}</loc></url>`;
    })
    .join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8"
    }
  });
}
