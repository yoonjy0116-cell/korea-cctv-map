"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Cctv, Filter, MapPin, Search } from "lucide-react";
import { cctvLocations, type CctvLocation } from "@/data/cctvLocations";

type KakaoMap = any;

declare global {
  interface Window {
    kakao?: any;
  }
}

const purposes = ["전체", "방범", "어린이보호", "교통", "시설안전"] as const;

export default function Home() {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const kakaoMapRef = useRef<KakaoMap | null>(null);
  const markersRef = useRef<any[]>([]);
  const [locations, setLocations] = useState<CctvLocation[]>(cctvLocations);
  const [keyword, setKeyword] = useState("");
  const [purpose, setPurpose] = useState<(typeof purposes)[number]>("전체");
  const [selected, setSelected] = useState<CctvLocation | null>(cctvLocations[0]);
  const [isMapReady, setIsMapReady] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [dataMessage, setDataMessage] = useState("공공데이터를 불러오는 중입니다.");
  const [mapError, setMapError] = useState("");

  const filteredLocations = useMemo(() => locations, [locations]);

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
      setDataMessage("공공데이터를 불러오는 중입니다.");

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
            ? `공공데이터 결과를 ${data.maxResults.toLocaleString()}개까지 표시합니다.`
            : "공공데이터를 기준으로 표시 중입니다."
        );
      } catch (error) {
        if (controller.signal.aborted) return;
        setLocations(cctvLocations);
        setSelected(cctvLocations[0]);
        setDataMessage("공공데이터 연결 실패로 예시 데이터를 표시합니다.");
      } finally {
        if (!controller.signal.aborted) {
          setIsDataLoading(false);
        }
      }
    }, 350);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [keyword, purpose]);

  useEffect(() => {
    if (!isMapReady || !mapRef.current || !window.kakao) return;

    const center = new window.kakao.maps.LatLng(36.5, 127.8);
    kakaoMapRef.current = new window.kakao.maps.Map(mapRef.current, {
      center,
      level: 12
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
        title: item.name
      });

      window.kakao.maps.event.addListener(marker, "click", () => {
        setSelected(item);
        kakaoMapRef.current.panTo(position);
      });

      markersRef.current.push(marker);
      bounds.extend(position);
    });

    if (filteredLocations.length > 0) {
      kakaoMapRef.current.setBounds(bounds);
    }
  }, [filteredLocations, isMapReady]);

  const handleSelect = (item: CctvLocation) => {
    setSelected(item);

    if (!kakaoMapRef.current || !window.kakao) return;

    const position = new window.kakao.maps.LatLng(item.lat, item.lng);
    kakaoMapRef.current.panTo(position);
    kakaoMapRef.current.setLevel(4);
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
            <h1>전국 방범용 CCTV 지도</h1>
          </div>
        </div>

        <div className="controls">
          <label className="searchBox">
            <Search size={18} aria-hidden="true" />
            <input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="지역, 주소, CCTV명 검색"
            />
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
        </div>

        <div className="resultHeader">
          <strong>{filteredLocations.length.toLocaleString()}개 위치</strong>
          <span>{isDataLoading ? "불러오는 중" : "실시간 영상 제외"}</span>
        </div>

        <p className="dataMessage">{dataMessage}</p>

        <div className="list">
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
              <span>{item.address}</span>
              <small>
                카메라 {item.cameraCount}대 · {item.manager}
              </small>
              {item.managementNumber && (
                <small>관리번호 {item.managementNumber}</small>
              )}
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
              <p className="eyebrow">{selected.region}</p>
              <h2>{selected.name}</h2>
            </div>
            <dl>
              {selected.managementNumber && (
                <div>
                  <dt>관리번호</dt>
                  <dd>{selected.managementNumber}</dd>
                </div>
              )}
              <div>
                <dt>주소</dt>
                <dd>{selected.address}</dd>
              </div>
              <div>
                <dt>목적</dt>
                <dd>{selected.purpose}</dd>
              </div>
              <div>
                <dt>카메라 수</dt>
                <dd>{selected.cameraCount}대</dd>
              </div>
              <div>
                <dt>관리기관</dt>
                <dd>{selected.manager}</dd>
              </div>
            </dl>
            {selected.managementNumber && (
              <Link className="detailLink" href={`/cctv/${encodeURIComponent(selected.managementNumber)}`}>
                전체 상세정보 보기
              </Link>
            )}
          </aside>
        )}
      </section>
    </main>
  );
}
