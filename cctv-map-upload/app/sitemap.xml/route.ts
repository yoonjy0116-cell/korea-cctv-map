import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const revalidate = 86400;

const SITE_URL = "https://cctv.idlun.com";
const SITEMAP_SIZE = 50000;
const CCTV_TOTAL_COUNT = 357891;

export function GET() {
  const pageCount = Math.ceil(CCTV_TOTAL_COUNT / SITEMAP_SIZE);
  const sitemaps = Array.from({ length: pageCount }, (_, index) => {
    return `<sitemap><loc>${SITE_URL}/sitemaps/cctv/${index}.xml</loc></sitemap>`;
  }).join("");
  const staticSitemap = `<sitemap><loc>${SITE_URL}/sitemaps/static</loc></sitemap>`;
  const regionSitemap = `<sitemap><loc>${SITE_URL}/sitemaps/region</loc></sitemap>`;

  const xml = `<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${staticSitemap}${sitemaps}${regionSitemap}</sitemapindex>`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8"
    }
  });
}
