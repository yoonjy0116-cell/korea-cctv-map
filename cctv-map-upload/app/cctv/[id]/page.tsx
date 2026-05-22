import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, FileText, MapPin } from "lucide-react";

import AdsenseAd from "../../components/AdsenseAd";
import PolicyLinks from "../../components/PolicyLinks";
import { findCctvByManagementNumber, getBestRegionSummary, getNearbyCctvs } from "../../../lib/cctvData";

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

function variantIndex(value: string, size: number) {
  let hash = 0;
  for (const char of value) {
    hash = (hash * 31 + char.charCodeAt(0)) % 9973;
  }
  return hash % size;
}

function getPurposePhrase(purpose: string) {
  if (purpose === "방범") return "방범 CCTV 위치 확인, 생활안전, 사고 발생 지점 확인";
  if (purpose === "교통") return "교통 CCTV 위치 확인, 도로 주변 CCTV 검색, 교통 상황 확인";
  if (purpose === "어린이보호") return "어린이보호 CCTV 위치 확인, 통학로와 보호구역 주변 안전 확인";
  if (purpose === "시설안전") return "시설안전 CCTV 위치 확인, 공공시설과 주변 안전 관리 확인";
  return "CCTV 위치 확인, 주변 CCTV 검색, 관리기관 정보 확인";
}

function getDetailCopy(item: {
  address: string;
  seoArea: string;
  purpose: string;
  cameraCount: number;
  manager: string;
  direction?: string;
}) {
  const direction = item.direction || "촬영방면정보가 원본 데이터에 별도로 등록되어 있지 않습니다";
  const phrase = getPurposePhrase(item.purpose);
  const variants = [
    {
      heading: `${item.seoArea} ${item.purpose} CCTV 확인`,
      body: `${item.address}에 등록된 이 CCTV는 ${item.purpose} 목적의 공공데이터 항목입니다. ${phrase}이 필요한 경우 주소, 촬영방면정보, 관리기관을 먼저 확인해 보세요.`,
      note: `촬영방면정보는 ${direction}이며, 카메라는 ${item.cameraCount.toLocaleString()}대로 등록되어 있습니다. 관리기관은 ${item.manager}입니다.`
    },
    {
      heading: `${item.seoArea} CCTV 위치와 관리 정보`,
      body: `${item.seoArea} 주변 CCTV를 찾는 사용자를 위해 ${item.address} CCTV의 설치목적과 관리 정보를 정리했습니다. 이 페이지는 CCTV 보기 전 위치 확인과 열람 신청 준비에 참고할 수 있습니다.`,
      note: `${item.purpose} CCTV로 분류되어 있으며, 촬영방면정보는 ${direction}입니다. 실제 영상 열람 가능 여부는 관리기관 절차에 따라 달라집니다.`
    },
    {
      heading: `${item.address} CCTV 상세 안내`,
      body: `${item.address} CCTV 위치를 확인하려는 경우 설치목적, 카메라대수, 촬영방면정보를 함께 보는 것이 좋습니다. 공공데이터 기준 관리기관은 ${item.manager}입니다.`,
      note: `이 사이트는 실시간 CCTV 영상을 제공하지 않고, ${item.seoArea} CCTV 위치와 관리 정보 확인을 돕는 참고용 페이지입니다.`
    }
  ];

  return variants[variantIndex(`${item.address}-${item.manager}-${item.purpose}`, variants.length)];
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
  const copy = getDetailCopy(item);
  const description = compact(
    `${copy.body} 실시간 영상은 제공하지 않습니다.`
  );

  return {
    title,
    description,
    keywords: [
      `${item.seoArea} CCTV`,
      `${item.seoArea} CCTV 위치`,
      `${item.seoArea} 방범 CCTV`,
      `${item.seoArea} ${item.purpose} CCTV`,
      `${item.seoArea} CCTV 열람`,
      `${item.address} CCTV`,
      `${item.address} CCTV 위치`,
      `${item.address} CCTV 확인`,
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
  const regionSummary = await getBestRegionSummary(item.seoArea || item.region || item.address);
  const mapHref = `/?lat=${item.lat}&lng=${item.lng}&place=${encodeURIComponent(item.seoArea)}`;
  const regionHref = regionSummary ? `/region/${regionSummary.path.map(encodeURIComponent).join("/")}` : "/";
  const regionLabel = regionSummary?.area ?? item.seoArea;
  const detailCopy = getDetailCopy(item);
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

        <AdsenseAd className="adSlotDetailTop" label="CCTV 상세 상단 광고 영역" />

        <section className="seoTextBlock" aria-label={`${item.seoArea} CCTV 안내`}>
          <h2>{detailCopy.heading}</h2>
          <p>{detailCopy.body}</p>
          <p>{detailCopy.note}</p>
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

        <AdsenseAd className="adSlotDetailMiddle" label="CCTV 상세 본문 광고 영역" />

        <section className="nearbyBlock" aria-label="주변 CCTV 리스트">
          <div className="nearbyBlockHeader">
            <h2>주변 CCTV</h2>
            <Link className="nearbyHubLink" href={regionHref}>
              {regionLabel} 전체보기
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

        <PolicyLinks />
      </div>
    </main>
  );
}
