import { NextResponse } from "next/server";

import { countCctvRows } from "@/lib/cctvData";

export const runtime = "nodejs";
export const revalidate = 86400;

const SITE_URL = "https://cctv.idlun.com";
const SITEMAP_SIZE = 50000;

export async function GET() {
  const total = await countCctvRows();
  const pageCount = Math.ceil(total / SITEMAP_SIZE);
  const sitemaps = Array.from({ length: pageCount }, (_, index) => {
    return `<sitemap><loc>${SITE_URL}/sitemaps/cctv/${index}.xml</loc></sitemap>`;
  }).join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${sitemaps}</sitemapindex>`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8"
    }
  });
}
