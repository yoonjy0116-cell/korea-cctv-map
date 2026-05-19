"use client";

import { Fragment, FormEvent, TouchEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp, Cctv, Filter, Loader2, LocateFixed, MapPin, Search } from "lucide-react";
import { cctvLocations, type CctvLocation } from "../data/cctvLocations";
import AdsenseAd from "./components/AdsenseAd";

type KakaoMap = any;
type LoadMode = "nearby" | "search" | "viewport";

declare global {
  interface Window {
    kakao?: any;
  }
}

const SEOUL_CITY_HALL = { lat: 37.5665, lng: 126.978 };
const purposes = ["전체", "방범", "교통", "어린이보호", "시설안전", "기타"] as const;
const ENABLE_TRAFFIC_CCTV = process.env.NEXT_PUBLIC_ENABLE_TRAFFIC_CCTV === "true";
const MIN_VISIBLE_MAP_LEVEL = 8;
const KAKAO_MAP_SCRIPT_ID = "kakao-map-sdk";

function getMapStartFromUrl() {
  if (typeof window === "undefined") return null;

  const params = new URLSearchParams(window.location.search);
  const lat = Number(params.get("lat"));
  const lng = Number(params.get("lng"));
  const place = params.get("place")?.trim();

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  return {
    lat,
    lng,
    place: place || "선택한 CCTV 주변"
  };
}

