import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPin } from "lucide-react";

import { findCctvByManagementNumber } from "../../../lib/cctvData";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

function compact(value: string) {
  return value.replace(/\s+/g, " ").trim();
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

  const title = `${item.seoArea} CCTV 위치 | 방범용 CCTV 상세정보`;
  const description = compact(
    `${item.seoArea} CCTV 위치를 확인하세요. 주소는 ${item.address}이며, 설치목적은 ${item.purpose}, 카메라 대수는 ${item.cameraCount}대, 관리기관은 ${item.manager}입니다.`
  );

  return {
    title,
    description,
    keywords: [
      `${item.seoArea} CCTV`,
      `${item.seoArea} 방범 CCTV`,
      `${item.seoArea} CCTV 위치`,
      `${item.address} CCTV`,
      "방범용 CCTV",
      "공공데이터 CCTV"
    ],
    alternates: {
      canonical: `/cctv/${encodeURIComponent(item.managementNumber)}`
    },
    openGraph: {
      title,
      description,
      url: `/cctv/${encodeURIComponent(item.managementNumber)}`,
      type: "article",
      locale: "ko_KR"
    }
  };
}

export default async function CctvDetailPage({ params }: Props) {
  const { id } = await params;
  const item = await findCctvByManagementNumber(decodeURIComponent(id));

  if (!item) notFound();

  const pageUrl = `https://cctv.idlun.com/cctv/${encodeURIComponent(item.managementNumber)}`;
  const title = `${item.seoArea} CCTV 위치 정보`;
  const description = `${item.seoArea} CCTV는 ${item.address}에 위치한 공공데이터 기반 CCTV 정보입니다.`;
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
      { "@type": "PropertyValue", name: "관리기관", value: item.manager }
    ]
  };

  const mainFields = [
    ["관리번호", item.managementNumber],
    ["지역", item.seoArea],
    ["도로명주소", item.roadAddress],
    ["지번주소", item.lotAddress],
    ["설치목적", item.purpose],
    ["카메라대수", `${item.cameraCount}대`],
    ["카메라화소수", item.pixel],
    ["촬영방면정보", item.direction],
    ["보관일수", item.retentionDays ? `${item.retentionDays}일` : ""],
    ["설치연월", item.installedAt],
    ["관리기관", item.manager],
    ["관리기관전화번호", item.phone],
    ["위도", String(item.lat)],
    ["경도", String(item.lng)],
    ["데이터기준일자", item.dataDate],
    ["최종수정시점", item.updatedAt]
  ].filter(([, value]) => value);

  return (
    <main className="detailPage">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <div className="detailShell">
        <Link className="backLink" href="/">
          <ArrowLeft size={18} aria-hidden="true" />
          지도 돌아가기
        </Link>

        <section className="detailHero">
          <p className="eyebrow">공공데이터 CCTV 위치</p>
          <h1>{title}</h1>
          <p>
            {item.seoArea} CCTV 위치를 찾는 분들을 위해 공공데이터 기준의 주소, 설치목적,
            카메라 대수, 관리기관, 좌표 정보를 정리했습니다.
          </p>
        </section>

        <section className="seoTextBlock" aria-label={`${item.seoArea} CCTV 안내`}>
          <h2>{item.seoArea} CCTV 안내</h2>
          <p>
            이 페이지는 {item.seoArea} 주변 CCTV 위치 정보를 확인할 수 있는 상세 페이지입니다.
            해당 CCTV는 <strong>{item.address}</strong>에 있으며, 설치목적은
            <strong> {item.purpose}</strong>입니다. 카메라는 총
            <strong> {item.cameraCount}대</strong>로 등록되어 있고, 관리기관은
            <strong> {item.manager}</strong>입니다.
          </p>
          <p>
            네이버에서 "{item.seoArea} CCTV", "{item.seoArea} 방범 CCTV",
            "{item.seoArea} CCTV 위치"처럼 검색하는 사용자가 필요한 정보를 빠르게 확인할 수
            있도록 공공데이터 원본 항목을 함께 제공합니다. 실시간 영상은 제공하지 않으며,
            위치와 관리 정보 확인 용도로만 사용할 수 있습니다.
          </p>
        </section>

        <section className="detailGrid" aria-label="CCTV 주요 정보">
          {mainFields.map(([label, value]) => (
            <div className="infoRow" key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </section>

        <section className="rawBlock" aria-label="공공데이터 원본 전체 항목">
          <div className="sectionHeading">
            <MapPin size={19} aria-hidden="true" />
            <h2>{item.seoArea} CCTV 공공데이터 원본</h2>
          </div>
          <dl className="rawGrid">
            {Object.entries(item.raw).map(([label, value]) => (
              <div className="infoRow" key={label}>
                <dt>{label}</dt>
                <dd>{value || "-"}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
    </main>
  );
}
