import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://cctv.idlun.com"),
  title: "전국 방범용 CCTV 지도",
  description: "공공데이터 기반 방범용 CCTV 위치 확인 사이트"
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