function escapeHtml(value = "") {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getSearchMapLevel(query: string) {
  if (/(특별시|광역시|특별자치시|도)$/.test(query)) return 8;
  if (/(시|군|구)$/.test(query)) return 6;
  if (/(읍|면|동|가|리)$/.test(query)) return 4;
  return 4;
}

export default function Home() {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const kakaoMapRef = useRef<KakaoMap | null>(null);
  const markersRef = useRef<any[]>([]);
  const infoWindowRef = useRef<any | null>(null);
  const panelTouchStartY = useRef<number | null>(null);
  const requestIdRef = useRef(0);
  const firstDataLoadRef = useRef(true);
  const [locations, setLocations] = useState<CctvLocation[]>(cctvLocations);
  const [keywordInput, setKeywordInput] = useState("");
  const [purpose, setPurpose] = useState<(typeof purposes)[number]>("전체");
  const [selected, setSelected] = useState<CctvLocation | null>(null);
  const [loadMode, setLoadMode] = useState<LoadMode>("nearby");
  const [isMapReady, setIsMapReady] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [dataMessage, setDataMessage] = useState("지도가 먼저 표시된 뒤 현재 화면 기준 CCTV를 불러옵니다.");
  const [mapError, setMapError] = useState("");
  const [locationLabel, setLocationLabel] = useState("서울시청 주변");
  const [isPanelExpanded, setIsPanelExpanded] = useState(false);
  const [mapVersion, setMapVersion] = useState(0);
  const searchPlaceholder = "강남구, 해운대구";

  const filteredLocations = useMemo(() => locations, [locations]);

  const relayoutMap = useCallback((center?: any) => {
    if (!kakaoMapRef.current || !window.kakao) return;

    window.requestAnimationFrame(() => {
      if (!kakaoMapRef.current || !window.kakao) return;
      kakaoMapRef.current.relayout();
      if (center) kakaoMapRef.current.setCenter(center);
    });
  }, []);

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
    let isMounted = true;

    const markMapReady = () => {
      if (!window.kakao?.maps) return;

      const finish = () => {
        if (!isMounted) return;
        setMapError("");
        setIsMapReady(true);
      };

      if (typeof window.kakao.maps.load === "function") {
        window.kakao.maps.load(finish);
        return;
      }

      finish();
    };

    if (!appKey) {
      setMapError(".env.local 파일에 Kakao JavaScript 키를 입력하면 지도가 표시됩니다.");
      return () => {
        isMounted = false;
      };
    }

    if (window.kakao?.maps) {
      markMapReady();
      return () => {
        isMounted = false;
      };
    }

    const existingScript = document.getElementById(KAKAO_MAP_SCRIPT_ID) as HTMLScriptElement | null;
    const script = existingScript ?? document.createElement("script");
    const handleError = () => {
      if (!isMounted) return;
      setMapError("Kakao Map API를 불러오지 못했습니다. 앱 키와 도메인 설정을 확인하세요.");
    };

    script.addEventListener("load", markMapReady);
    script.addEventListener("error", handleError);

    if (!existingScript) {
      script.id = KAKAO_MAP_SCRIPT_ID;
      script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${appKey}&autoload=false&libraries=services`;
      script.async = true;
      document.head.appendChild(script);
    }

    return () => {
      isMounted = false;
      script.removeEventListener("load", markMapReady);
      script.removeEventListener("error", handleError);
    };
  }, []);

  useEffect(() => {
    if (!isMapReady || !mapRef.current || !window.kakao || kakaoMapRef.current) return;

    const start = getMapStartFromUrl();
    const center = new window.kakao.maps.LatLng(start?.lat ?? SEOUL_CITY_HALL.lat, start?.lng ?? SEOUL_CITY_HALL.lng);
    let resizeObserver: ResizeObserver | null = null;
    let cancelled = false;
    let retryCount = 0;

    const hasVisibleRoadmapTiles = () => {
      if (!mapRef.current) return false;

      return Array.from(mapRef.current.querySelectorAll("img")).some((image) => {
        const rect = image.getBoundingClientRect();
        const src = image.getAttribute("src") ?? "";

        return rect.width > 32 && rect.height > 32 && !src.includes("/white.png");
      });
    };

    const rebuildMap = (nextCenter = center, nextLevel = 4) => {
      if (!mapRef.current || !window.kakao) return;

      markersRef.current.forEach((marker) => marker.setMap(null));
      markersRef.current = [];
      infoWindowRef.current?.close();
      mapRef.current.replaceChildren();

      kakaoMapRef.current = new window.kakao.maps.Map(mapRef.current, {
        center: nextCenter,
        level: nextLevel,
        mapTypeId: window.kakao.maps.MapTypeId.ROADMAP
      });

      window.kakao.maps.event.addListener(kakaoMapRef.current, "click", closeMapInfo);
      setMapVersion((value) => value + 1);

      [0, 80, 250, 700].forEach((delay) => {
        window.setTimeout(() => relayoutMap(kakaoMapRef.current?.getCenter() ?? nextCenter), delay);
      });

      window.setTimeout(() => {
        if (cancelled || !kakaoMapRef.current || hasVisibleRoadmapTiles() || retryCount >= 2) return;
        retryCount += 1;
        rebuildMap(kakaoMapRef.current.getCenter(), kakaoMapRef.current.getLevel());
      }, 1500);
    };

    const createMap = () => {
      if (cancelled || !mapRef.current || !window.kakao || kakaoMapRef.current) return;

      const rect = mapRef.current.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) {
        window.requestAnimationFrame(createMap);
        return;
      }

      resizeObserver = new ResizeObserver(() => relayoutMap(kakaoMapRef.current?.getCenter()));
      resizeObserver.observe(mapRef.current);
      rebuildMap(center, 4);

      if (start) {
        setLoadMode("search");
        setLocationLabel(start.place);
      }
    };

    window.requestAnimationFrame(createMap);

    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
    };
  }, [isMapReady, relayoutMap]);

  useEffect(() => {
    if (!isMapReady || !kakaoMapRef.current || !window.kakao) return;

    let timer: number | null = null;
    let controller: AbortController | null = null;

    const loadVisibleCctvs = () => {
      if (!kakaoMapRef.current || !window.kakao) return;
      if (timer) window.clearTimeout(timer);

      const delay = firstDataLoadRef.current ? 180 : 260;
      firstDataLoadRef.current = false;

      timer = window.setTimeout(async () => {
        const map = kakaoMapRef.current;
        const mapLevel = map.getLevel();
        if (mapLevel >= MIN_VISIBLE_MAP_LEVEL) {
          setIsDataLoading(false);
          setLocations([]);
          setSelected(null);
          infoWindowRef.current?.close();
          setDataMessage("지도가 너무 넓게 축소되어 있습니다. CCTV 위치를 보려면 지도를 조금 확대해 주세요.");
          return;
        }

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
          const shouldLoadTraffic = ENABLE_TRAFFIC_CCTV && (purpose === "전체" || purpose === "교통");
          const [publicResponse, trafficResponse] = await Promise.all([
            fetch(`/api/cctv?${params.toString()}`, { signal: controller.signal }),
            shouldLoadTraffic
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
              ? `현재 지도 기준 CCTV를 최대 ${data.maxResults.toLocaleString()}개까지 표시합니다.`
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
    window.setTimeout(loadVisibleCctvs, 350);

    return () => {
      if (timer) window.clearTimeout(timer);
      controller?.abort();
      if (kakaoMapRef.current && window.kakao) {
        window.kakao.maps.event.removeListener(kakaoMapRef.current, "idle", loadVisibleCctvs);
      }
    };
  }, [isMapReady, loadMode, locationLabel, mapVersion, purpose]);

  const moveToCurrentLocation = (collapsePanel = true) => {
    if (!navigator.geolocation) {
      setLocationLabel("서울시청 주변");
      setLoadMode("nearby");
      if (kakaoMapRef.current && window.kakao) {
        kakaoMapRef.current.setLevel(4);
        const center = new window.kakao.maps.LatLng(SEOUL_CITY_HALL.lat, SEOUL_CITY_HALL.lng);
        kakaoMapRef.current.setCenter(center);
        relayoutMap(center);
      }
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
          const center = new window.kakao.maps.LatLng(nextCenter.lat, nextCenter.lng);
          kakaoMapRef.current.setLevel(5);
          kakaoMapRef.current.setCenter(center);
          relayoutMap(center);
        }

      },
      () => {
        setLoadMode("nearby");
        setLocationLabel("서울시청 주변");
        if (kakaoMapRef.current && window.kakao) {
          const center = new window.kakao.maps.LatLng(SEOUL_CITY_HALL.lat, SEOUL_CITY_HALL.lng);
          kakaoMapRef.current.setLevel(4);
          kakaoMapRef.current.setCenter(center);
          relayoutMap(center);
        }
      },
      { enableHighAccuracy: false, maximumAge: 1000 * 60 * 10, timeout: 4500 }
    );
  };

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    (document.activeElement as HTMLElement | null)?.blur?.();
    const query = keywordInput.trim();

    if (!query) {
      setLoadMode("nearby");
      setLocationLabel("서울시청 주변");
      setKeywordInput("");
      if (kakaoMapRef.current && window.kakao) {
        const center = new window.kakao.maps.LatLng(SEOUL_CITY_HALL.lat, SEOUL_CITY_HALL.lng);
        kakaoMapRef.current.setLevel(4);
        kakaoMapRef.current.setCenter(center);
        relayoutMap(center);
      }
      return;
    }

    if (!window.kakao?.maps?.services || !kakaoMapRef.current) {
      setDataMessage("카카오 지도 검색을 사용할 수 없습니다. 잠시 후 다시 시도해 주세요.");
      return;
    }

    const places = new window.kakao.maps.services.Places();
    const geocoder = new window.kakao.maps.services.Geocoder();
    setIsDataLoading(true);
    setDataMessage(`${query} 위치를 카카오 지도에서 찾는 중입니다.`);

    const moveSearchMap = (lat: number, lng: number, level = getSearchMapLevel(query)) => {
      setLoadMode("search");
      setLocationLabel(query);
      setIsPanelExpanded(false);
      const center = new window.kakao.maps.LatLng(lat, lng);
      kakaoMapRef.current.setLevel(level);
      kakaoMapRef.current.setCenter(center);
      relayoutMap(center);
    };

    const searchByKeyword = () => {
      places.keywordSearch(query, (result: any[], status: string) => {
        if (status !== window.kakao.maps.services.Status.OK || !result[0]) {
          setIsDataLoading(false);
          setDataMessage("검색한 지역을 찾지 못했습니다. 지역명이나 주소를 조금 더 구체적으로 입력해 주세요.");
          return;
        }

        const first = result.find((item) => Number.isFinite(Number(item.y)) && Number.isFinite(Number(item.x)));
        if (!first) {
          setIsDataLoading(false);
          setDataMessage("검색한 지역의 지도 좌표를 찾지 못했습니다.");
          return;
        }

        moveSearchMap(Number(first.y), Number(first.x), getSearchMapLevel(query));
      });
    };

    geocoder.addressSearch(query, (result: any[], status: string) => {
      const first = result?.find((item) => Number.isFinite(Number(item.y)) && Number.isFinite(Number(item.x)));

      if (status === window.kakao.maps.services.Status.OK && first) {
        moveSearchMap(Number(first.y), Number(first.x), getSearchMapLevel(query));
        return;
      }

      searchByKeyword();
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

    let cancelled = false;
    let index = 0;
    const chunkSize = 35;

    const drawChunk = () => {
      if (cancelled || !kakaoMapRef.current || !window.kakao) return;
      const chunk = filteredLocations.slice(index, index + chunkSize);

      chunk.forEach((item) => {
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

      index += chunkSize;
      if (index < filteredLocations.length) {
        window.requestAnimationFrame(drawChunk);
      }
    };

    window.requestAnimationFrame(drawChunk);

    return () => {
      cancelled = true;
    };
  }, [filteredLocations, isMapReady, mapVersion]);

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
        <div className="sidebarTop">
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
        </div>

        <div className="resultsPanel">
          <div className="resultHeader">
            <strong>{loadMode === "search" ? "검색 지도 기준" : "현재 지도 기준"} {filteredLocations.length.toLocaleString()}개</strong>
            <span>{isDataLoading ? "불러오는 중" : "실시간 영상 제외"}</span>
          </div>

          <p className="dataMessage">{dataMessage}</p>

          <div className="list">
            {filteredLocations.length === 0 && !isDataLoading && (
              <div className="emptyState">현재 지도 화면 안에 표시할 CCTV가 없습니다. 지도를 조금 움직이거나 확대해 보세요.</div>
            )}
            {filteredLocations.map((item, index) => (
              <Fragment key={item.id}>
                {index === 4 && (
                  <AdsenseAd className="adSlotList" label="검색결과 광고 영역" />
                )}
                <button
                  className={`listItem ${selected?.id === item.id ? "selected" : ""}`}
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
              </Fragment>
            ))}
          </div>
        </div>
      </section>

      <section className="mapArea" aria-label="지도 영역">
        <div ref={mapRef} className="mapCanvas" />
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
      </section>
    </main>
  );
}
