import { readFile } from "node:fs/promises";
import path from "node:path";
import { gunzip } from "node:zlib";
import { promisify } from "node:util";

import type { CctvLocation, CctvPurpose } from "../data/cctvLocations";

const DATA_URL = "https://file.localdata.go.kr/file/cctv_info/info";
const LOCAL_DATA_PATH = path.join(process.cwd(), "public", "data", "cctv.csv");
const LOCAL_GZIP_DATA_PATH = path.join(process.cwd(), "public", "data", "cctv.csv.gz");
const LOCAL_COMPACT_DATA_PATH = path.join(process.cwd(), "public", "data", "cctv.min.json.gz");
const TILE_DIR = path.join(process.cwd(), "public", "data", "cctv-tiles");
const TILE_SCALE = 10;

const gunzipAsync = promisify(gunzip);

let rowsCache: Promise<RawCctvRecord[]> | null = null;
let itemsCache: Promise<CctvDetail[]> | null = null;
let regionSummariesCache: Promise<RegionSummary[]> | null = null;

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
  raw?: RawCctvRecord;
};

export type RegionSummary = {
  area: string;
  path: string[];
  count: number;
  purposes: Record<string, number>;
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

export function createSeoArea(record: RawCctvRecord) {
  const address = pick(record, ["소재지도로명주소", "소재지지번주소", "설치위치"]);
  const parts = address.split(/\s+/).filter(Boolean);
  const dong = parts.find((part) => /[동읍면가로길]$/.test(part));

  if (dong) {
    const city = parts[0] ?? "";
    const district = parts.find((part) => /[구군시]$/.test(part)) ?? "";
    return normalizeArea([city, district, dong].filter(Boolean).join(" "));
  }

  return normalizeArea(parts.slice(0, 3).join(" ") || pick(record, ["관리기관명"]) || "전국");
}

export function createSlug(value: string, managementNumber: string) {
  return `${value} ${managementNumber}`
    .trim()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 160);
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
    region: seoArea,
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

export async function loadCctvItems() {
  if (itemsCache) return itemsCache;

  itemsCache = (async () => {
    try {
      const gzipBuffer = await readFile(LOCAL_COMPACT_DATA_PATH);
      const jsonBuffer = await gunzipAsync(gzipBuffer);
      return JSON.parse(jsonBuffer.toString("utf8")) as CctvDetail[];
    } catch {
      const rows = await getCctvRows();
      return rows.map(toCctvDetail).filter(Boolean) as CctvDetail[];
    }
  })();

  return itemsCache;
}

function tileName(lat: number, lng: number) {
  return `t_${Math.floor(lat * TILE_SCALE)}_${Math.floor(lng * TILE_SCALE)}.json.gz`;
}

export async function loadNearbyTiles(lat: number, lng: number, radius = 1) {
  const centerLat = Math.floor(lat * TILE_SCALE);
  const centerLng = Math.floor(lng * TILE_SCALE);
  const tasks: Promise<CctvLocation[]>[] = [];

  for (let y = centerLat - radius; y <= centerLat + radius; y += 1) {
    for (let x = centerLng - radius; x <= centerLng + radius; x += 1) {
      const filePath = path.join(TILE_DIR, `t_${y}_${x}.json.gz`);
      tasks.push(
        readFile(filePath)
          .then(gunzipAsync)
          .then((buffer) => JSON.parse(buffer.toString("utf8")) as CctvLocation[])
          .catch(() => [])
      );
    }
  }

  const chunks = await Promise.all(tasks);
  return chunks.flat();
}

export async function loadCctvsInBounds(bounds: {
  swLat: number;
  swLng: number;
  neLat: number;
  neLng: number;
}) {
  const minLatTile = Math.floor(bounds.swLat * TILE_SCALE);
  const maxLatTile = Math.floor(bounds.neLat * TILE_SCALE);
  const minLngTile = Math.floor(bounds.swLng * TILE_SCALE);
  const maxLngTile = Math.floor(bounds.neLng * TILE_SCALE);
  const tileCount = (maxLatTile - minLatTile + 1) * (maxLngTile - minLngTile + 1);

  if (tileCount > 90) {
    const centerLat = (bounds.swLat + bounds.neLat) / 2;
    const centerLng = (bounds.swLng + bounds.neLng) / 2;
    return loadNearbyTiles(centerLat, centerLng, 2);
  }

  const tasks: Promise<CctvLocation[]>[] = [];

  for (let y = minLatTile; y <= maxLatTile; y += 1) {
    for (let x = minLngTile; x <= maxLngTile; x += 1) {
      const filePath = path.join(TILE_DIR, `t_${y}_${x}.json.gz`);
      tasks.push(
        readFile(filePath)
          .then(gunzipAsync)
          .then((buffer) => JSON.parse(buffer.toString("utf8")) as CctvLocation[])
          .catch(() => [])
      );
    }
  }

  const chunks = await Promise.all(tasks);
  return chunks
    .flat()
    .filter(
      (item) =>
        item.lat >= bounds.swLat &&
        item.lat <= bounds.neLat &&
        item.lng >= bounds.swLng &&
        item.lng <= bounds.neLng
    );
}

export function distanceMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const earth = 6371000;
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * earth * Math.asin(Math.sqrt(h));
}

