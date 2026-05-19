import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Download, ExternalLink, FileText } from "lucide-react";

const requestFileUrl = "/downloads/personal-video-info-request.hwp";

export const metadata: Metadata = {
  title: "CCTV 열람 신청 방법",
  description:
    "정보공개포털에서 CCTV 개인영상정보 존재확인 및 열람을 청구하는 절차와 필수 작성 항목, 신청서 다운로드를 안내합니다."
};

const steps = [
  {
    title: "1단계: 정보공개청구 메뉴 입장",
    action: "정보공개포털 메인 화면에서 우측 하단의 [정보공개청구] 버튼을 클릭합니다.",
    image: "/images/cctv-request/cctv-request-step-1.webp"
  },
  {
    title: "2단계: 생활문제 해결정보 선택",
    action:
      "청구정보 입력 화면에서 '생활문제 해결정보 선택' 항목 옆에 있는 [생활문제 해결정보] 파란색 버튼을 클릭합니다.",
    image: "/images/cctv-request/cctv-request-step-5.webp"
  },
  {
    title: "3단계: 청구 유형(CCTV) 선택",
    action:
      "생활문제 해결정보 유형 목록이 나타나면, 여러 항목 중 [CCTV] 버튼을 선택합니다.",
    image: "/images/cctv-request/cctv-request-step-2.webp"
  },
  {
    title: "4단계: 사건·사고 발생지역 입력",
    action:
      "사건·사고 발생지역 항목에서 CCTV가 위치한 시도와 시군구를 선택합니다. 예: 서울특별시 동대문구",
    image: "/images/cctv-request/cctv-request-step-4.webp"
  },
  {
    title: "5단계: 청구내용 작성",
    action:
      "안내된 CCTV 작성예시를 확인한 뒤 [확인했습니다]에 체크하고, 청구내용을 구체적으로 작성합니다.",
    image: "/images/cctv-request/cctv-request-step-3.webp"
  },
  {
    title: "6단계: 청구기관 찾기",
    action:
      "청구기관 항목에서 [기관찾기] 버튼을 클릭해 해당 CCTV를 관리하는 기관을 검색합니다.",
    image: "/images/cctv-request/cctv-request-step-6.webp"
  },
  {
    title: "7단계: 기관 선택 확인",
    action:
      "생활문제 해결정보 기반으로 추천된 기관 또는 검색한 기관을 선택한 뒤 [확인] 버튼을 클릭합니다.",
    image: "/images/cctv-request/cctv-request-step-7.webp"
  },
  {
    title: "8단계: 청구인 정보 입력 및 접수",
    action:
      "청구인 정보를 입력하고 첨부자료와 자동등록방지 문자를 확인한 뒤, 하단의 [청구] 버튼으로 접수합니다.",
    image: "/images/cctv-request/cctv-request-step-8.webp"
  }
];

const requiredItems = [
  "영상 속 인물 인적사항: 성명, 주민번호 앞자리, 성별",
  "상세 식별정보: 인상착의, 차량번호 등",
  "사건·사고 정보: 발생 유형, 장소 및 구체적 시간",
  "CCTV 정보: 관리번호 및 설치장소",
  "영상 속 인물과의 관계: 본인, 가족, 대리인 등",
  "청구내용 또는 청구 요청자료",
  "관계 증명 제출자료: 신분증, 가족관계증명서, 위임장 등"
];

export default function CctvRequestPage() {
  return (
    <main className="detailPage">
      <div className="detailShell">
        <Link className="backLink" href="/">
          <ArrowLeft size={18} aria-hidden="true" />
          지도로 돌아가기
        </Link>

        <section className="detailHero">
          <p className="eyebrow">정보공개포털 기준 안내</p>
          <h1>CCTV 열람 신청 방법</h1>
          <p>
            CCTV 영상은 개인정보가 포함될 수 있어 바로 열람할 수 없습니다. 사고 확인, 분실물 확인,
            범죄 피해 확인 등 정당한 사유가 있을 때 정보공개포털 또는 관리기관을 통해
            개인영상정보 존재확인 및 열람을 청구할 수 있습니다.
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

        <section className="requestSteps" aria-label="CCTV 열람 신청 단계">
          {steps.map((step) => (
            <article className="requestStep" key={step.title}>
              <div>
                <h2>{step.title}</h2>
                <p>
                  <strong>행동:</strong> {step.action}
                </p>
              </div>
              <img src={step.image} alt={`${step.title} 화면 예시`} loading="lazy" />
            </article>
          ))}
        </section>

        <section className="seoTextBlock">
          <div className="sectionHeading">
            <FileText size={19} aria-hidden="true" />
            <h2>필수 작성 항목</h2>
          </div>
          <p>
            CCTV 열람 청구는 담당 기관이 필요한 영상을 찾을 수 있도록 구체적으로 작성하는 것이 중요합니다.
            아래 항목을 빠짐없이 정리해두면 신청 과정에서 도움이 됩니다.
          </p>
          <ul className="requestChecklist">
            {requiredItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
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
