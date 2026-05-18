import { NextRequest, NextResponse } from "next/server";

import { getCctvIds } from "@/lib/cctvData";

export const runtime = "nodejs";
export const revalidate = 86400;

const SITE_URL = "https://cctv.idlun.com";
const SITEMAP_SIZE = 50000;

type Props = {
  params: Promise<{
    page: string;
  }>;
};

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export async function GET(_request: NextRequest, { params }: Props) {
  const { page } = await params;
  const pageNumber = Number(page.replace(".xml", ""));

  if (!Number.isInteger(pageNumber) || pageNumber < 0) {
    return new NextResponse("Not found", { status: 404 });
  }

  const ids = await getCctvIds(pageNumber * SITEMAP_SIZE, SITEMAP_SIZE);
  const urls = ids
    .map((id) => {
      const loc = `${SITE_URL}/cctv/${encodeURIComponent(id)}`;
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
