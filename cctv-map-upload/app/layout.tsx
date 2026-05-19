import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://cctv.idlun.com"),
  title: {
    default: "전국 CCTV 지도",
    template: "%s | 전국 CCTV 지도"
  },
  description:
    "전국 CCTV 위치를 지도, 주소, 목적, 촬영방면정보 기준으로 확인할 수 있는 공공데이터 기반 CCTV 지도입니다.",
  keywords: ["전국 CCTV 지도", "CCTV 위치", "방범 CCTV", "동네 CCTV", "공공데이터 CCTV"],
  verification: {
    other: {
      "naver-site-verification": "33b7657305618b89956de8a79e5344e60f6e5347"
    }
  },
  openGraph: {
    title: "전국 CCTV 지도",
    description: "공공데이터 기반 전국 CCTV 위치 검색 서비스",
    url: "https://cctv.idlun.com",
    siteName: "전국 CCTV 지도",
    locale: "ko_KR",
    type: "website"
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
