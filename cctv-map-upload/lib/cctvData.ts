import { readFile } from "node:fs/promises";
import path from "node:path";
import { gunzip } from "node:zlib";
import { promisify } from "node:util";

import type { CctvLocation, CctvPurpose } from "../data/cctvLocations";

const DATA_URL = "https://file.localdata.go.kr/file/cctv_info/info";
const LOCAL_DATA_PATH = path.join(process.cwd(), "public", "data", "cctv.csv");
const LOCAL_GZIP_DATA_PATH = path.join(process.cwd(), "public", "data", "cctv.csv.gz");
const gunzipAsync = promisify(gunzip);

let rowsCache: Promise<RawCctvRecord[]> | null = null;

export type RawCctvRecord = Record<string, string>;

export type CctvDetail = CctvLocation & {
  seoArea: string;
  seoTitle: string;
  slug: string;
  managementNumber: string;
  roadAddress: string;
  lotAddress: string;
  pixel: string;
  direction: string;
  retentionDays: string;
  installedAt: string;
  phone: string;
  dataDate: string;
  updatedAt: string;
  raw: RawCctvRecord;
};

export function parseCsv(text: string) {
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

export function pick(record: RawCctvRecord, names: string[]) {
  for (const name of names) {
    const value = record[name]?.trim();
    if (value) return value;
  }

  return "";
}

export function normalizePurpose(value: string): CctvPurpose {
  if (value.includes("어린이")) return "어린이보호";
  if (value.includes("교통")) return "교통";
  if (value.includes("시설") || value.includes("재난")) return "시설안전";
  return "방범";
}

export function createSeoArea(record: RawCctvRecord) {
  const address = pick(record, ["소재지도로명주소", "소재지지번주소", "설치위치"]);
  const parts = address.split(/\s+/).filter(Boolean);
  const dong = parts.find((part) => /[동읍면가로길]$/.test(part));

  if (dong) {
    const city = parts[0] ?? "";
    const district = parts.find((part) => /[구군시]$/.test(part)) ?? "";
    return [city, district, dong].filter(Boolean).join(" ");
  }

  return normalizeArea(parts.slice(0, 3).join(" ") || pick(record, ["관리기관명"]) || "전국");
}

export function normalizeArea(value: string) {
  const parts = value.split(/\s+/).filter(Boolean);
  const normalized: string[] = [];

  for (const part of parts) {
    if (normalized[normalized.length - 1] !== part) {
      normalized.push(part);
    }
  }

  return normalized.join(" ");
}

export function createSlug(value: string, managementNumber: string) {
  return `${value} ${managementNumber}`
    .trim()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export function createDisplayName(record: RawCctvRecord) {
  const address = pick(record, ["소재지도로명주소", "소재지지번주소", "설치위치"]);
  return `${address || createSeoArea(record)} CCTV`;
}

export function toCctvDetail(record: RawCctvRecord): CctvDetail | null {
  const lat = Number(pick(record, ["WGS84위도", "위도", "위도좌표", "latitude"]));
  const lng = Number(pick(record, ["WGS84경도", "경도", "경도좌표", "longitude"]));

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const managementNumber = pick(record, ["관리번호"]) || `${lat},${lng}`;
  const rawPurpose = pick(record, ["설치목적구분", "설치목적", "용도"]);
  const roadAddress = pick(record, ["소재지도로명주소"]);
  const lotAddress = pick(record, ["소재지지번주소"]);
  const address = roadAddress || lotAddress || pick(record, ["주소", "설치위치"]) || "주소 정보 없음";
  const manager = pick(record, ["관리기관명", "제공기관명"]) || "관리기관 정보 없음";
  const seoArea = createSeoArea(record);
  const seoTitle = `${seoArea} CCTV 위치 정보`;

  return {
    id: managementNumber,
    managementNumber,
    name: createDisplayName(record),
    seoArea,
    seoTitle,
    slug: createSlug(seoTitle, managementNumber),
    region: manager,
    address,
    roadAddress,
    lotAddress,
    purpose: normalizePurpose(rawPurpose),
    cameraCount: Number(pick(record, ["카메라대수", "카메라수"])) || 1,
    manager,
    pixel: pick(record, ["카메라화소수"]),
    direction: pick(record, ["촬영방면정보"]),
    retentionDays: pick(record, ["보관일수"]),
    installedAt: pick(record, ["설치연월"]),
    phone: pick(record, ["관리기관전화번호"]),
    dataDate: pick(record, ["데이터기준일자"]),
    updatedAt: pick(record, ["최종수정시점", "데이터갱신시점"]),
    lat,
    lng,
    raw: record
  };
}

export async function loadCctvCsvText() {
  try {
    const localBuffer = await readFile(LOCAL_DATA_PATH);
    return new TextDecoder("euc-kr").decode(localBuffer);
  } catch {
    try {
      const gzipBuffer = await readFile(LOCAL_GZIP_DATA_PATH);
      const localBuffer = await gunzipAsync(gzipBuffer);
      return new TextDecoder("euc-kr").decode(localBuffer);
    } catch {
      const response = await fetch(DATA_URL, { next: { revalidate: 86400 } });
      if (!response.ok) {
        throw new Error(`Public data request failed: ${response.status}`);
      }

      const buffer = await response.arrayBuffer();
      return new TextDecoder("euc-kr").decode(buffer);
    }
  }
}

export async function getCctvRows() {
  if (rowsCache) return rowsCache;

  rowsCache = loadCctvCsvText().then((text) => {
    const [headers = [], ...rows] = parseCsv(text);

    return rows.map((row) =>
      Object.fromEntries(headers.map((header, index) => [header.trim(), row[index] ?? ""]))
    );
  });

  return rowsCache;
}

export async function findCctvByManagementNumber(managementNumber: string) {
  const rows = await getCctvRows();

  for (const record of rows) {
    const item = toCctvDetail(record);
    if (!item) continue;

    if (item.managementNumber === managementNumber || item.slug === managementNumber) {
      return item;
    }
  }

  return null;
}

export async function getCctvIds(offset = 0, limit = 50000) {
  const rows = await getCctvRows();

  return rows
    .slice(offset, offset + limit)
    .map((record) => pick(record, ["관리번호"]))
    .filter(Boolean);
}

export async function getCctvPageSlugs(offset = 0, limit = 50000) {
  const rows = await getCctvRows();

  return rows
    .slice(offset, offset + limit)
    .map((record) => toCctvDetail(record)?.slug)
    .filter(Boolean) as string[];
}

export async function countCctvRows() {
  const rows = await getCctvRows();
  return rows.length;
}
