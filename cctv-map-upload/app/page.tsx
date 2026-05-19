"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Cctv, Filter, Loader2, MapPin, Search } from "lucide-react";
import { cctvLocations, type CctvLocation } from "../data/cctvLocations";

type KakaoMap = any;

declare global {
  interface Window {
    kakao?: any;
  }
}

const SEOUL_CITY_HALL = { lat: 37.5665, lng: 126.978 };
const INITIAL_KEYWORD = "서울특별시 중구";
const purposes = ["전체", "방범", "어린이보호", "교통", "시설안전"] as const;

function escapeHtml(value = "") {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export default function Home() {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const kakaoMapRef = useRef<KakaoMap | null>(null);
  const markersRef = useRef<any[]>([]);
  const infoWindowRef = useRef<any | null>(null);
  const [locations, setLocations] = useState<CctvLocation[]>(cctvLocations);
  const [keywordInput, setKeywordInput] = useState(INITIAL_KEYWORD);
  const [keyword, setKeyword] = useState(INITIAL_KEYWORD);
  const [purpose, setPurpose] = useState<(typeof purposes)[number]>("전체");
  const [selected, setSelected] = useState<CctvLocation | null>(cctvLocations[0]);
  const [isMapReady, setIsMapReady] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [dataMessage, setDataMessage] = useState("검색결과를 불러오는 중입니다.");
  const [mapError, setMapError] = useState("");

  const filteredLocations = useMemo(() => locations, [locations]);

  const openInfoWindow = (item: CctvLocation, position: any) => {
    if (!kakaoMapRef.current || !window.kakao) return;

    const detailUrl = item.slug
      ? `/cctv/${encodeURIComponent(item.slug)}`
      : "/";
    const content = `
      <div class="markerInfo">
        <strong>${escapeHtml(item.name)}</strong>
        <span>${escapeHtml(item.address)}</span>
        <small>${escapeHtml(item.direction || "촬영방면정보 없음")}</small>
        ${item.managementNumber ? `<a href="${detailUrl}">자세히 보기</a>` : ""}
      </div>
    `;

    if (!infoWindowRef.current) {
      infoWindowRef.current = new window.kakao.maps.InfoWindow({
        removable: true,
        zIndex: 1000
      });
    }

    infoWindowRef.current.setContent(content);
    infoWindowRef.current.setPosition(position);
    infoWindowRef.current.open(kakaoMapRef.current);
  };

  useEffect(() => {
    const appKey = process.env.NEXT_PUBLIC_KAKAO_MAP_APP_KEY;

    if (!appKey) {
      setMapError(".env.local 파일에 Kakao JavaScript 키를 입력하면 지도가 표시됩니다.");
      return;
    }

    if (window.kakao?.maps) {
      setIsMapReady(true);
      return;
    }

    const script = document.createElement("script");
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${appKey}&autoload=false`;
    script.async = true;
    script.onload = () => {
      window.kakao.maps.load(() => setIsMapReady(true));
    };
    script.onerror = () => {
      setMapError("Kakao Map API를 불러오지 못했습니다. 앱 키와 도메인 설정을 확인하세요.");
    };
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setIsDataLoading(true);
      setDataMessage("검색결과를 불러오는 중입니다.");

      try {
        const params = new URLSearchParams({
          keyword,
          purpose
        });
        const response = await fetch(`/api/cctv?${params.toString()}`, {
          signal: controller.signal
        });

        if (!response.ok) {
          throw new Error("공공데이터 응답 오류");
        }

        const data = await response.json();
        const items = data.items as CctvLocation[];

        setLocations(items);
        setSelected(items[0] ?? null);
        setDataMessage(
          items.length >= data.maxResults
            ? "검색결과를 최대 500개까지 표시합니다."
            : "검색결과입니다."
        );
      } catch (error) {
        if (controller.signal.aborted) return;
        setLocations(cctvLocations);
        setSelected(cctvLocations[0]);
        setDataMessage("검색결과를 불러오지 못해 예시 데이터를 표시합니다.");
      } finally {
        if (!controller.signal.aborted) {
          setIsDataLoading(false);
        }
      }
    }, 250);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [keyword, purpose]);

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setKeyword(keywordInput.trim());
  };

  useEffect(() => {
    if (!isMapReady || !mapRef.current || !window.kakao) return;

    const center = new window.kakao.maps.LatLng(SEOUL_CITY_HALL.lat, SEOUL_CITY_HALL.lng);
    kakaoMapRef.current = new window.kakao.maps.Map(mapRef.current, {
      center,
      level: 5
    });
  }, [isMapReady]);

  useEffect(() => {
    if (!isMapReady || !kakaoMapRef.current || !window.kakao) return;

    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];

    const bounds = new window.kakao.maps.LatLngBounds();

    filteredLocations.forEach((item) => {
      const position = new window.kakao.maps.LatLng(item.lat, item.lng);
      const marker = new window.kakao.maps.Marker({
        map: kakaoMapRef.current,
        position,
        title: item.name,
        zIndex: 1
      });

      window.kakao.maps.event.addListener(marker, "click", () => {
        marker.setZIndex(20);
        setSelected(item);
        kakaoMapRef.current.panTo(position);
        openInfoWindow(item, position);
      });

      markersRef.current.push(marker);
      bounds.extend(position);
    });

    if (filteredLocations.length > 0 && keyword) {
      kakaoMapRef.current.setBounds(bounds);
    }
  }, [filteredLocations, isMapReady, keyword]);

  const handleSelect = (item: CctvLocation) => {
    setSelected(item);

    if (!kakaoMapRef.current || !window.kakao) return;

    const position = new window.kakao.maps.LatLng(item.lat, item.lng);
    kakaoMapRef.current.panTo(position);
    kakaoMapRef.current.setLevel(4);
    openInfoWindow(item, position);
  };

  return (
    <main className="page">
      <section className="sidebar" aria-label="CCTV 검색 패널">
        <div className="brand">
          <div className="brandIcon">
            <Cctv size={24} aria-hidden="true" />
          </div>
          <div>
            <p className="eyebrow">공공데이터 기반</p>
            <h1>전국 CCTV 지도</h1>
          </div>
        </div>

        <form className="controls" onSubmit={handleSearch}>
          <label className="searchBox">
            <Search size={18} aria-hidden="true" />
            <input
              value={keywordInput}
              onChange={(event) => setKeywordInput(event.target.value)}
              placeholder="예: 서울시청, 역삼동, 해운대구"
            />
            <button className="searchButton" disabled={isDataLoading} type="submit">
              {isDataLoading ? <Loader2 size={17} aria-hidden="true" /> : "검색"}
            </button>
          </label>

          <div className="filterBlock">
            <div className="filterTitle">
              <Filter size={17} aria-hidden="true" />
              <span>목적 필터</span>
            </div>
            <div className="purposeGrid">
              {purposes.map((item) => (
                <button
                  className={purpose === item ? "active" : ""}
                  key={item}
                  onClick={() => setPurpose(item)}
                  type="button"
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        </form>

        <aside className="adSlot adSlotSidebar" aria-label="광고 영역">
          광고 영역
        </aside>

        <div className="resultHeader">
          <strong>검색결과 {filteredLocations.length.toLocaleString()}개</strong>
          <span>{isDataLoading ? "불러오는 중" : "실시간 영상 제외"}</span>
        </div>

        <p className="dataMessage">{dataMessage}</p>

        <div className="list">
          {filteredLocations.length === 0 && !isDataLoading && (
            <div className="emptyState">검색결과가 없습니다. 지역명이나 도로명을 바꿔서 검색해보세요.</div>
          )}
          {filteredLocations.map((item) => (
            <button
              className={`listItem ${selected?.id === item.id ? "selected" : ""}`}
              key={item.id}
              onClick={() => handleSelect(item)}
              type="button"
            >
              <span className="itemTop">
                <strong>{item.name}</strong>
                <em>{item.purpose}</em>
              </span>
              <small>{item.direction || "촬영방면정보 없음"}</small>
            </button>
          ))}
        </div>
      </section>

      <section className="mapArea" aria-label="지도 영역">
        <div ref={mapRef} className="mapCanvas" />
        {mapError && (
          <div className="mapNotice">
            <MapPin size={24} aria-hidden="true" />
            <strong>지도 설정이 필요합니다</strong>
            <p>{mapError}</p>
          </div>
        )}

        {selected && (
          <aside className="detailPanel" aria-label="선택한 CCTV 상세정보">
            <div>
              <p className="eyebrow">{selected.manager}</p>
              <h2>{selected.name}</h2>
            </div>
            <dl>
              <div>
                <dt>주소</dt>
                <dd>{selected.address}</dd>
              </div>
              <div>
                <dt>설치목적</dt>
                <dd>{selected.purpose}</dd>
              </div>
              <div>
                <dt>촬영방면정보</dt>
                <dd>{selected.direction || "정보 없음"}</dd>
              </div>
              <div>
                <dt>카메라 수</dt>
                <dd>{selected.cameraCount}대</dd>
              </div>
            </dl>
            {selected.managementNumber && (
              <Link className="detailLink" href={`/cctv/${encodeURIComponent(selected.slug ?? selected.managementNumber)}`}>
                자세히 보기
              </Link>
            )}
          </aside>
        )}
      </section>
    </main>
  );
}
