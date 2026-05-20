import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPin } from "lucide-react";

import AdsenseAd from "../../components/AdsenseAd";
import PolicyLinks from "../../components/PolicyLinks";
import {
  getCctvsByRegion,
  getRegionSummaries,
  getRegionSummary,
  normalizeArea,
  type RegionSummary
} from "../../../lib/cctvData";

type Props = {
  params: Promise<{
    area: string[];
  }>;
};

function toArea(parts: string[]) {
  return normalizeArea(parts.map((part) => decodeURIComponent(part)).join(" "));
}

function regionHref(region: RegionSummary) {
  return `/region/${region.path.map(encodeURIComponent).join("/")}`;
}

function formatPurposes(purposes: Record<string, number>) {
  return Object.entries(purposes)
    .sort((a, b) => b[1] - a[1])
    .map(([purpose, count]) => `${purpose} ${count.toLocaleString()}개`)
    .join(", ");
}

function variantIndex(value: string, size: number) {
  let hash = 0;
  for (const char of value) {
    hash = (hash * 31 + char.charCodeAt(0)) % 9973;
  }
  return hash % size;
}

function getRegionCopy(summary: RegionSummary) {
  const variants = [
    {
      title: `${summary.area} CCTV 위치와 열람 안내`,
      intro: `${summary.area} CCTV 위치를 지도 기준으로 확인하고, 필요한 경우 CCTV 열람 신청 전에 관리 정보와 설치목적을 먼저 살펴볼 수 있습니다.`,
      guide: `${summary.area} 주변 CCTV 보기, 방범 CCTV 위치 확인, 교통 CCTV 위치 검색처럼 지역 기반으로 찾는 사용자를 위해 공공데이터 항목을 정리했습니다.`
    },
    {
      title: `${summary.area} CCTV 설치 위치 정보`,
      intro: `${summary.area}에 설치된 CCTV 목록과 주요 목적을 공공데이터 기준으로 모았습니다. CCTV 보는 방법을 찾는 경우에도 먼저 위치와 관리기관 정보를 확인하는 것이 좋습니다.`,
      guide: `실시간 영상은 제공하지 않지만, CCTV 열람 방법을 준비할 때 필요한 주소, 촬영방면정보, 관리기관 연결 정보를 상세페이지에서 확인할 수 있습니다.`
    },
    {
      title: `${summary.area} 방범 CCTV 및 주변 CCTV`,
      intro: `${summary.area} CCTV 검색 결과를 지역 허브 형태로 묶었습니다. 동네 CCTV, 방범 CCTV, 시설안전 CCTV를 찾는 사람이 상세 위치로 이동하기 쉽도록 구성했습니다.`,
      guide: `각 CCTV 상세페이지에서는 설치목적, 카메라대수, 촬영방면정보를 확인할 수 있으며, CCTV 열람 신청 안내 페이지로도 이어집니다.`
    }
  ];

  return variants[variantIndex(summary.area, variants.length)];
}

function getRelatedRegions(current: RegionSummary, regions: RegionSummary[]) {
  const parentPath = current.path.slice(0, -1);
  const parentArea = parentPath.join(" ");
  const parent = parentPath.length > 0
    ? regions.find((region) => region.area === parentArea)
    : null;

  const children = regions
    .filter((region) =>
      region.path.length === current.path.length + 1 &&
      current.path.every((part, index) => region.path[index] === part)
    )
    .slice(0, 12);

  const siblings = parentPath.length > 0
    ? regions
        .filter((region) =>
          region.area !== current.area &&
          region.path.length === current.path.length &&
          parentPath.every((part, index) => region.path[index] === part)
        )
        .slice(0, 10)
    : [];

  return { parent, children, siblings };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { area } = await params;
  const areaName = toArea(area);
  const summary = await getRegionSummary(areaName);

  if (!summary) {
    return {
      title: "지역 CCTV 위치",
      robots: {
        index: false
      }
    };
  }

  const copy = getRegionCopy(summary);
  const description = `${copy.intro} ${summary.count.toLocaleString()}개 CCTV 위치와 CCTV 열람 방법에 필요한 기본 정보를 확인할 수 있습니다.`;

  return {
    title: copy.title,
    description,
    keywords: [
      `${summary.area} CCTV`,
      `${summary.area} CCTV 위치`,
      `${summary.area} CCTV 보기`,
      `${summary.area} CCTV 열람`,
      `${summary.area} 방범 CCTV`,
      `${summary.area} 교통 CCTV`,
      "CCTV 열람 방법",
      "전국 CCTV 지도"
    ],
    alternates: {
      canonical: regionHref(summary)
    },
    openGraph: {
      title: copy.title,
      description,
      url: regionHref(summary),
      type: "website",
      locale: "ko_KR"
    }
  };
}

