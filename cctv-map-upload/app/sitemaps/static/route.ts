import { NextResponse } from "next/server";

export const revalidate = 86400;

const SITE_URL = "https://cctv.idlun.com";

const pages = [
  {
    path: "/",
    priority: "1.0",
    changefreq: "daily"
  },
  {
    path: "/cctv-request",
    priority: "0.8",
    changefreq: "monthly"
  }
];

export function GET() {
  const urls = pages
    .map((page) => {
      return `<url><loc>${SITE_URL}${page.path}</loc><changefreq>${page.changefreq}</changefreq><priority>${page.priority}</priority></url>`;
    })
    .join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8"
    }
  });
}
