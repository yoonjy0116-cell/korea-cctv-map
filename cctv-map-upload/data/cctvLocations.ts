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
};

export const cctvLocations: CctvLocation[] = [
  {
    id: 1,
    name: "서울시청 주변 방범 CCTV",
    region: "서울특별시 중구",
    address: "서울특별시 중구 세종대로 110",
    purpose: "방범",
    cameraCount: 4,
    manager: "서울특별시 중구청",
    lat: 37.5665,
    lng: 126.978
  },
  {
    id: 2,
    name: "부산역 광장 CCTV",
    region: "부산광역시 동구",
    address: "부산광역시 동구 중앙대로 206",
    purpose: "교통",
    cameraCount: 6,
    manager: "부산광역시 동구청",
    lat: 35.1151,
    lng: 129.0415
  },
  {
    id: 3,
    name: "대구 동성로 보행안전 CCTV",
    region: "대구광역시 중구",
    address: "대구광역시 중구 동성로2길 80",
    purpose: "방범",
    cameraCount: 3,
    manager: "대구광역시 중구청",
    lat: 35.8688,
    lng: 128.594
  },
  {
    id: 4,
    name: "인천 송도 센트럴파크 CCTV",
    region: "인천광역시 연수구",
    address: "인천광역시 연수구 컨벤시아대로 160",
    purpose: "시설안전",
    cameraCount: 5,
    manager: "인천광역시 연수구청",
    lat: 37.3925,
    lng: 126.6372
  },
  {
    id: 5,
    name: "광주 충장로 어린이보호 CCTV",
    region: "광주광역시 동구",
    address: "광주광역시 동구 중앙로 196",
    purpose: "어린이보호",
    cameraCount: 2,
    manager: "광주광역시 동구청",
    lat: 35.1468,
    lng: 126.9231
  },
  {
    id: 6,
    name: "대전 둔산동 방범 CCTV",
    region: "대전광역시 서구",
    address: "대전광역시 서구 둔산로 100",
    purpose: "방범",
    cameraCount: 4,
    manager: "대전광역시 서구청",
    lat: 36.3504,
    lng: 127.3845
  },
  {
    id: 7,
    name: "울산 태화강 국가정원 CCTV",
    region: "울산광역시 중구",
    address: "울산광역시 중구 태화강국가정원길 154",
    purpose: "시설안전",
    cameraCount: 7,
    manager: "울산광역시 중구청",
    lat: 35.5489,
    lng: 129.3004
  },
  {
    id: 8,
    name: "세종 정부청사 주변 CCTV",
    region: "세종특별자치시",
    address: "세종특별자치시 도움6로 11",
    purpose: "방범",
    cameraCount: 8,
    manager: "세종특별자치시청",
    lat: 36.4801,
    lng: 127.289
  },
  {
    id: 9,
    name: "수원역 환승센터 CCTV",
    region: "경기도 수원시",
    address: "경기도 수원시 팔달구 덕영대로 924",
    purpose: "교통",
    cameraCount: 6,
    manager: "수원시청",
    lat: 37.2656,
    lng: 126.9999
  },
  {
    id: 10,
    name: "제주 시청 주변 CCTV",
    region: "제주특별자치도 제주시",
    address: "제주특별자치도 제주시 광양9길 10",
    purpose: "방범",
    cameraCount: 4,
    manager: "제주시청",
    lat: 33.4996,
    lng: 126.5312
  }
];
