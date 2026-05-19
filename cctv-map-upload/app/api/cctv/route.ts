import { NextRequest, NextResponse } from "next/server";

import {
  distanceMeters,
  loadCctvItems,
  loadNearbyTiles
} from "../../../lib/cctvData";

export const runtime = "nodejs";
export const revalidate = 86400;

const MAX_SEARCH_RESULTS = 500;
const MAX_NEARBY_RESULTS = 120;

export async function GET(request: NextRequest) {
  const keyword = request.nextUrl.searchParams.get("keyword")?.trim().toLowerCase() ?? "";
  const purpose = request.nextUrl.searchParams.get("purpose")?.trim() ?? "전체";
  const lat = Number(request.nextUrl.searchParams.get("lat"));
  const lng = Number(request.nextUrl.searchParams.get("lng"));
  const hasLocation = Number.isFinite(lat) && Number.isFinite(lng);

  try {
    if (!keyword && hasLocation) {
      const center = { lat, lng };
      const nearby = await loadNearbyTiles(lat, lng, 0);
      const results = nearby
        .filter((item) => purpose === "전체" || item.purpose === purpose)
        .map((item) => ({
          ...item,
          distance: Math.round(distanceMeters(center, { lat: item.lat, lng: item.lng }))
        }))
        .sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0))
        .slice(0, MAX_NEARBY_RESULTS);

      return NextResponse.json({
        source: "행정안전부 CCTV 정보",
        mode: "nearby",
        totalReturned: results.length,
        maxResults: MAX_NEARBY_RESULTS,
        items: results
      });
    }

    const items = await loadCctvItems();
    const results = [];

    for (const item of items) {
      if (purpose !== "전체" && item.purpose !== purpose) continue;

      const searchableText = [
        item.name,
        item.address,
        item.roadAddress,
        item.lotAddress,
        item.manager,
        item.managementNumber,
        item.seoArea,
        item.direction
      ]
        .join(" ")
        .toLowerCase();

      if (keyword && !searchableText.includes(keyword)) continue;

      results.push(item);
      if (results.length >= MAX_SEARCH_RESULTS) break;
    }

    return NextResponse.json({
      source: "행정안전부 CCTV 정보",
      mode: keyword ? "search" : "default",
      totalReturned: results.length,
      maxResults: MAX_SEARCH_RESULTS,
      items: results
    });
  } catch (error) {
    return NextResponse.json(
      {
        message: "공공데이터를 불러오지 못했습니다.",
        detail: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 502 }
    );
  }
}
