import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPin } from "lucide-react";

import { getRegionHub } from "../../../lib/cctvData";

type Props = {
  params: Promise<{
    area: string[];
  }>;
};

function formatNumber(value: number) {
  return value.toLocaleString("ko-KR");
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { area } = await params;
  const hub = await getRegionHub(area, 10);

  if (!hub) {
    return {
      title: "지역 CCTV 정보",
      robots: {
        index: false
      }
    };
  }

  const title = `${hub.areaName} CCTV 위치 정보`;
  const description = `${hub.areaName} CCTV ${formatNumber(hub.total)}개 위치와 설치목적, 관리기관, 촬영방면정보를 공공데이터 기준으로 확인할 수 있습니다.`;

  return {
    title,
    description,
    keywords: [
      `${hub.areaName} CCTV`,
      `${hub.areaName} CCTV 위치`,
      `${hub.areaName} 방범 CCTV`,
      `${hub.areaName} 교통 CCTV`,
      `${hub.areaName} 어린이보호 CCTV`,
      `${hub.areaName} 시설안전 CCTV`,
      "전국 CCTV 지도"
    ],
    alternates: {
      canonical: `/region/${hub.areaParts.map(encodeURIComponent).join("/")}`
    },
    openGraph: {
      title,
      description,
      url: `/region/${hub.areaParts.map(encodeURIComponent).join("/")}`,
      type: "website",
      locale: "ko_KR"
    }
  };
}

export default async function RegionPage({ params }: Props) {
  const { area } = await params;
  const hub = await getRegionHub(area);

  if (!hub) notFound();

  return (
    <main className="detailPage">
      <div className="detailShell">
        <Link className="backLink" href="/">
          <ArrowLeft size={18} aria-hidden="true" />
          지도로 돌아가기
        </Link>

        <section className="detailHero">
          <p className="eyebrow">지역별 CCTV 위치</p>
          <h1>{hub.areaName} CCTV 위치 정보</h1>
          <p>
            {hub.areaName}에 등록된 CCTV 위치와 설치목적, 촬영방면정보, 관리기관 정보를
            공공데이터 기준으로 정리했습니다. 실시간 영상은 제공하지 않으며 위치 확인과
            열람 신청 안내를 목적으로 합니다.
          </p>
        </section>

        <section className="regionStats" aria-label={`${hub.areaName} CCTV 통계`}>
          <div className="regionStatCard">
            <strong>{formatNumber(hub.total)}개</strong>
            <span>등록 CCTV</span>
          </div>
          {hub.purposeCounts.map((item) => (
            <div className="regionStatCard" key={item.purpose}>
              <strong>{formatNumber(item.count)}개</strong>
              <span>{item.purpose}</span>
            </div>
          ))}
        </section>

        {hub.childRegions.length > 0 && (
          <section className="nearbyBlock" aria-label={`${hub.areaName} 하위 지역`}>
            <h2>{hub.areaName} 하위 지역 CCTV</h2>
            <p>검색엔진과 사용자가 지역 구조를 쉽게 이해할 수 있도록 하위 지역 링크를 제공합니다.</p>
            <div className="regionLinkGrid">
              {hub.childRegions.map((child) => (
                <Link className="regionLink" href={child.href} key={child.href}>
                  <strong>{child.name} CCTV</strong>
                  <span>{formatNumber(child.count)}개 위치</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section className="detailGridBlock" aria-label={`${hub.areaName} CCTV 목록`}>
          <div className="sectionHeading">
            <MapPin size={19} aria-hidden="true" />
            <h2>{hub.areaName} 주요 CCTV 위치</h2>
          </div>
          <div className="regionCctvList">
            {hub.items.map((item) => (
              <Link
                className="regionCctvItem"
                href={`/cctv/${encodeURIComponent(item.slug)}`}
                key={item.managementNumber}
              >
                <strong>{item.name}</strong>
                <span>{item.address}</span>
                <small>
                  {item.purpose} · {item.direction || "촬영방면정보 없음"} · {item.manager}
                </small>
              </Link>
            ))}
          </div>
        </section>

        <section className="seoTextBlock">
          <h2>{hub.areaName} CCTV 검색 안내</h2>
          <p>
            {hub.areaName} CCTV를 찾는 경우 주소, 설치목적, 관리기관을 함께 확인하는 것이 좋습니다.
            방범, 교통, 어린이보호, 시설안전, 기타 등 설치목적에 따라 관리기관과 열람 절차가 다를 수 있습니다.
          </p>
          <p>
            CCTV 영상 확인이 필요한 경우에는 위치 정보만으로 바로 영상을 볼 수 없으며,
            해당 관리기관 또는 정보공개포털을 통해 열람 신청 절차를 진행해야 합니다.
            다목적, 기타, 단속 목적처럼 원본 분류가 애매한 자료는 상세페이지에서 표준 분류와 원본 목적을 함께 확인할 수 있습니다.
          </p>
        </section>
      </div>
    </main>
  );
}
