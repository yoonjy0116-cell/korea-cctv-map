import { NextResponse } from "next/server";

import { getRegionSummaries, type RegionSummary } from "../../../lib/cctvData";

export const runtime = "nodejs";
export const revalidate = 86400;

const topRegions = new Set([
  "서울특별시",
  "부산광역시",
  "대구광역시",
  "인천광역시",
  "광주광역시",
  "대전광역시",
  "울산광역시",
  "세종특별자치시",
  "경기도",
  "강원특별자치도",
  "강원도",
  "충청북도",
  "충청남도",
  "전북특별자치도",
  "전라북도",
  "전라남도",
  "경상북도",
  "경상남도",
  "제주특별자치도"
]);

const adminAreaEnd = /(동|읍|면|리|가)$/;

type RegionNode = {
  name: string;
  area: string;
  path: string[];
  count: number;
  children: RegionNode[];
};

function isUsefulRegion(region: RegionSummary) {
  const [top, , third] = region.path;
  if (!topRegions.has(top)) return false;
  if (region.path.length <= 2) return true;
  return Boolean(third && adminAreaEnd.test(third) && !/[0-9]/.test(third));
}

function toNode(region: RegionSummary): RegionNode {
  return {
    name: region.path[region.path.length - 1],
    area: region.area,
    path: region.path,
    count: region.count,
    children: []
  };
}

export async function GET() {
  const summaries = (await getRegionSummaries())
    .filter(isUsefulRegion)
    .sort((a, b) => a.area.localeCompare(b.area, "ko"));

  const nodeMap = new Map<string, RegionNode>();
  const roots: RegionNode[] = [];

  for (const region of summaries) {
    nodeMap.set(region.area, toNode(region));
  }

  for (const node of nodeMap.values()) {
    const parentArea = node.path.slice(0, -1).join(" ");
    const parent = nodeMap.get(parentArea);

    if (parent) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }

  const sortNodes = (nodes: RegionNode[]) => {
    nodes.sort((a, b) => a.name.localeCompare(b.name, "ko"));
    nodes.forEach((node) => sortNodes(node.children));
  };

  sortNodes(roots);

  return NextResponse.json({
    total: summaries.length,
    items: roots
  });
}
