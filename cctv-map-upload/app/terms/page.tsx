import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import PolicyLinks from "../components/PolicyLinks";

export const metadata: Metadata = {
  title: "이용안내 및 책임 제한",
  description: "전국 CCTV 지도의 공공데이터 이용, 실시간 영상 미제공, 정보 정확성 및 책임 제한 안내입니다."
};

export default function TermsPage() {
  return (
    <main className="detailPage">
      <div className="detailShell">
        <Link className="backLink" href="/">
          <ArrowLeft size={18} aria-hidden="true" />
          지도로 돌아가기
        </Link>

        <section className="detailHero">
          <p className="eyebrow">서비스 이용 전 확인</p>
          <h1>이용안내 및 책임 제한</h1>
          <p>
            전국 CCTV 지도는 공공데이터를 바탕으로 CCTV 위치와 관리 정보를 쉽게 확인할 수 있도록
            정리한 참고용 서비스입니다.
          </p>
        </section>

        <section className="seoTextBlock">
          <h2>서비스 제공 범위</h2>
          <p>
            본 사이트는 CCTV 위치, 설치목적, 촬영방면정보, 카메라대수, 관리기관 등 공개된
            공공데이터 기반 정보를 제공합니다.
          </p>
          <p>
            CCTV 실시간 영상, 녹화 영상, 개인영상정보는 제공하지 않습니다.
          </p>
        </section>

        <section className="seoTextBlock">
          <h2>정보 정확성 안내</h2>
          <p>
            제공 정보는 공공데이터 원본의 갱신 시점, 관리기관의 자료 관리 방식, 좌표 오차,
            주소 변경 등에 따라 실제 현황과 다를 수 있습니다.
          </p>
          <p>
            사고 확인, 민원 접수, CCTV 열람 신청 등 중요한 목적에는 반드시 해당 관리기관 또는
            공공데이터포털 원본 정보를 함께 확인해 주세요.
          </p>
        </section>

        <section className="seoTextBlock">
          <h2>CCTV 열람 신청 안내</h2>
          <p>
            CCTV 영상 열람 가능 여부는 해당 CCTV 관리기관의 판단, 관련 법령, 본인 확인,
            사건 관련성, 보관기간 등에 따라 달라질 수 있습니다.
          </p>
          <p>
            본 사이트는 CCTV 열람 신청 절차를 안내할 뿐, 영상 제공 여부를 보장하지 않습니다.
          </p>
        </section>

        <section className="seoTextBlock">
          <h2>책임 제한</h2>
          <p>
            본 사이트의 정보는 참고용이며 정확성, 완전성, 최신성을 보장하지 않습니다.
            정보 오류, 위치 오차, 데이터 지연 또는 이용자의 판단에 따른 손해에 대해
            사이트 운영자는 법령상 허용되는 범위 내에서 책임을 부담하지 않습니다.
          </p>
        </section>

        <section className="sourceBlock" aria-label="출처">
          <h2>데이터 출처</h2>
          <p>
            본 사이트의 CCTV 위치 및 관리 정보는 공공데이터 기반 자료를 사용해 구성했습니다.
          </p>
          <ul>
            <li>
              출처:{" "}
              <a href="https://www.data.go.kr/" target="_blank" rel="noreferrer">
                공공데이터포털
              </a>
            </li>
          </ul>
        </section>

        <section className="sourceBlock" aria-label="문의">
          <h2>문의</h2>
          <p>
            사이트 이용, 정보 오류, 개인정보 처리 관련 문의는{" "}
            <a href="mailto:adcore2424@gmail.com">adcore2424@gmail.com</a>으로 연락해 주세요.
          </p>
        </section>

        <PolicyLinks />
      </div>
    </main>
  );
}