export async function findCctvByManagementNumber(managementNumber: string) {
  const items = await loadCctvItems();
  return items.find((item) => item.managementNumber === managementNumber || item.slug === managementNumber) ?? null;
}

export async function getCctvIds(offset = 0, limit = 50000) {
  const items = await loadCctvItems();
  return items.slice(offset, offset + limit).map((item) => item.managementNumber).filter(Boolean);
}

export async function getCctvPageSlugs(offset = 0, limit = 50000) {
  const items = await loadCctvItems();
  return items.slice(offset, offset + limit).map((item) => item.slug).filter(Boolean);
}

export async function countCctvRows() {
  const items = await loadCctvItems();
  return items.length;
}

function getRegionPathParts(area: string) {
  return normalizeArea(area).split(/\s+/).filter(Boolean);
}

function addRegionSummary(map: Map<string, RegionSummary>, item: CctvDetail, parts: string[]) {
  if (parts.length === 0) return;

  const area = parts.join(" ");
  const current = map.get(area) ?? {
    area,
    path: parts,
    count: 0,
    purposes: {}
  };

  current.count += 1;
  current.purposes[item.purpose] = (current.purposes[item.purpose] ?? 0) + 1;
  map.set(area, current);
}

export async function getRegionSummaries(limit = 5000) {
  if (!regionSummariesCache) {
    regionSummariesCache = loadCctvItems().then((items) => {
      const map = new Map<string, RegionSummary>();

      for (const item of items) {
        const parts = getRegionPathParts(item.seoArea || item.region || item.address);
        addRegionSummary(map, item, parts.slice(0, 2));
        addRegionSummary(map, item, parts.slice(0, 3));
      }

      return Array.from(map.values()).sort((a, b) => b.count - a.count || a.area.localeCompare(b.area, "ko"));
    });
  }

  const summaries = await regionSummariesCache;
  return summaries.slice(0, limit);
}

export async function getRegionSummary(area: string) {
  const normalizedArea = normalizeArea(area);
  const summaries = await getRegionSummaries();
  return summaries.find((summary) => summary.area === normalizedArea) ?? null;
}

export async function getCctvsByRegion(area: string, limit = 80) {
  const normalizedArea = normalizeArea(area);
  const items = await loadCctvItems();

  return items
    .filter((item) => normalizeArea(item.seoArea || item.region || item.address).startsWith(normalizedArea))
    .slice(0, limit);
}

export async function getNearbyCctvs(target: CctvLocation, limit = 8) {
  const items = await loadCctvItems();

  return items
    .filter((item) => item.managementNumber !== target.managementNumber)
    .map((item) => ({
      ...item,
      distance: Math.round(distanceMeters(target, item))
    }))
    .sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0))
    .slice(0, limit);
}

export { tileName };
