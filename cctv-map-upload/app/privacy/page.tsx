import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import PolicyLinks from "../components/PolicyLinks";

export const metadata: Metadata = {
  title: "개인정보처리방침",
  description: "전국 CCTV 지도의 개인정보 처리, 쿠키, 광고 식별자 및 제3자 광고 이용 안내입니다."
};

export default function PrivacyPage() {
  return (
    <main className="detailPage">
      <div className="detailShell">
        <Link className="backLink" href="/">
          <ArrowLeft size={18} aria-hidden="true" />
          지도로 돌아가기
        </Link>

        <section className="detailHero">
          <p className="eyebrow">사이트 운영 안내</p>
          <h1>개인정보처리방침</h1>
          <p>
            전국 CCTV 지도는 공공데이터 기반 CCTV 위치 정보를 제공하는 서비스입니다.
            사이트 이용 과정에서 개인정보를 최소한으로 처리하며, 광고 제공과 통계 확인을 위해
            쿠키 등 자동 수집 기술이 사용될 수 있습니다.
          </p>
        </section>

        <section className="seoTextBlock">
          <h2>수집하는 개인정보</h2>
          <p>
            현재 사이트는 회원가입, 댓글, 문의폼을 운영하지 않으며 이름, 연락처, 주민등록번호 등
            이용자가 직접 입력하는 개인정보를 수집하지 않습니다.
          </p>
          <p>
            다만 서비스 운영 과정에서 접속 IP, 브라우저 정보, 방문 일시, 기기 정보와 같은
            자동 생성 정보가 서버 로그 또는 보안 로그로 처리될 수 있습니다.
          </p>
        </section>

        <section className="seoTextBlock">
          <h2>쿠키 및 광고</h2>
          <p>
            이 사이트는 Google AdSense 광고를 사용할 수 있습니다. Google 및 제3자 광고 사업자는
            쿠키 또는 광고 식별자를 사용해 이용자의 이전 방문 기록이나 관심사에 기반한 광고를
            표시할 수 있습니다.
          </p>
          <p>
            이용자는 브라우저 설정에서 쿠키 저장을 거부하거나 삭제할 수 있으며, 맞춤형 광고 설정은
            Google 광고 설정 페이지에서 변경할 수 있습니다.
          </p>
        </section>

        <section className="seoTextBlock">
          <h2>개인정보의 이용 목적</h2>
          <ul className="requestChecklist">
            <li>사이트 접속 및 서비스 제공 상태 확인</li>
            <li>오류, 보안 문제, 비정상 접속 대응</li>
            <li>광고 노출 및 광고 품질 개선</li>
            <li>검색엔진 색인 및 사이트 품질 개선</li>
          </ul>
        </section>

        <section className="seoTextBlock">
          <h2>보유 및 파기</h2>
          <p>
            자동 생성 로그는 서비스 운영과 보안 확인에 필요한 기간 동안 보관될 수 있으며,
            목적이 달성되거나 보관 필요성이 사라진 경우 지체 없이 삭제합니다.
          </p>
        </section>

        <section className="seoTextBlock">
          <h2>문의</h2>
          <p>
            개인정보 처리와 관련한 문의는 아래 이메일로 접수할 수 있습니다.
          </p>
          <p>
            <a href="mailto:adcore2424@gmail.com">adcore2424@gmail.com</a>
          </p>
        </section>

        <PolicyLinks />
      </div>
    </main>
  );
}