export default async function RegionPage({ params }: Props) {
  const { area } = await params;
  const areaName = toArea(area);
  const [summary, regions] = await Promise.all([
    getRegionSummary(areaName),
    getRegionSummaries()
  ]);

  if (!summary) notFound();

  const cctvs = await getCctvsByRegion(summary.area, 80);
  const copy = getRegionCopy(summary);
  const related = getRelatedRegions(summary, regions);
  const mapHref = `/?q=${encodeURIComponent(summary.area)}`;

  return (
    <main className="detailPage">
      <div className="detailShell">
        <Link className="backLink" href="/">
          <ArrowLeft size={18} aria-hidden="true" />
          지도로 돌아가기
        </Link>

        <section className="detailHero">
          <p className="eyebrow">지역별 CCTV 위치</p>
          <h1>{copy.title}</h1>
          <p>{copy.intro}</p>
          <div className="detailActions">
            <Link className="detailActionPrimary" href={mapHref}>
              <MapPin size={17} aria-hidden="true" />
              지도에서 CCTV 보기
            </Link>
          </div>
        </section>

        <AdsenseAd className="adSlotDetailTop" label="지역 허브 상단 광고 영역" />

        <section className="seoTextBlock" aria-label={`${summary.area} CCTV 검색 안내`}>
          <h2>{summary.area} CCTV 검색 안내</h2>
          <p>{copy.guide}</p>
          <p>
            CCTV 영상을 직접 보는 서비스는 아니며, CCTV 열람 신청이나 사고 확인이 필요한 경우
            관리기관에 문의하기 전 위치, 주소, 설치목적, 촬영방면정보를 확인하는 용도로 활용할 수 있습니다.
          </p>
        </section>

        <section className="detailGridBlock" aria-label={`${summary.area} CCTV 요약`}>
          <div className="sectionHeading">
            <MapPin size={19} aria-hidden="true" />
            <h2>{summary.area} CCTV 요약</h2>
          </div>
          <dl className="regionStats">
            <div className="infoRow">
              <dt>등록 CCTV</dt>
              <dd>{summary.count.toLocaleString()}개</dd>
            </div>
            <div className="infoRow">
              <dt>설치목적</dt>
              <dd>{formatPurposes(summary.purposes) || "정보 없음"}</dd>
            </div>
          </dl>
        </section>

        <AdsenseAd className="adSlotDetailMiddle" label="지역 허브 본문 광고 영역" />

        <section className="nearbyBlock" aria-label="관련 지역 CCTV 링크">
          <h2>관련 지역 CCTV</h2>
          <p>{summary.area}와 함께 확인하기 좋은 상위지역 및 인접 지역 CCTV 링크입니다.</p>

          {related.parent && (
            <div className="regionLinkGroup">
              <strong>상위지역</strong>
              <div className="regionLinkGrid">
                <Link className="nearbyItem" href={regionHref(related.parent)}>
                  <strong>{related.parent.area} CCTV</strong>
                  <span>{related.parent.count.toLocaleString()}개 위치 정보</span>
                </Link>
              </div>
            </div>
          )}

          {related.children.length > 0 && (
            <div className="regionLinkGroup">
              <strong>하위지역</strong>
              <div className="regionLinkGrid">
                {related.children.map((region) => (
                  <Link className="nearbyItem" href={regionHref(region)} key={region.area}>
                    <strong>{region.area} CCTV</strong>
                    <span>{region.count.toLocaleString()}개 위치 정보</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {related.siblings.length > 0 && (
            <div className="regionLinkGroup">
              <strong>인접 검색 지역</strong>
              <div className="regionLinkGrid">
                {related.siblings.map((region) => (
                  <Link className="nearbyItem" href={regionHref(region)} key={region.area}>
                    <strong>{region.area} CCTV</strong>
                    <span>{region.count.toLocaleString()}개 위치 정보</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </section>

        <section className="nearbyBlock" aria-label={`${summary.area} CCTV 목록`}>
          <h2>{summary.area} CCTV 상세 링크</h2>
          <p>{summary.area} 주변에 등록된 개별 CCTV 상세페이지입니다.</p>
          <div className="nearbyList">
            {cctvs.map((item) => (
              <Link
                className="nearbyItem"
                href={`/cctv/${encodeURIComponent(item.slug)}`}
                key={item.managementNumber}
              >
                <strong>{item.name}</strong>
                <span>
                  {item.address} · {item.purpose}
                  {item.direction ? ` · ${item.direction}` : ""}
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section className="sourceBlock" aria-label="출처">
          <h2>출처</h2>
          <p>본 지역별 CCTV 위치 정보는 공공데이터 기반 자료를 사용해 구성했습니다.</p>
          <ul>
            <li>
              출처:{" "}
              <a href="https://www.data.go.kr/" target="_blank" rel="noreferrer">
                공공데이터포털
              </a>
            </li>
          </ul>
        </section>

        <PolicyLinks />
      </div>
    </main>
  );
}
