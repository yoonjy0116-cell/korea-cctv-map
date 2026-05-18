import { NextRequest, NextResponse } from "next/server";

import { getCctvRows, pick, toCctvDetail } from "@/lib/cctvData";

export const runtime = "nodejs";
export const revalidate = 86400;

const MAX_RESULTS = 500;

export async function GET(request: NextRequest) {
  const keyword = request.nextUrl.searchParams.get("keyword")?.trim().toLowerCase() ?? "";
  const purpose = request.nextUrl.searchParams.get("purpose")?.trim() ?? "전체";

  try {
    const rows = await getCctvRows();
    const results = [];

    for (const record of rows) {
      const item = toCctvDetail(record);
      if (!item) continue;
      if (purpose !== "전체" && item.purpose !== purpose) continue;

      const searchableText = [
        item.name,
        item.address,
        item.manager,
        item.managementNumber,
        pick(record, ["소재지도로명주소"]),
        pick(record, ["소재지지번주소"])
      ]
        .join(" ")
        .toLowerCase();

      if (keyword && !searchableText.includes(keyword)) continue;

      results.push(item);

      if (results.length >= MAX_RESULTS) break;
    }

    return NextResponse.json({
      source: "행정안전부_CCTV정보",
      totalReturned: results.length,
      maxResults: MAX_RESULTS,
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
