import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPin } from "lucide-react";

import { getCctvsByRegion, getRegionSummary, normalizeArea } from "../../../lib/cctvData";

type Props = {
  params: Promise<{
    area: string[];
  }>;
};

function toArea(parts: string[]) {
  return normalizeArea(parts.map((part) => decodeURIComponent(part)).join(" "));
}

function formatPurposes(purposes: Record<string, number>) {
  return Object.entries(purposes)
    .sort((a, b) => b[1] - a[1])
    .map(([purpose, count]) => `${purpose} ${count.toLocaleString()}개`)
    .join(", ");
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

  const title = `${summary.area} CCTV 위치`;
  const description = `${summary.area} CCTV 위치 ${summary.count.toLocaleString()}개를 공공데이터 기준으로 확인할 수 있습니다. 방범, 교통, 어린이보호, 시설안전 CCTV 설치 정보를 제공합니다.`;

  return {
    title,
    description,
    keywords: [
      `${summary.area} CCTV`,
      `${summary.area} CCTV 위치`,
      `${summary.area} 방범 CCTV`,
      `${summary.area} 교통 CCTV`,
      "전국 CCTV 지도"
    ],
    alternates: {
      canonical: `/region/${summary.path.map(encodeURIComponent).join("/")}`
    },
    openGraph: {
      title,
      description,
      url: `/region/${summary.path.map(encodeURIComponent).join("/")}`,
      type: "website",
      locale: "ko_KR"
    }
  };
}

export default async function RegionPage({ params }: Props) {
  const { area } = await params;
  const areaName = toArea(area);
  const summary = await getRegionSummary(areaName);

  if (!summary) notFound();

  const cctvs = await getCctvsByRegion(summary.area, 80);
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
          <h1>{summary.area} CCTV 위치</h1>
          <p>
            {summary.area}에 등록된 CCTV 위치를 공공데이터 기준으로 정리했습니다.
            실시간 영상은 제공하지 않으며, 설치 위치와 관리 정보 확인 용도로 사용할 수 있습니다.
          </p>
          <div className="detailActions">
            <Link className="detailActionPrimary" href={mapHref}>
              <MapPin size={17} aria-hidden="true" />
              지도에서 보기
            </Link>
          </div>
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

        <section className="nearbyBlock" aria-label={`${summary.area} CCTV 목록`}>
          <h2>{summary.area} CCTV 목록</h2>
          <p>{summary.area} 주변에 등록된 CCTV 상세페이지 링크입니다.</p>
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
      </div>
    </main>
  );
}
