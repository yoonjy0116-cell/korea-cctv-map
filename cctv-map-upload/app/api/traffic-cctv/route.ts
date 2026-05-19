import { NextRequest, NextResponse } from "next/server";

import { distanceMeters } from "../../../lib/cctvData";
import type { CctvLocation } from "../../../data/cctvLocations";

export const runtime = "nodejs";
export const revalidate = 60;

const ITS_CCTV_URL = "https://openapi.its.go.kr:9443/cctvInfo";
const MAX_RESULTS = 300;

function toNumber(value: string | null) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function getItems(payload: any) {
  const data = payload?.response?.data ?? payload?.response?.body?.items?.item ?? [];
  return Array.isArray(data) ? data : [data].filter(Boolean);
}

async function fetchItsCctvs(params: {
  apiKey: string;
  roadType: "ex" | "its";
  swLat: number;
  swLng: number;
  neLat: number;
  neLng: number;
}) {
  const query = new URLSearchParams({
    apiKey: params.apiKey,
    type: params.roadType,
    cctvType: "4",
    minX: String(params.swLng),
    maxX: String(params.neLng),
    minY: String(params.swLat),
    maxY: String(params.neLat),
    getType: "json"
  });
  const response = await fetch(`${ITS_CCTV_URL}?${query.toString()}`, {
    next: { revalidate: 60 }
  });

  if (!response.ok) return [];

  const payload = await response.json();
  return getItems(payload).map((item: any): CctvLocation | null => {
    const lat = Number(item.coordy);
    const lng = Number(item.coordx);
    const name = String(item.cctvname ?? "").trim();

    if (!Number.isFinite(lat) || !Number.isFinite(lng) || !name) return null;

    const id = `its-${params.roadType}-${item.roadsectionid ?? name}-${lat}-${lng}`;

    return {
      id,
      managementNumber: id,
      name: `${name} 교통 CCTV`,
      region: params.roadType === "ex" ? "고속도로" : "국도/일반도로",
      address: name,
      purpose: "교통",
      cameraCount: 1,
      manager: "ITS 국가교통정보센터",
      lat,
      lng,
      direction: `${params.roadType === "ex" ? "고속도로" : "국도/일반도로"} 교통상황 확인`,
      source: "ITS 국가교통정보센터",
      externalUrl: String(item.cctvurl ?? "").trim(),
      roadType: params.roadType,
      resolution: String(item.cctvresolution ?? "").trim(),
      liveUpdatedAt: String(item.filecreatetime ?? "").trim()
    };
  }).filter(Boolean) as CctvLocation[];
}

export async function GET(request: NextRequest) {
  const apiKey = process.env.ITS_API_KEY;
  const swLat = toNumber(request.nextUrl.searchParams.get("swLat"));
  const swLng = toNumber(request.nextUrl.searchParams.get("swLng"));
  const neLat = toNumber(request.nextUrl.searchParams.get("neLat"));
  const neLng = toNumber(request.nextUrl.searchParams.get("neLng"));
  const lat = toNumber(request.nextUrl.searchParams.get("lat"));
  const lng = toNumber(request.nextUrl.searchParams.get("lng"));

  if (!apiKey) {
    return NextResponse.json({
      source: "ITS 국가교통정보센터",
      mode: "traffic",
      configured: false,
      message: "ITS_API_KEY가 설정되지 않았습니다.",
      totalReturned: 0,
      maxResults: MAX_RESULTS,
      items: []
    });
  }

  if (swLat === null || swLng === null || neLat === null || neLng === null) {
    return NextResponse.json(
      { message: "지도 범위 값이 필요합니다." },
      { status: 400 }
    );
  }

  try {
    const center = {
      lat: lat ?? (swLat + neLat) / 2,
      lng: lng ?? (swLng + neLng) / 2
    };
    const [expressway, nationalRoad] = await Promise.all([
      fetchItsCctvs({ apiKey, roadType: "ex", swLat, swLng, neLat, neLng }),
      fetchItsCctvs({ apiKey, roadType: "its", swLat, swLng, neLat, neLng })
    ]);
    const seen = new Set<string>();
    const items = [...expressway, ...nationalRoad]
      .filter((item) => {
        const key = `${item.name}-${item.lat.toFixed(5)}-${item.lng.toFixed(5)}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map((item) => ({
        ...item,
        distance: Math.round(distanceMeters(center, item))
      }))
      .sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0))
      .slice(0, MAX_RESULTS);

    return NextResponse.json({
      source: "ITS 국가교통정보센터",
      mode: "traffic",
      configured: true,
      totalReturned: items.length,
      maxResults: MAX_RESULTS,
      items
    });
  } catch (error) {
    return NextResponse.json(
      {
        message: "ITS 교통 CCTV 데이터를 불러오지 못했습니다.",
        detail: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 502 }
    );
  }
}
