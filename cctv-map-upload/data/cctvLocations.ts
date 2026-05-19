export type CctvPurpose = "방범" | "어린이보호" | "교통" | "시설안전";

export type CctvLocation = {
  id: string | number;
  name: string;
  region: string;
  address: string;
  purpose: CctvPurpose;
  cameraCount: number;
  manager: string;
  lat: number;
  lng: number;
  managementNumber?: string;
  direction?: string;
  slug?: string;
  distance?: number;
};

export const cctvLocations: CctvLocation[] = [
  {
    id: "sample-seoul",
    name: "서울특별시 중구 세종대로 110 CCTV",
    region: "서울특별시 중구",
    address: "서울특별시 중구 세종대로 110",
    purpose: "방범",
    cameraCount: 4,
    manager: "서울특별시 중구청",
    lat: 37.5665,
    lng: 126.978,
    direction: "주변 도로 및 보행로"
  }
];
