import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, FileText, Map, MapPin } from "lucide-react";

import { findCctvByManagementNumber, getNearbyCctvs } from "../../../lib/cctvData";
import AdsenseAd from "../../components/AdsenseAd";

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

function getPurposeSentence(purpose: string, rawPurpose?: string) {
  const raw = rawPurpose && rawPurpose !== purpose ? ` 원본 데이터의 설치목적은 ${rawPurpose}로 등록되어 있습니다.` : "";

  if (purpose === "교통") return `교통 흐름 확인, 단속, 도로 이용 안전과 관련된 CCTV 위치입니다.${raw}`;
  if (purpose === "어린이보호") return `어린이보호구역이나 통학로 주변 안전 확인에 필요한 CCTV 위치입니다.${raw}`;
  if (purpose === "시설안전") return `시설물 관리, 재난 대응, 공공시설 안전 확인과 관련된 CCTV 위치입니다.${raw}`;
  if (purpose === "기타") return `공공데이터 원본에서 다목적, 기타, 단속 등으로 분류된 CCTV 위치입니다.${raw}`;
  return `생활방범, 차량방범 등 주변 안전 확인 목적으로 등록된 CCTV 위치입니다.${raw}`;
}

function getDirectionSentence(direction: string) {
  if (!direction) return "촬영방면정보는 원본 데이터에 별도로 표시되어 있지 않습니다.";
  return `촬영방면정보는 ${direction}입니다. 현장 상황에 따라 실제 촬영 범위와 다를 수 있습니다.`;
}

function getManagerSentence(manager: string, phone: string) {
  if (phone) return `관리기관은 ${manager}이며, 원본 데이터에 등록된 연락처는 ${phone}입니다.`;
  return `관리기관은 ${manager}입니다. 전화번호가 없는 경우 해당 기관 대표 연락처나 정보공개포털을 통해 확인하는 것이 좋습니다.`;
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
    `${item.address} CCTV 위치 정보입니다. 설치목적은 ${item.purpose}, 촬영방면은 ${item.direction || "정보 없음"}이며 관리기관은 ${item.manager}입니다.`
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
      `${item.purpose} CCTV`,
      item.rawPurpose ? `${item.rawPurpose} CCTV` : "",
      "전국 CCTV 지도",
      "공공데이터 CCTV"
    ].filter(Boolean),
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
  const purposeSentence = getPurposeSentence(item.purpose, item.rawPurpose);
  const directionSentence = getDirectionSentence(item.direction);
  const managerSentence = getManagerSentence(item.manager, item.phone);
  const description = `${item.address} CCTV 위치와 관리 정보를 공공데이터 기준으로 정리한 상세 페이지입니다.`;
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
      { "@type": "PropertyValue", name: "표준분류", value: item.purpose },
      { "@type": "PropertyValue", name: "원본목적", value: item.rawPurpose || item.purpose },
      { "@type": "PropertyValue", name: "카메라대수", value: `${item.cameraCount}대` },
      { "@type": "PropertyValue", name: "촬영방면정보", value: item.direction || "정보 없음" },
      { "@type": "PropertyValue", name: "관리기관", value: item.manager }
    ]
  };

  const fields = [
    ["지역", item.seoArea],
    ["도로명주소", item.roadAddress || item.address],
    ["지번주소", item.lotAddress || "정보 없음"],
    ["설치목적", item.purpose],
    ["원본목적", item.rawPurpose || item.purpose],
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
            {item.address}에 등록된 CCTV 위치, 설치목적, 촬영방면정보, 카메라대수, 관리기관 정보를
            공공데이터 기준으로 확인할 수 있습니다.
          </p>
          <div className="detailActions">
            <Link className="detailActionPrimary" href={`/?lat=${item.lat}&lng=${item.lng}&place=${encodeURIComponent(item.seoArea)}`}>
              <Map size={17} aria-hidden="true" />
              지도로 보기
            </Link>
            <Link className="detailActionPrimary" href="/cctv-request">
              <FileText size={17} aria-hidden="true" />
              CCTV 열람 신청
            </Link>
          </div>
        </section>

        <AdsenseAd className="adSlotDetailTop" label="상단 광고 영역" />

        <section className="seoTextBlock" aria-label={`${item.seoArea} CCTV 안내`}>
          <h2>{item.seoArea} CCTV 안내</h2>
          <p>
            {item.seoArea}에서 CCTV 위치를 찾는 사용자가 주소와 관리 정보를 빠르게 확인할 수 있도록
            원본 공공데이터 항목을 정리했습니다. 이 위치의 표준 분류는 <strong>{item.purpose}</strong>입니다.
          </p>
          <p>{purposeSentence}</p>
          <p>{directionSentence}</p>
          <p>
            {managerSentence} 실시간 영상은 제공하지 않으며, 영상 열람이 필요한 경우에는 관리기관 또는
            정보공개포털을 통해 별도 절차로 신청해야 합니다.
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

        <AdsenseAd className="adSlotDetailMiddle" label="본문 광고 영역" />

        <section className="nearbyBlock" aria-label="주변 CCTV 리스트">
          <h2>주변 CCTV</h2>
          <p>{item.address} 주변에 등록된 CCTV 위치 정보입니다.</p>
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
          <p>본 페이지의 CCTV 위치 및 관리 정보는 공공데이터 기반 자료를 사용해 구성했습니다.</p>
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
