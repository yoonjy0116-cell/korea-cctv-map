import { NextRequest, NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { gunzip } from "node:zlib";
import { promisify } from "node:util";

export const runtime = "nodejs";
export const revalidate = 86400;

const DATA_URL = "https://file.localdata.go.kr/file/cctv_info/info";
const LOCAL_DATA_PATH = path.join(process.cwd(), "public", "data", "cctv.csv");
const LOCAL_GZIP_DATA_PATH = path.join(process.cwd(), "public", "data", "cctv.csv.gz");
const MAX_RESULTS = 500;
const gunzipAsync = promisify(gunzip);

type RawRecord = Record<string, string>;

function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"' && inQuotes && next === '"') {
      value += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(value);
      value = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(value);
      rows.push(row);
      row = [];
      value = "";
      continue;
    }

    value += char;
  }

  if (value || row.length > 0) {
    row.push(value);
    rows.push(row);
  }

  return rows;
}

function pick(record: RawRecord, names: string[]) {
  for (const name of names) {
    const value = record[name]?.trim();
    if (value) return value;
  }

  return "";
}

function normalizePurpose(value: string) {
  if (value.includes("어린이")) return "어린이보호";
  if (value.includes("교통")) return "교통";
  if (value.includes("시설") || value.includes("재난")) return "시설안전";
  return "방범";
}

export async function GET(request: NextRequest) {
  const keyword = request.nextUrl.searchParams.get("keyword")?.trim().toLowerCase() ?? "";
  const purpose = request.nextUrl.searchParams.get("purpose")?.trim() ?? "전체";

  try {
    let text = "";

    try {
      const localBuffer = await readFile(LOCAL_DATA_PATH);
      text = new TextDecoder("euc-kr").decode(localBuffer);
    } catch {
      try {
        const gzipBuffer = await readFile(LOCAL_GZIP_DATA_PATH);
        const localBuffer = await gunzipAsync(gzipBuffer);
        text = new TextDecoder("euc-kr").decode(localBuffer);
      } catch {
        const response = await fetch(DATA_URL, { next: { revalidate } });
        if (!response.ok) {
          throw new Error(`Public data request failed: ${response.status}`);
        }

        const buffer = await response.arrayBuffer();
        text = new TextDecoder("euc-kr").decode(buffer);
      }
    }

    const [headers = [], ...rows] = parseCsv(text);
    const results = [];

    for (const row of rows) {
      const record = Object.fromEntries(headers.map((header, index) => [header.trim(), row[index] ?? ""]));
      const lat = Number(pick(record, ["WGS84위도", "위도", "위도좌표", "latitude"]));
      const lng = Number(pick(record, ["WGS84경도", "경도", "경도좌표", "longitude"]));

      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

      const rawPurpose = pick(record, ["설치목적구분", "설치목적", "용도"]);
      const normalizedPurpose = normalizePurpose(rawPurpose);

      if (purpose !== "전체" && normalizedPurpose !== purpose) continue;

      const region = pick(record, ["시도명", "시군구명", "관리기관명"]) || "지역 정보 없음";
      const address =
        pick(record, ["소재지도로명주소", "소재지지번주소", "주소", "설치위치"]) || "주소 정보 없음";
      const name = pick(record, ["설치위치", "CCTV명", "관리번호"]) || `${region} CCTV`;
      const manager = pick(record, ["관리기관명", "제공기관명"]) || "관리기관 정보 없음";
      const cameraCount = Number(pick(record, ["카메라대수", "카메라수"])) || 1;

      const searchableText = `${name} ${region} ${address} ${manager}`.toLowerCase();
      if (keyword && !searchableText.includes(keyword)) continue;

      results.push({
        id: results.length + 1,
        name,
        region,
        address,
        purpose: normalizedPurpose,
        cameraCount,
        manager,
        lat,
        lng
      });

      if (results.length >= MAX_RESULTS) break;
    }

    return NextResponse.json({
      source: "행정안전부_CCTV정보_20260422",
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
