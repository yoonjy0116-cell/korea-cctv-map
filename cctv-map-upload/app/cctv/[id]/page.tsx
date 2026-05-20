import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, FileText, MapPin } from "lucide-react";

import { findCctvByManagementNumber, getNearbyCctvs } from "../../../lib/cctvData";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

function compact(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function formatDistance(distance?: number) {
  if (typeof distance !== "number") return "";
  if (distance < 1000) return `약 ${distance.toLocaleString()}m`;
  return `약 ${(distance / 1000).toFixed(1)}km`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const item = await findCctvByManagementNumber(decodeURIComponent(id));

  if (!item) {
    return {
      title: "CCTV 상세정보",
      robots: {
        index: false
      }
    };
  }

  const title = `${item.seoArea} CCTV 위치 정보`;
  const description = compact(
    `${item.address} CCTV 위치, 설치목적, 촬영방면정보, 카메라대수, 관리기관 정보를 공공데이터 기준으로 확인할 수 있습니다. 실시간 영상은 제공하지 않습니다.`
  );

  return {
    title,
    description,
    keywords: [
      `${item.seoArea} CCTV`,
      `${item.seoArea} CCTV 위치`,
      `${item.seoArea} 방범 CCTV`,
      `${item.address} CCTV`,
      `${item.address} CCTV 위치`,
      "전국 CCTV 지도",
      "공공데이터 CCTV"
    ],
    alternates: {
      canonical: `/cctv/${encodeURIComponent(item.slug)}`
    },
    openGraph: {
      title,
      description,
      url: `/cctv/${encodeURIComponent(item.slug)}`,
      type: "article",
      locale: "ko_KR"
    }
  };
}

export default async function CctvDetailPage({ params }: Props) {
  const { id } = await params;
  const item = await findCctvByManagementNumber(decodeURIComponent(id));

  if (!item) notFound();

  const pageUrl = `https://cctv.idlun.com/cctv/${encodeURIComponent(item.slug)}`;
  const title = item.seoTitle;
  const nearbyCctvs = await getNearbyCctvs(item, 8);
  const mapHref = `/?lat=${item.lat}&lng=${item.lng}&place=${encodeURIComponent(item.seoArea)}`;
  const regionHref = `/region/${item.seoArea.split(/\s+/).filter(Boolean).map(encodeURIComponent).join("/")}`;
  const description = `${item.address}에 등록된 CCTV 위치와 관리 정보를 공공데이터 기준으로 정리한 상세 페이지입니다.`;
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Place",
    name: title,
    description,
    url: pageUrl,
    address: item.address,
    geo: {
      "@type": "GeoCoordinates",
      latitude: item.lat,
      longitude: item.lng
    },
    identifier: item.managementNumber,
    additionalProperty: [
      { "@type": "PropertyValue", name: "설치목적", value: item.purpose },
      { "@type": "PropertyValue", name: "카메라대수", value: `${item.cameraCount}대` },
      { "@type": "PropertyValue", name: "촬영방면정보", value: item.direction || "정보 없음" },
      { "@type": "PropertyValue", name: "관리기관", value: item.manager }
    ]
  };

  const fields = [
    ["지역", item.seoArea],
    ["도로명주소", item.roadAddress || item.address],
    ["설치목적", item.purpose],
    ["카메라대수", `${item.cameraCount}대`],
    ["카메라화소수", item.pixel || "정보 없음"],
    ["촬영방면정보", item.direction || "정보 없음"],
    ["보관일수", item.retentionDays ? `${item.retentionDays}일` : "정보 없음"],
    ["관리기관", item.manager],
    ["관리기관전화번호", item.phone || "정보 없음"],
    ["관리번호", item.managementNumber]
  ];

  return (
    <main className="detailPage">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <div className="detailShell">
        <Link className="backLink" href="/">
          <ArrowLeft size={18} aria-hidden="true" />
          지도로 돌아가기
        </Link>

        <section className="detailHero">
          <p className="eyebrow">공공데이터 CCTV 위치</p>
          <h1>{title}</h1>
          <p>
            {item.address} CCTV의 설치목적, 촬영방면정보, 카메라대수, 관리기관 정보를
            공공데이터 기준으로 확인할 수 있습니다.
          </p>
          <div className="detailActions">
            <Link className="detailActionPrimary" href="/cctv-request">
              <FileText size={17} aria-hidden="true" />
              CCTV 열람 신청
            </Link>
            <Link className="detailActionSecondary" href={mapHref}>
              <MapPin size={17} aria-hidden="true" />
              지도 바로가기
            </Link>
          </div>
        </section>

        <aside className="adSlot adSlotDetailTop" aria-label="상단 광고 영역">
          광고 영역
        </aside>

        <section className="seoTextBlock" aria-label={`${item.seoArea} CCTV 안내`}>
          <h2>{item.seoArea} CCTV 안내</h2>
          <p>
            이 페이지는 {item.seoArea} 주변 CCTV 위치를 찾는 사용자가 주소와 관리 정보를
            빠르게 확인할 수 있도록 만든 상세 정보 페이지입니다. 등록 주소는
            <strong> {item.address}</strong>이며, 설치목적은 <strong>{item.purpose}</strong>입니다.
          </p>
          <p>
            CCTV 영상 열람이 필요한 경우에는 해당 CCTV를 관리하는 기관의 절차에 따라 신청해야 합니다.
            이 사이트는 실시간 영상이나 녹화 영상을 제공하지 않으며, 위치 확인과 관리 정보 안내를 목적으로 합니다.
          </p>
        </section>

        <section className="detailGridBlock" aria-label={`${item.seoArea} CCTV 정보`}>
          <div className="sectionHeading">
            <MapPin size={19} aria-hidden="true" />
            <h2>{item.seoArea} CCTV 정보</h2>
          </div>
          <dl className="detailGrid">
            {fields.map(([label, value]) => (
              <div className="infoRow" key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <aside className="adSlot adSlotDetailMiddle" aria-label="본문 광고 영역">
          광고 영역
        </aside>

        <section className="nearbyBlock" aria-label="주변 CCTV 리스트">
          <div className="nearbyBlockHeader">
            <h2>주변 CCTV</h2>
            <Link className="nearbyHubLink" href={regionHref}>
              {item.seoArea} 허브페이지
            </Link>
          </div>
          <p>{item.address} 근처에 등록된 CCTV 위치 정보입니다.</p>
          <div className="nearbyList">
            {nearbyCctvs.map((nearby) => (
              <Link
                className="nearbyItem"
                href={`/cctv/${encodeURIComponent(nearby.slug)}`}
                key={nearby.managementNumber}
              >
                <strong>{nearby.name}</strong>
                <span>
                  {nearby.address} · {nearby.purpose}
                  {typeof nearby.distance === "number" ? ` · ${formatDistance(nearby.distance)}` : ""}
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section className="sourceBlock" aria-label="출처">
          <h2>출처</h2>
          <p>
            본 페이지의 CCTV 위치 및 관리 정보는 공공데이터 기반 자료를 사용해 구성했습니다.
          </p>
          <ul>
            <li>
              출처:{" "}
              <a href="https://www.data.go.kr/" target="_blank" rel="noreferrer">
                공공데이터포털
                <ExternalLink size={14} aria-hidden="true" />
              </a>
            </li>
          </ul>
        </section>
      </div>
    </main>
  );
}
