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

function getPurposeEntries(summary: RegionSummary) {
  return ["방범", "교통", "어린이보호", "시설안전", "기타"]
    .map((purpose) => ({
      purpose,
      count: summary.purposes[purpose] ?? 0
    }))
    .filter((item) => item.count > 0);
}

function getPurposeDescription(area: string, purpose: string, count: number) {
  const countText = count.toLocaleString();

  if (purpose === "방범") {
    return `${area} 방범 CCTV는 생활안전, 범죄 예방, 사고 발생 위치 확인을 위해 참고할 수 있는 공개 위치 정보입니다. 현재 공공데이터 기준 ${countText}개가 등록되어 있습니다.`;
  }

  if (purpose === "교통") {
    return `${area} 교통 CCTV는 도로 주변 위치 확인이나 교통 관련 CCTV 검색에 활용할 수 있습니다. 실시간 영상 제공 여부는 별도 관리기관 또는 교통정보 제공처를 확인해야 합니다.`;
  }

  if (purpose === "어린이보호") {
    return `${area} 어린이보호 CCTV는 학교 주변, 어린이보호구역, 통학로 CCTV 위치를 찾는 경우에 참고할 수 있습니다.`;
  }

  if (purpose === "시설안전") {
    return `${area} 시설안전 CCTV는 공공시설, 공원, 하천, 주요 시설 주변의 안전 관리를 목적으로 등록된 CCTV 위치 정보입니다.`;
  }

  return `${area} 기타 목적 CCTV는 원본 공공데이터의 설치목적 분류가 세부적으로 다르거나 통합 관리되는 항목입니다. 상세페이지에서 주소와 촬영방면정보를 확인할 수 있습니다.`;
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
      `${summary.area} 어린이보호 CCTV`,
      `${summary.area} 시설안전 CCTV`,
      `${summary.area} 사고 CCTV 확인`,
      `${summary.area} CCTV 확인 방법`,
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
  const purposeEntries = getPurposeEntries(summary);

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

        <section className="seoTextBlock" aria-label={`${summary.area} 목적별 CCTV 안내`}>
          <h2>{summary.area} 목적별 CCTV 안내</h2>
          <p>
            {summary.area} CCTV를 찾는 사용자는 방범 CCTV, 교통 CCTV, 어린이보호 CCTV,
            시설안전 CCTV처럼 설치목적에 따라 필요한 정보가 다를 수 있습니다. 아래 내용은
            공공데이터에 등록된 목적별 현황을 기준으로 정리한 안내입니다.
          </p>
          <div className="purposeSeoGrid">
            {purposeEntries.map((item) => (
              <article className="purposeSeoCard" key={item.purpose}>
                <strong>{summary.area} {item.purpose} CCTV</strong>
                <span>{item.count.toLocaleString()}개</span>
                <p>{getPurposeDescription(summary.area, item.purpose, item.count)}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="seoTextBlock" aria-label={`${summary.area} CCTV 열람 및 확인 안내`}>
          <h2>{summary.area} CCTV 열람 신청 전 확인사항</h2>
          <p>
            {summary.area}에서 사고, 분실물, 차량 접촉, 생활 민원 등으로 CCTV 확인이 필요한 경우에는
            먼저 주변 CCTV 위치와 관리기관 정보를 확인하는 것이 좋습니다. CCTV 영상 열람은 본인 확인,
            사건 관련성, 보관기간, 관리기관 심사에 따라 가능 여부가 달라질 수 있습니다.
          </p>
          <ul className="intentList">
            <li>{summary.area} CCTV 위치를 확인한 뒤 상세페이지에서 관리기관과 촬영방면정보를 확인하세요.</li>
            <li>{summary.area} 방범 CCTV 또는 어린이보호 CCTV는 설치목적과 주소를 함께 확인하는 것이 좋습니다.</li>
            <li>실시간 CCTV 보기 기능은 제공하지 않으며, 영상 열람은 정보공개포털 또는 관리기관 절차를 이용해야 합니다.</li>
          </ul>
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
