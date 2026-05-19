"use client";

import { FormEvent, TouchEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp, Cctv, Filter, Loader2, LocateFixed, MapPin, Search } from "lucide-react";
import { cctvLocations, type CctvLocation } from "../data/cctvLocations";

type KakaoMap = any;
type LoadMode = "nearby" | "search" | "default";

declare global {
  interface Window {
    kakao?: any;
  }
}

const SEOUL_CITY_HALL = { lat: 37.5665, lng: 126.978 };
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
  const panelTouchStartY = useRef<number | null>(null);
  const [locations, setLocations] = useState<CctvLocation[]>(cctvLocations);
  const [keywordInput, setKeywordInput] = useState("");
  const [keyword, setKeyword] = useState("");
  const [purpose, setPurpose] = useState<(typeof purposes)[number]>("전체");
  const [selected, setSelected] = useState<CctvLocation | null>(null);
  const [searchCenter, setSearchCenter] = useState(SEOUL_CITY_HALL);
  const [loadMode, setLoadMode] = useState<LoadMode>("nearby");
  const [isMapReady, setIsMapReady] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [dataMessage, setDataMessage] = useState("내 위치 주변 CCTV를 확인하는 중입니다.");
  const [mapError, setMapError] = useState("");
  const [locationLabel, setLocationLabel] = useState("서울시청 주변");
  const [isPanelExpanded, setIsPanelExpanded] = useState(false);
  const [searchPlaceholder, setSearchPlaceholder] = useState("서울시청, 해운대구");

  const filteredLocations = useMemo(() => locations, [locations]);

  const closeMapInfo = () => {
    infoWindowRef.current?.close();
    setSelected(null);
  };

  const openInfoWindow = (item: CctvLocation, position: any) => {
    if (!kakaoMapRef.current || !window.kakao) return;

    const detailUrl = item.slug ? `/cctv/${encodeURIComponent(item.slug)}` : "/";
    const content = `
      <div class="markerInfo">
        <strong>${escapeHtml(item.name)}</strong>
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
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${appKey}&autoload=false&libraries=services`;
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
    if (!isMapReady || !mapRef.current || !window.kakao) return;

    const center = new window.kakao.maps.LatLng(SEOUL_CITY_HALL.lat, SEOUL_CITY_HALL.lng);
    kakaoMapRef.current = new window.kakao.maps.Map(mapRef.current, {
      center,
      level: 5
    });

    window.kakao.maps.event.addListener(kakaoMapRef.current, "click", closeMapInfo);
  }, [isMapReady]);

  useEffect(() => {
    if (!navigator.geolocation) {
      setSearchCenter(SEOUL_CITY_HALL);
      setLocationLabel("서울시청 주변");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextCenter = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        setSearchCenter(nextCenter);
        setLocationLabel("내 위치 주변");

        if (kakaoMapRef.current && window.kakao) {
          kakaoMapRef.current.setCenter(new window.kakao.maps.LatLng(nextCenter.lat, nextCenter.lng));
          kakaoMapRef.current.setLevel(5);
        }

        const geocoder = window.kakao?.maps?.services
          ? new window.kakao.maps.services.Geocoder()
          : null;

        geocoder?.coord2RegionCode(nextCenter.lng, nextCenter.lat, (result: any[], status: string) => {
          if (status !== window.kakao.maps.services.Status.OK) return;
          const town = result.find((item) => item.region_type === "H")?.region_3depth_name;
          if (town) {
            setSearchPlaceholder(`${town}, 서울시청, 해운대구`);
          }
        });
      },
      () => {
        setSearchCenter(SEOUL_CITY_HALL);
        setLocationLabel("서울시청 주변");
      },
      { enableHighAccuracy: false, maximumAge: 1000 * 60 * 10, timeout: 4500 }
    );
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setIsDataLoading(true);
      setDataMessage(keyword ? "검색결과를 불러오는 중입니다." : `${locationLabel} CCTV를 불러오는 중입니다.`);

      try {
        const params = new URLSearchParams({ purpose });

        if (keyword) {
          params.set("keyword", keyword);
        } else {
          params.set("lat", String(searchCenter.lat));
          params.set("lng", String(searchCenter.lng));
        }

        const response = await fetch(`/api/cctv?${params.toString()}`, {
          signal: controller.signal
        });

        if (!response.ok) {
          throw new Error("공공데이터 응답 오류");
        }

        const data = await response.json();
        const items = data.items as CctvLocation[];
        const nextMode = (data.mode ?? "default") as LoadMode;

        setLocations(items);
        setSelected(null);
        setLoadMode(nextMode);
        infoWindowRef.current?.close();
        setDataMessage(
          nextMode === "nearby"
            ? `${locationLabel}에서 가까운 CCTV ${items.length.toLocaleString()}개를 표시합니다.`
            : items.length >= data.maxResults
              ? "검색결과를 최대 500개까지 표시합니다."
              : "검색결과입니다."
        );
      } catch (error) {
        if (controller.signal.aborted) return;
        setLocations(cctvLocations);
        setSelected(null);
        setDataMessage("공공데이터를 불러오지 못해 예시 데이터를 표시합니다.");
      } finally {
        if (!controller.signal.aborted) {
          setIsDataLoading(false);
        }
      }
    }, keyword ? 180 : 0);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [keyword, locationLabel, purpose, searchCenter]);

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setKeyword(keywordInput.trim());
    setIsPanelExpanded(false);
  };

  const handleNearby = () => {
    setKeyword("");
    setKeywordInput("");
    setLoadMode("nearby");
    setIsPanelExpanded(false);

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const nextCenter = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setSearchCenter(nextCenter);
          setLocationLabel("내 위치 주변");
        },
        () => {
          setSearchCenter(SEOUL_CITY_HALL);
          setLocationLabel("서울시청 주변");
        },
        { enableHighAccuracy: false, maximumAge: 1000 * 60 * 10, timeout: 4500 }
      );
    }
  };

  const handlePanelTouchStart = (event: TouchEvent<HTMLButtonElement>) => {
    panelTouchStartY.current = event.touches[0]?.clientY ?? null;
  };

  const handlePanelTouchEnd = (event: TouchEvent<HTMLButtonElement>) => {
    const startY = panelTouchStartY.current;
    const endY = event.changedTouches[0]?.clientY ?? null;
    panelTouchStartY.current = null;

    if (startY === null || endY === null) return;
    if (startY - endY > 24) setIsPanelExpanded(true);
    if (endY - startY > 24) setIsPanelExpanded(false);
  };

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

    if (filteredLocations.length > 0) {
      if (loadMode === "search" && keyword) {
        kakaoMapRef.current.setBounds(bounds);
        window.setTimeout(() => {
          if (kakaoMapRef.current.getLevel() > 5) {
            kakaoMapRef.current.setLevel(5);
          }
        }, 0);
      } else {
        kakaoMapRef.current.setCenter(new window.kakao.maps.LatLng(searchCenter.lat, searchCenter.lng));
        kakaoMapRef.current.setLevel(5);
      }
    }
  }, [filteredLocations, isMapReady, keyword, loadMode, searchCenter]);

  const handleSelect = (item: CctvLocation) => {
    setSelected(item);

    if (!kakaoMapRef.current || !window.kakao) return;

    const position = new window.kakao.maps.LatLng(item.lat, item.lng);
    kakaoMapRef.current.setLevel(4);
    kakaoMapRef.current.setCenter(position);
    openInfoWindow(item, position);
  };

  return (
    <main className="page">
      <section className={`sidebar ${isPanelExpanded ? "expanded" : "collapsed"}`} aria-label="CCTV 검색 패널">
        <button
          className="mobilePanelHandle"
          onClick={() => setIsPanelExpanded((value) => !value)}
          onTouchEnd={handlePanelTouchEnd}
          onTouchStart={handlePanelTouchStart}
          type="button"
        >
          <span />
          {isPanelExpanded ? <ChevronDown size={18} aria-hidden="true" /> : <ChevronUp size={18} aria-hidden="true" />}
          <strong>{isPanelExpanded ? "검색창 내리기" : "검색창 올리기"}</strong>
        </button>

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
              onFocus={() => setIsPanelExpanded(true)}
              value={keywordInput}
              onChange={(event) => setKeywordInput(event.target.value)}
              placeholder={`예: ${searchPlaceholder}`}
            />
            <button className="searchButton" disabled={isDataLoading} type="submit">
              {isDataLoading ? <Loader2 size={17} aria-hidden="true" /> : "검색"}
            </button>
          </label>

          <button className="searchButton nearbyButton" onClick={handleNearby} type="button">
            <LocateFixed size={16} aria-hidden="true" /> 주변 CCTV
          </button>

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
          <strong>{loadMode === "nearby" && !keyword ? "주변 CCTV" : "검색결과"} {filteredLocations.length.toLocaleString()}개</strong>
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
              {typeof item.distance === "number" && <small>현재 위치에서 약 {(item.distance / 1000).toFixed(1)}km</small>}
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
                <dt>설치목적</dt>
                <dd>{selected.purpose}</dd>
              </div>
              <div>
                <dt>촬영방면정보</dt>
                <dd>{selected.direction || "정보 없음"}</dd>
              </div>
              <div>
                <dt>카메라대수</dt>
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
