import type { Metadata } from "next";
import Link from "next/link";

import { getRegionSummaries, type RegionSummary } from "../../lib/cctvData";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "전국 지역별 CCTV 위치",
  description:
    "서울, 부산, 대전, 경기 등 전국 시도, 시군구, 읍면동 CCTV 위치 정보를 지역별로 확인할 수 있는 공공데이터 기반 목록입니다.",
  alternates: {
    canonical: "/regions"
  }
};

type RegionNode = {
  name: string;
  area: string;
  path: string[];
  count: number;
  children: RegionNode[];
};

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

function regionHref(path: string[]) {
  return `/region/${path.map(encodeURIComponent).join("/")}`;
}

function buildRegionTree(regions: RegionSummary[]) {
  const nodeMap = new Map<string, RegionNode>();
  const roots: RegionNode[] = [];

  for (const region of regions) {
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
  return roots;
}

function RegionTreeNode({ node, depth = 0 }: { node: RegionNode; depth?: number }) {
  const title = `${node.area} CCTV`;

  if (node.children.length === 0) {
    return (
      <li className={`regionIndexItem depth${depth}`}>
        <Link className="regionIndexLink" href={regionHref(node.path)}>
          <span>{title}</span>
          <em>{node.count.toLocaleString()}개</em>
        </Link>
      </li>
    );
  }

  return (
    <li className={`regionIndexItem depth${depth}`}>
      <details className="regionIndexDetails">
        <summary>
          <Link href={regionHref(node.path)}>{title}</Link>
          <span>{node.count.toLocaleString()}개</span>
        </summary>
        <ul>{node.children.map((child) => <RegionTreeNode key={child.area} node={child} depth={depth + 1} />)}</ul>
      </details>
    </li>
  );
}

export default async function RegionsPage() {
  const summaries = (await getRegionSummaries(20000))
    .filter(isUsefulRegion)
    .sort((a, b) => a.area.localeCompare(b.area, "ko"));
  const roots = buildRegionTree(summaries);
  const totalCount = roots.reduce((sum, node) => sum + node.count, 0);

  return (
    <main className="regionIndexPage">
      <section className="regionIndexHero">
        <p className="eyebrow">공공데이터 기반 지역 목록</p>
        <h1>전국 지역별 CCTV 위치</h1>
        <p>
          전국 CCTV 위치 정보를 시도, 시군구, 읍면동 단위로 정리했습니다. 찾고 싶은 지역을 선택하면 해당 지역의
          CCTV 설치 목적, 주소, 촬영방면정보와 주변 CCTV 목록을 확인할 수 있습니다.
        </p>
        <div className="regionIndexActions">
          <Link href="/">지도에서 CCTV 찾기</Link>
          <Link href="/cctv-request">CCTV 열람 신청 방법</Link>
        </div>
      </section>

      <section className="regionIndexSummary" aria-label="지역 목록 요약">
        <div>
          <strong>{roots.length.toLocaleString()}</strong>
          <span>시도 지역</span>
        </div>
        <div>
          <strong>{summaries.length.toLocaleString()}</strong>
          <span>지역 페이지</span>
        </div>
        <div>
          <strong>{totalCount.toLocaleString()}</strong>
          <span>CCTV 위치</span>
        </div>
      </section>

      <section className="regionIndexContent">
        <h2>지역별 CCTV 바로가기</h2>
        <p>예를 들어 대전광역시, 유성구, 전민동처럼 단계별로 펼쳐 원하는 지역 페이지로 이동할 수 있습니다.</p>
        <ul className="regionIndexTree">
          {roots.map((node) => (
            <RegionTreeNode key={node.area} node={node} />
          ))}
        </ul>
      </section>
    </main>
  );
}
