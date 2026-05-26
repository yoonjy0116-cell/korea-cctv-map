"use client";

import { FormEvent, TouchEvent, WheelEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight, ChevronUp, Cctv, Filter, Loader2, LocateFixed, MapPin, PanelRightOpen, Search, X } from "lucide-react";
import { cctvLocations, type CctvLocation } from "../data/cctvLocations";
import AdsenseAd from "./components/AdsenseAd";
import PolicyLinks from "./components/PolicyLinks";

type KakaoMap = any;
type LoadMode = "nearby" | "search" | "viewport";
type RegionNode = {
  name: string;
  area: string;
  path: string[];
  count: number;
  children: RegionNode[];
};

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
  const requestIdRef = useRef(0);
  const [locations, setLocations] = useState<CctvLocation[]>(cctvLocations);
  const [keywordInput, setKeywordInput] = useState("");
  const [purpose, setPurpose] = useState<(typeof purposes)[number]>("전체");
  const [selected, setSelected] = useState<CctvLocation | null>(null);
  const [loadMode, setLoadMode] = useState<LoadMode>("nearby");
  const [isMapReady, setIsMapReady] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [dataMessage, setDataMessage] = useState("현재 지도 기준 CCTV를 불러오는 중입니다.");
  const [mapError, setMapError] = useState("");
  const [locationLabel, setLocationLabel] = useState("서울시청 주변");
  const [isPanelExpanded, setIsPanelExpanded] = useState(false);
  const [isRegionDrawerOpen, setIsRegionDrawerOpen] = useState(false);
  const [regionTree, setRegionTree] = useState<RegionNode[]>([]);
  const [isRegionTreeLoading, setIsRegionTreeLoading] = useState(false);
  const [regionTreeError, setRegionTreeError] = useState("");
  const [openRegionAreas, setOpenRegionAreas] = useState<Record<string, boolean>>({});

  const filteredLocations = useMemo(() => locations, [locations]);

  useEffect(() => {
    if (!isRegionDrawerOpen || regionTree.length > 0 || isRegionTreeLoading) return;

    setIsRegionTreeLoading(true);
    setRegionTreeError("");

    fetch("/api/regions")
      .then((response) => {
        if (!response.ok) throw new Error("지역 데이터를 불러오지 못했습니다.");
        return response.json();
      })
      .then((data) => {
        setRegionTree(data.items ?? []);
      })
      .catch(() => {
        setRegionTreeError("지역 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
      })
      .finally(() => {
        setIsRegionTreeLoading(false);
      });
  }, [isRegionDrawerOpen, isRegionTreeLoading, regionTree.length]);

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
        ${item.externalUrl ? `<a href="${escapeHtml(item.externalUrl)}" target="_blank" rel="noreferrer">실시간 확인</a>` : ""}
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
    if (!isMapReady || !mapRef.current || !window.kakao || kakaoMapRef.current) return;

    const center = new window.kakao.maps.LatLng(SEOUL_CITY_HALL.lat, SEOUL_CITY_HALL.lng);
    kakaoMapRef.current = new window.kakao.maps.Map(mapRef.current, {
      center,
      level: 5
    });

    window.kakao.maps.event.addListener(kakaoMapRef.current, "click", closeMapInfo);
  }, [isMapReady]);

  useEffect(() => {
    if (!isMapReady || !kakaoMapRef.current || !window.kakao) return;

    let timer: number | null = null;
    let controller: AbortController | null = null;

    const loadVisibleCctvs = () => {
      if (!kakaoMapRef.current || !window.kakao) return;
      if (timer) window.clearTimeout(timer);

      timer = window.setTimeout(async () => {
        const map = kakaoMapRef.current;
        const bounds = map.getBounds();
        const sw = bounds.getSouthWest();
        const ne = bounds.getNorthEast();
        const center = map.getCenter();
        const requestId = requestIdRef.current + 1;
        requestIdRef.current = requestId;
        controller?.abort();
        controller = new AbortController();

        setIsDataLoading(true);
        setDataMessage(
          loadMode === "search"
            ? `${locationLabel} 지도 기준 CCTV를 불러오는 중입니다.`
            : "현재 지도 화면 기준 CCTV를 불러오는 중입니다."
        );

        try {
          const params = new URLSearchParams({
            purpose,
            lat: String(center.getLat()),
            lng: String(center.getLng()),
            swLat: String(sw.getLat()),
            swLng: String(sw.getLng()),
            neLat: String(ne.getLat()),
            neLng: String(ne.getLng())
          });
          const [publicResponse, trafficResponse] = await Promise.all([
            fetch(`/api/cctv?${params.toString()}`, { signal: controller.signal }),
            purpose === "전체" || purpose === "교통"
              ? fetch(`/api/traffic-cctv?${params.toString()}`, { signal: controller.signal })
              : Promise.resolve(null)
          ]);

          if (!publicResponse.ok) throw new Error("공공데이터 응답 오류");

          const data = await publicResponse.json();
          const trafficData = trafficResponse?.ok ? await trafficResponse.json() : null;
          if (requestId !== requestIdRef.current) return;

          const publicItems = data.items as CctvLocation[];
          const trafficItems = (trafficData?.items ?? []) as CctvLocation[];
          const seen = new Set<string>();
          const items = [...publicItems, ...trafficItems]
            .filter((item) => {
              const key = `${item.name}-${item.lat.toFixed(5)}-${item.lng.toFixed(5)}`;
              if (seen.has(key)) return false;
              seen.add(key);
              return true;
            })
            .slice(0, data.maxResults);
          setLocations(items);
          setSelected(null);
          infoWindowRef.current?.close();
          setDataMessage(
            items.length >= data.maxResults
              ? `현재 지도 기준 CCTV를 최대 ${Number(data.maxResults).toLocaleString()}개까지 표시합니다.`
              : trafficData?.configured === false && (purpose === "전체" || purpose === "교통")
                ? `현재 지도 기준 CCTV ${items.length.toLocaleString()}개를 표시합니다. ITS 키를 넣으면 교통 CCTV URL도 함께 표시됩니다.`
                : `현재 지도 기준 CCTV ${items.length.toLocaleString()}개를 표시합니다.`
          );
        } catch (error) {
          if (controller?.signal.aborted) return;
          setLocations(cctvLocations);
          setSelected(null);
          setDataMessage("공공데이터를 불러오지 못해 예시 데이터를 표시합니다.");
        } finally {
          if (!controller?.signal.aborted) {
            setIsDataLoading(false);
          }
        }
      }, 220);
    };

    window.kakao.maps.event.addListener(kakaoMapRef.current, "idle", loadVisibleCctvs);
    loadVisibleCctvs();

    return () => {
      if (timer) window.clearTimeout(timer);
      controller?.abort();
      if (kakaoMapRef.current && window.kakao) {
        window.kakao.maps.event.removeListener(kakaoMapRef.current, "idle", loadVisibleCctvs);
      }
    };
  }, [isMapReady, loadMode, locationLabel, purpose]);

  const moveToCurrentLocation = (collapsePanel = true) => {
    if (!navigator.geolocation) {
      setLocationLabel("서울시청 주변");
      setLoadMode("nearby");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextCenter = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        setLoadMode("nearby");
        setLocationLabel("내 위치 주변");
        setKeywordInput("");
        if (collapsePanel) setIsPanelExpanded(false);

        if (kakaoMapRef.current && window.kakao) {
          kakaoMapRef.current.setLevel(5);
          kakaoMapRef.current.setCenter(new window.kakao.maps.LatLng(nextCenter.lat, nextCenter.lng));
        }

      },
      () => {
        setLoadMode("nearby");
        setLocationLabel("서울시청 주변");
        if (kakaoMapRef.current && window.kakao) {
          kakaoMapRef.current.setLevel(5);
          kakaoMapRef.current.setCenter(new window.kakao.maps.LatLng(SEOUL_CITY_HALL.lat, SEOUL_CITY_HALL.lng));
        }
      },
      { enableHighAccuracy: false, maximumAge: 1000 * 60 * 10, timeout: 4500 }
    );
  };

  const moveToSeoulCityHall = () => {
    setLoadMode("nearby");
    setLocationLabel("서울시청 주변");
    setKeywordInput("");
    setIsPanelExpanded(false);

    if (kakaoMapRef.current && window.kakao) {
      kakaoMapRef.current.setLevel(5);
      kakaoMapRef.current.setCenter(new window.kakao.maps.LatLng(SEOUL_CITY_HALL.lat, SEOUL_CITY_HALL.lng));
    }
  };

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = keywordInput.trim();

    if (!query) {
      moveToSeoulCityHall();
      return;
    }

    if (!window.kakao?.maps?.services || !kakaoMapRef.current) {
      setDataMessage("카카오 지도 검색을 사용할 수 없습니다. 잠시 후 다시 시도해 주세요.");
      return;
    }

    const places = new window.kakao.maps.services.Places();
    setIsDataLoading(true);
    setDataMessage(`${query} 위치를 카카오 지도에서 찾는 중입니다.`);

    places.keywordSearch(query, (result: any[], status: string) => {
      if (status !== window.kakao.maps.services.Status.OK || !result[0]) {
        setIsDataLoading(false);
        setDataMessage("검색한 지역을 찾지 못했습니다. 동 이름이나 주소를 조금 더 구체적으로 입력해 주세요.");
        return;
      }

      const first = result[0];
      const lat = Number(first.y);
      const lng = Number(first.x);
      setLoadMode("search");
      setLocationLabel(query);
      setIsPanelExpanded(false);
      kakaoMapRef.current.setLevel(5);
      kakaoMapRef.current.setCenter(new window.kakao.maps.LatLng(lat, lng));
    });
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
        openInfoWindow(item, position);
      });

      markersRef.current.push(marker);
    });
  }, [filteredLocations, isMapReady]);

  const handleSelect = (item: CctvLocation) => {
    setSelected(item);

    if (!kakaoMapRef.current || !window.kakao) return;

    const position = new window.kakao.maps.LatLng(item.lat, item.lng);
    kakaoMapRef.current.setLevel(4);
    kakaoMapRef.current.setCenter(position);
    openInfoWindow(item, position);
  };

  const stopPanelWheel = (event: WheelEvent<HTMLElement>) => {
    const target = event.target as HTMLElement;
    const list = target.closest(".list") as HTMLElement | null;

    if (list && list.scrollHeight > list.clientHeight) {
      event.preventDefault();
      event.stopPropagation();
      list.scrollTop += event.deltaY;
      return;
    }

    event.preventDefault();
    event.stopPropagation();
  };

  const regionPathHref = (parts: string[]) => `/region/${parts.map(encodeURIComponent).join("/")}`;

  const toggleRegionArea = (area: string) => {
    setOpenRegionAreas((current) => ({
      ...current,
      [area]: !current[area]
    }));
  };

  const renderRegionNode = (node: RegionNode, depth = 0) => {
    const hasChildren = node.children.length > 0;
    const title = `${node.area} CCTV`;
    const isOpen = Boolean(openRegionAreas[node.area]);

    if (!hasChildren) {
      return (
        <li className={`regionTreeItem depth${depth}`} key={node.area}>
          <Link href={regionPathHref(node.path)} onClick={() => setIsRegionDrawerOpen(false)}>
            {title}
            <span>{node.count.toLocaleString()}개</span>
          </Link>
        </li>
      );
    }

    return (
      <li className={`regionTreeItem depth${depth}`} key={node.area}>
        <div className="regionTreeRow">
          <button
            aria-expanded={isOpen}
            aria-label={`${title} 하위 지역 ${isOpen ? "닫기" : "열기"}`}
            onClick={() => toggleRegionArea(node.area)}
            type="button"
          >
            <ChevronRight size={15} aria-hidden="true" />
          </button>
          <Link href={regionPathHref(node.path)} onClick={() => setIsRegionDrawerOpen(false)}>
            {title}
          </Link>
          <span>{node.count.toLocaleString()}개</span>
        </div>
        {isOpen && <ul>{node.children.map((child) => renderRegionNode(child, depth + 1))}</ul>}
      </li>
    );
  };

  return (
    <main className="page">
      <section
        className={`sidebar ${isPanelExpanded ? "expanded" : "collapsed"}`}
        aria-label="CCTV 검색 패널"
        onWheelCapture={stopPanelWheel}
      >
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
              placeholder="CCTV 설치 지역 검색"
            />
            <button className="searchButton" disabled={isDataLoading} type="submit">
              {isDataLoading ? <Loader2 size={17} aria-hidden="true" /> : "검색"}
            </button>
          </label>

          <button className="searchButton nearbyButton" onClick={() => moveToCurrentLocation()} type="button">
            <LocateFixed size={16} aria-hidden="true" /> 현위치 보기
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

        <AdsenseAd className="adSlotSidebar" label="검색 패널 광고 영역" />

        <div className="resultHeader">
          <strong>{loadMode === "search" ? "검색 지도 기준" : "현재 지도 기준"} {filteredLocations.length.toLocaleString()}개</strong>
          <span>{isDataLoading ? "불러오는 중" : "실시간 영상 제외"}</span>
        </div>

        <p className="dataMessage">{dataMessage}</p>

        <div className="list">
          {filteredLocations.length === 0 && !isDataLoading && (
            <div className="emptyState">현재 지도 화면 안에 표시할 CCTV가 없습니다. 지도를 조금 움직이거나 확대해 보세요.</div>
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
              {item.source && <small>출처: {item.source}</small>}
              {typeof item.distance === "number" && <small>지도 중심에서 약 {(item.distance / 1000).toFixed(1)}km</small>}
              {item.externalUrl && (
                <a className="inlineExternalLink" href={item.externalUrl} onClick={(event) => event.stopPropagation()} target="_blank" rel="noreferrer">
                  실시간 확인 URL
                </a>
              )}
            </button>
          ))}
        </div>

        <PolicyLinks compact />
      </section>

      <section className="mapArea" aria-label="지도 영역">
        <div ref={mapRef} className="mapCanvas" />
        <button className="regionDrawerButton" onClick={() => setIsRegionDrawerOpen(true)} type="button">
          <PanelRightOpen size={17} aria-hidden="true" />
          전국 지역
        </button>
        <button className="mapLocateButton" onClick={() => moveToCurrentLocation()} type="button">
          <LocateFixed size={17} aria-hidden="true" />
          현위치
        </button>
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
              {selected.source && (
                <div>
                  <dt>출처</dt>
                  <dd>{selected.source}</dd>
                </div>
              )}
            </dl>
            {selected.managementNumber && (
              <Link className="detailLink" href={`/cctv/${encodeURIComponent(selected.slug ?? selected.managementNumber)}`}>
                자세히 보기
              </Link>
            )}
            {selected.externalUrl && (
              <a className="detailLink detailExternalLink" href={selected.externalUrl} target="_blank" rel="noreferrer">
                실시간 확인 URL
              </a>
            )}
          </aside>
        )}

        {isRegionDrawerOpen && (
          <aside className="regionDrawer" aria-label="전국 지역별 CCTV 탐색">
            <div className="regionDrawerHeader">
              <div>
                <p className="eyebrow">전국 지역별 CCTV</p>
                <h2>지역 탐색</h2>
              </div>
              <button onClick={() => setIsRegionDrawerOpen(false)} type="button" aria-label="지역 탐색 닫기">
                <X size={18} aria-hidden="true" />
              </button>
            </div>
            <p className="regionDrawerIntro">
              시도, 시군구, 읍면동 순서로 펼쳐서 지역별 CCTV 위치 페이지로 이동할 수 있습니다.
            </p>
            {isRegionTreeLoading && <p className="regionDrawerState">지역 목록을 불러오는 중입니다.</p>}
            {regionTreeError && <p className="regionDrawerState">{regionTreeError}</p>}
            {!isRegionTreeLoading && !regionTreeError && (
              <ul className="regionTree">
                {regionTree.map((node) => renderRegionNode(node))}
              </ul>
            )}
          </aside>
        )}
      </section>
    </main>
  );
}
