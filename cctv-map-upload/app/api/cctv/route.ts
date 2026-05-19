import { NextRequest, NextResponse } from "next/server";

import {
  distanceMeters,
  loadCctvsInBounds,
  loadNearbyTiles
} from "../../../lib/cctvData";

export const runtime = "nodejs";
export const revalidate = 86400;

const MAX_RESULTS = 500;
const MAX_NEARBY_RESULTS = 160;

function toNumber(value: string | null) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

export async function GET(request: NextRequest) {
  const purpose = request.nextUrl.searchParams.get("purpose")?.trim() ?? "전체";
  const lat = toNumber(request.nextUrl.searchParams.get("lat"));
  const lng = toNumber(request.nextUrl.searchParams.get("lng"));
  const swLat = toNumber(request.nextUrl.searchParams.get("swLat"));
  const swLng = toNumber(request.nextUrl.searchParams.get("swLng"));
  const neLat = toNumber(request.nextUrl.searchParams.get("neLat"));
  const neLng = toNumber(request.nextUrl.searchParams.get("neLng"));
  const hasCenter = lat !== null && lng !== null;
  const hasBounds = swLat !== null && swLng !== null && neLat !== null && neLng !== null;

  try {
    if (hasBounds) {
      const center = hasCenter
        ? { lat, lng }
        : { lat: (swLat + neLat) / 2, lng: (swLng + neLng) / 2 };
      const inBounds = await loadCctvsInBounds({ swLat, swLng, neLat, neLng });
      const results = inBounds
        .filter((item) => purpose === "전체" || item.purpose === purpose)
        .map((item) => ({
          ...item,
          distance: Math.round(distanceMeters(center, { lat: item.lat, lng: item.lng }))
        }))
        .sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0))
        .slice(0, MAX_RESULTS);

      return NextResponse.json({
        source: "행정안전부 CCTV 정보",
        mode: "viewport",
        totalReturned: results.length,
        maxResults: MAX_RESULTS,
        items: results
      });
    }

    if (hasCenter) {
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

    return NextResponse.json({
      source: "행정안전부 CCTV 정보",
      mode: "empty",
      totalReturned: 0,
      maxResults: MAX_RESULTS,
      items: []
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
