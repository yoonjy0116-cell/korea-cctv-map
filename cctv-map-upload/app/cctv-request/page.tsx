import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Download, ExternalLink, FileText } from "lucide-react";

const requestFileUrl = "/downloads/personal-video-info-request.hwp";

export const metadata: Metadata = {
  title: "CCTV 열람 신청 방법",
  description:
    "정보공개포털 기준 CCTV 개인영상정보 존재확인 및 열람 신청 절차, 신청서 다운로드, 접수 방법을 안내합니다."
};

const steps = [
  {
    title: "1. 정보공개포털 접속",
    text: "정보공개포털에 접속한 뒤 청구 또는 신청 메뉴에서 CCTV 영상 열람과 관련된 민원을 준비합니다.",
    image: "/images/open-portal/open-portal-step-1.webp"
  },
  {
    title: "2. 청구 정보 입력",
    text: "청구인 정보, 연락처, 열람이 필요한 날짜와 시간, 장소를 최대한 구체적으로 입력합니다.",
    image: "/images/open-portal/open-portal-step-2.webp"
  },
  {
    title: "3. 대상 기관 확인",
    text: "CCTV 상세페이지에 표시된 관리기관을 기준으로 접수 기관을 확인합니다.",
    image: "/images/open-portal/open-portal-step-3.webp"
  },
  {
    title: "4. 신청서 첨부",
    text: "개인영상정보 존재확인 및 열람 청구서를 작성해 첨부합니다. 필요한 경우 신분 확인 자료나 사고 관련 자료가 요구될 수 있습니다.",
    image: "/images/open-portal/open-portal-step-5.webp"
  },
  {
    title: "5. 접수 후 기관 안내 확인",
    text: "기관 검토 후 열람 가능 여부, 방문 필요 여부, 제3자 개인정보 보호를 위한 제한 사항을 안내받습니다.",
    image: "/images/open-portal/open-portal-step-9.webp"
  }
];

export default function CctvRequestPage() {
  return (
    <main className="detailPage">
      <div className="detailShell">
        <Link className="backLink" href="/">
          <ArrowLeft size={18} aria-hidden="true" />
          지도 돌아가기
        </Link>

        <section className="detailHero">
          <p className="eyebrow">정보공개포털 기준 안내</p>
          <h1>CCTV 열람 신청 방법</h1>
          <p>
            CCTV 영상은 개인정보가 포함될 수 있어 누구나 바로 볼 수 없습니다. 사고 확인,
            분실물 확인, 범죄 피해 확인 등 정당한 사유가 있을 때 관리기관의 절차에 따라
            존재확인 또는 열람을 신청할 수 있습니다.
          </p>
          <div className="detailActions">
            <a className="detailActionPrimary" href={requestFileUrl} download>
              <Download size={17} aria-hidden="true" />
              신청서 파일 다운로드
            </a>
            <a className="detailActionSecondary" href="https://www.open.go.kr/" target="_blank" rel="noreferrer">
              정보공개포털 신청하러가기
              <ExternalLink size={16} aria-hidden="true" />
            </a>
          </div>
        </section>

        <section className="seoTextBlock">
          <div className="sectionHeading">
            <FileText size={19} aria-hidden="true" />
            <h2>신청 전 준비할 내용</h2>
          </div>
          <p>
            열람하려는 CCTV의 위치, 촬영 추정 일시, 사고 또는 확인 사유, 신청자 연락처를
            미리 정리해두면 접수 과정이 수월합니다. 상세페이지에서 관리기관과 전화번호를
            확인한 뒤 기관에 먼저 문의하는 것도 좋습니다.
          </p>
          <p>
            영상에는 다른 사람의 얼굴, 차량번호 등 개인정보가 포함될 수 있으므로 기관 판단에
            따라 열람이 제한되거나 일부 비식별 처리된 형태로 제공될 수 있습니다.
          </p>
        </section>

        <section className="requestSteps" aria-label="CCTV 열람 신청 절차">
          {steps.map((step) => (
            <article className="requestStep" key={step.title}>
              <div>
                <h2>{step.title}</h2>
                <p>{step.text}</p>
              </div>
              <img src={step.image} alt={`${step.title} 예시 화면`} loading="lazy" />
            </article>
          ))}
        </section>

        <section className="sourceBlock" aria-label="신청 링크">
          <h2>신청 및 서식</h2>
          <ul>
            <li>
              신청서:{" "}
              <a href={requestFileUrl} download>
                개인영상정보 존재확인 및 열람 청구서 다운로드
              </a>
            </li>
            <li>
              온라인 신청:{" "}
              <a href="https://www.open.go.kr/" target="_blank" rel="noreferrer">
                정보공개포털
                <ExternalLink size={14} aria-hidden="true" />
              </a>
            </li>
          </ul>
        </section>
      </div>
    </main>
  );
}
