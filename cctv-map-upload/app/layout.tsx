import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://cctv.idlun.com"),
  title: {
    default: "전국 CCTV 위치 지도 | 방범용 CCTV 공공데이터 검색",
    template: "%s | 전국 CCTV 위치 지도"
  },
  description: "전국 방범용 CCTV 위치를 지역, 주소, 동 단위로 검색할 수 있는 공공데이터 기반 CCTV 지도입니다.",
  keywords: ["CCTV 위치", "방범용 CCTV", "동네 CCTV", "전국 CCTV 지도", "공공데이터 CCTV"],
  openGraph: {
    title: "전국 CCTV 위치 지도",
    description: "공공데이터 기반 전국 방범용 CCTV 위치 검색 서비스",
    url: "https://cctv.idlun.com",
    siteName: "전국 CCTV 위치 지도",
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
