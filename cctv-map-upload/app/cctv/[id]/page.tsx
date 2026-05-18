import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPin } from "lucide-react";

import { findCctvByManagementNumber } from "@/lib/cctvData";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

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

  return {
    title: `${item.address} CCTV 상세정보`,
    description: `${item.address} CCTV 설치목적, 카메라대수, 관리기관, 좌표 등 공공데이터 상세정보입니다.`,
    alternates: {
      canonical: `/cctv/${encodeURIComponent(item.managementNumber)}`
    },
    openGraph: {
      title: `${item.address} CCTV 상세정보`,
      description: `${item.manager} 관리 CCTV 공공데이터 상세정보`,
      url: `/cctv/${encodeURIComponent(item.managementNumber)}`,
      type: "article"
    }
  };
}

export default async function CctvDetailPage({ params }: Props) {
  const { id } = await params;
  const item = await findCctvByManagementNumber(decodeURIComponent(id));

  if (!item) notFound();

  const mainFields = [
    ["관리번호", item.managementNumber],
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
      <div className="detailShell">
        <Link className="backLink" href="/">
          <ArrowLeft size={18} aria-hidden="true" />
          지도 돌아가기
        </Link>

        <section className="detailHero">
          <p className="eyebrow">공공데이터 CCTV 상세정보</p>
          <h1>{item.address} CCTV</h1>
          <p>{item.manager}에서 관리하는 CCTV 위치 및 설치 정보입니다.</p>
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
            <h2>공공데이터 원본 전체 항목</h2>
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
