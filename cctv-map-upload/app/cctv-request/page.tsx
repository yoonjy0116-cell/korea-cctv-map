import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";

export const metadata: Metadata = {
  title: "CCTV 열람 신청 방법",
  description:
    "CCTV 영상 열람이 필요한 경우 확인해야 할 신청 절차, 관리기관 문의, 개인정보 보호 유의사항을 안내합니다."
};

export default function CctvRequestPage() {
  return (
    <main className="detailPage">
      <div className="detailShell">
        <Link className="backLink" href="/">
          <ArrowLeft size={18} aria-hidden="true" />
          지도 돌아가기
        </Link>

        <section className="detailHero">
          <p className="eyebrow">안내 페이지</p>
          <h1>CCTV 열람 신청 방법</h1>
          <p>
            이 사이트는 CCTV 위치와 관리 정보를 제공하며, 실시간 영상이나 녹화 영상을 직접
            제공하지 않습니다. 영상 열람이 필요한 경우 관리기관의 공식 절차를 통해 신청해야 합니다.
          </p>
        </section>

        <section className="seoTextBlock">
          <div className="sectionHeading">
            <FileText size={19} aria-hidden="true" />
            <h2>신청 전 확인할 사항</h2>
          </div>
          <p>
            CCTV 영상에는 다른 사람의 개인정보가 포함될 수 있으므로, 열람은 사고 확인,
            분실물 확인, 범죄 피해 확인 등 정당한 사유가 있을 때 관리기관 판단에 따라 제한적으로
            진행됩니다.
          </p>
          <p>
            상세 페이지에서 관리기관과 전화번호를 확인한 뒤, 해당 기관에 열람 가능 여부,
            신청 서류, 방문 필요 여부를 문의하세요.
          </p>
        </section>

        <section className="detailGridBlock">
          <h2>일반적인 신청 절차</h2>
          <dl className="detailGrid">
            <div className="infoRow">
              <dt>1단계</dt>
              <dd>CCTV 위치와 관리기관 확인</dd>
            </div>
            <div className="infoRow">
              <dt>2단계</dt>
              <dd>관리기관에 열람 가능 여부 문의</dd>
            </div>
            <div className="infoRow">
              <dt>3단계</dt>
              <dd>신분증, 신청서, 사고 관련 정보 등 필요 서류 준비</dd>
            </div>
            <div className="infoRow">
              <dt>4단계</dt>
              <dd>기관 심사 후 열람 또는 제공 가능 범위 안내</dd>
            </div>
          </dl>
        </section>
      </div>
    </main>
  );
}
