# 전국 방범용 CCTV 지도

Next.js와 Kakao Map API로 만든 공공데이터 기반 CCTV 위치 확인 사이트 예제입니다.
실시간 영상 조회 기능은 포함하지 않습니다.

## 1단계: Node.js 설치

Next.js를 실행하려면 Node.js가 필요합니다.

1. https://nodejs.org 에 접속합니다.
2. LTS 버전을 설치합니다.
3. 새 터미널을 열고 아래 명령으로 설치를 확인합니다.

```bash
node -v
npm -v
```

## 2단계: Kakao Map JavaScript 키 준비

1. https://developers.kakao.com 에 로그인합니다.
2. 내 애플리케이션을 만듭니다.
3. 플랫폼에서 Web을 추가합니다.
4. 로컬 실행용 사이트 도메인에 `http://localhost:3000`을 등록합니다.
5. 배포용 사이트 도메인에 `https://cctv.idlun.com`도 등록합니다.
6. JavaScript 키를 복사합니다.

## 3단계: 환경변수 파일 만들기

프로젝트 폴더에 `.env.local` 파일을 만들고 아래처럼 입력합니다.

```bash
NEXT_PUBLIC_KAKAO_MAP_APP_KEY=복사한_JavaScript_키
```

## 4단계: 패키지 설치

```bash
npm install
```

## 5단계: 개발 서버 실행

```bash
npm run dev
```

브라우저에서 http://localhost:3000 으로 접속합니다.

## 6단계: 공공데이터로 교체하기

현재 데이터는 `data/cctvLocations.ts`에 들어 있는 예시 데이터입니다.
공공데이터포털에서 CCTV 위치 데이터를 내려받은 뒤, 아래 항목 형태로 바꾸면 됩니다.

```ts
{
  id: 1,
  name: "CCTV 이름",
  region: "지역",
  address: "주소",
  purpose: "방범",
  cameraCount: 1,
  manager: "관리기관",
  lat: 37.5665,
  lng: 126.978
}
```

## 7단계: 배포

가장 쉬운 배포 방법은 Vercel입니다.

1. GitHub에 이 프로젝트를 올립니다.
2. https://vercel.com 에 가입합니다.
3. New Project에서 GitHub 저장소를 선택합니다.
4. Environment Variables에 `NEXT_PUBLIC_KAKAO_MAP_APP_KEY`를 추가합니다.
5. Deploy를 누릅니다.
6. 배포된 도메인 `https://cctv.idlun.com`을 Kakao Developers의 Web 플랫폼 도메인에도 추가합니다.

## 현재 기능

- Kakao Map API 지도 표시
- 공공데이터포털 전국 CCTV 표준데이터 검색 결과 표시
- 지역, 주소, CCTV명 검색
- CCTV 목적 필터
- 마커와 목록 클릭 시 상세정보 표시
- 모바일 반응형 레이아웃

## 공공데이터 출처

- 데이터명: 행정안전부_CCTV정보
- 출처: 공공데이터포털 전국CCTV표준데이터
- 제공 URL: https://file.localdata.go.kr/file/cctv_info/info
- 좌표계: WGS84 위도/경도

전국 원본 데이터는 매우 크기 때문에 앱은 검색 조건에 맞는 결과를 최대 500개까지 표시합니다.
검색어를 입력하거나 목적 필터를 선택하면 서버 API가 공공데이터를 조회해 지도 마커를 갱신합니다.
