"use client"

import { useEffect, useRef, useState } from 'react';
import PostGuess from './post-guess';
import SortButtons, { type SortType } from './common/sort-buttons';
import NewGuess from './new-guess';
import type { PostGuessMapDataType, PostGuessMapPointType, PostGuessType } from '@/types/post-guess';
import { MapPinIcon, XIcon } from './icons';
import { getPostGuessMapPoints } from '@/lib/posts';

declare global {
  interface Window {
    mapboxgl: any;
  }
}

type PostGuessListProps = {
  guesses: PostGuessType[];
  isAuthor?: boolean;
  postId: number;
  guessCount: number;
  canGuess?: boolean;
  postImage?: string;
  postTitle?: string;
  onGuessSubmitted?: (guess: PostGuessType) => void;
};

export default function PostGuessList({
  guesses,
  isAuthor,
  postId,
  guessCount,
  canGuess,
  postImage,
  postTitle,
  onGuessSubmitted,
}: PostGuessListProps) {
  const actionButtonClass = 'inline-flex items-center gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors';
  const showToolbar = guessCount > 0 || Boolean(isAuthor) || Boolean(canGuess);
  const [sortType, setSortType] = useState<SortType>("date");
  const [showMap, setShowMap] = useState(false);
  const [showGuessModal, setShowGuessModal] = useState(false);
  const [loadingMapPoints, setLoadingMapPoints] = useState(false);
  const [mapPointsError, setMapPointsError] = useState<string | null>(null);
  const [mapData, setMapData] = useState<PostGuessMapDataType | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const activePopupRef = useRef<any>(null);

  const sortedGuesses = [...guesses].sort((a, b) => {
    if (sortType === "date") {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    } else {
      const distanceA = a.distance ?? Infinity;
      const distanceB = b.distance ?? Infinity;
      return distanceA - distanceB;
    }
  });

  useEffect(() => {
    if (!showMap) return;
    if (!mapData || (mapData.guessPoints.length === 0 && !mapData.photoCoordinates)) return;

    if (!document.querySelector('link[href*="mapbox-gl.css"]')) {
      const link = document.createElement('link');
      link.href = 'https://api.mapbox.com/mapbox-gl-js/v3.19.0/mapbox-gl.css';
      link.rel = 'stylesheet';
      document.head.appendChild(link);
    }

    const initMap = () => {
      if (!mapRef.current || mapInstanceRef.current || !window.mapboxgl) return;

      window.mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

      const photoLng = Number(mapData?.photoCoordinates?.longitude);
      const photoLat = Number(mapData?.photoCoordinates?.latitude);
      const initialCenter: [number, number] =
        isFinite(photoLng) && isFinite(photoLat)
          ? [photoLng, photoLat]
          : [44.8271, 41.7151];

      const map = new window.mapboxgl.Map({
        container: mapRef.current,
        style: 'mapbox://styles/mapbox/standard-satellite',
        center: initialCenter,
        zoom: 8,
        renderWorldCopies: false,
        maxBounds: [[39.4, 40.8], [46.9, 43.8]],
        maxZoom: 18,
      });

      const bounds = new window.mapboxgl.LngLatBounds();
      const markerList: any[] = [];

      // Add photo location marker (red)
      if (mapData.photoCoordinates) {
        const photoLng = Number(mapData.photoCoordinates.longitude);
        const photoLat = Number(mapData.photoCoordinates.latitude);
        if (isFinite(photoLng) && isFinite(photoLat)) {
          const photoPopupBody = document.createElement('div');
          photoPopupBody.style.fontSize = '14px';
          photoPopupBody.style.lineHeight = '1.3';
          photoPopupBody.style.padding = '4px 6px';
          photoPopupBody.style.background = '#ffffff';
          photoPopupBody.style.color = '#18181b';
          photoPopupBody.style.borderRadius = '6px';

          const photoLabel = document.createElement('strong');
          photoLabel.textContent = 'ფოტოს ლოკაცია';
          photoLabel.style.color = '#ef4444';
          photoPopupBody.appendChild(photoLabel);

          const photoPopup = new window.mapboxgl.Popup({ closeButton: false, closeOnClick: false }).setDOMContent(photoPopupBody);

          const photoEl = document.createElement('div');
          photoEl.className = 'photo-map-marker';
          photoEl.style.width = '16px';
          photoEl.style.height = '16px';
          photoEl.style.borderRadius = '9999px';
          photoEl.style.background = '#ef4444';
          photoEl.style.border = '3px solid #ffffff';
          photoEl.style.boxShadow = '0 2px 4px rgba(0,0,0,0.4)';
          photoEl.style.cursor = 'pointer';

          const photoMarker = new window.mapboxgl.Marker({ element: photoEl })
            .setLngLat([photoLng, photoLat])
            .addTo(map);

          photoEl.addEventListener('mouseenter', () => {
            if (activePopupRef.current !== photoPopup) {
              photoPopup.setLngLat([photoLng, photoLat]).addTo(map);
            }
          });
          photoEl.addEventListener('mouseleave', () => {
            if (activePopupRef.current !== photoPopup) {
              photoPopup.remove();
            }
          });
          photoEl.addEventListener('click', (e) => {
            e.stopPropagation();
            if (activePopupRef.current === photoPopup) {
              photoPopup.remove();
              activePopupRef.current = null;
            } else {
              if (activePopupRef.current) {
                activePopupRef.current.remove();
              }
              photoPopup.setLngLat([photoLng, photoLat]).addTo(map);
              activePopupRef.current = photoPopup;
            }
          });

          markerList.push(photoMarker);
          bounds.extend([photoLng, photoLat]);
        }
      }

      // Add guess markers (blue)
      mapData.guessPoints.forEach((point) => {
        const lng = Number(point.coordinates.longitude);
        const lat = Number(point.coordinates.latitude);
        if (!isFinite(lng) || !isFinite(lat)) return;

        const popupBody = document.createElement('div');
        popupBody.style.fontSize = '14px';
        popupBody.style.lineHeight = '1.3';
        popupBody.style.padding = '4px 4px';
        popupBody.style.background = '#ffffff';
        popupBody.style.color = '#18181b';
        popupBody.style.borderRadius = '6px';

        const userLine = document.createElement('a');
        userLine.href = `/account/${point.author}`;
        userLine.textContent = point.author;
        userLine.style.fontWeight = 'bold';
        userLine.style.color = 'inherit';
        userLine.style.textDecoration = 'underline';
        userLine.style.cursor = 'pointer';
        userLine.addEventListener('click', (e) => {
          e.stopPropagation();
        });
        popupBody.appendChild(userLine);
        popupBody.appendChild(document.createElement('br'));

        const distanceLine = document.createElement('span');
        distanceLine.textContent = `მანძილი: ${point.distance ?? '-'} მ`;
        popupBody.appendChild(distanceLine);
        popupBody.appendChild(document.createElement('br'));

        const scoreLine = document.createElement('span');
        scoreLine.textContent = `ქულა: ${point.score ?? '-'}`;
        popupBody.appendChild(scoreLine);

        const popup = new window.mapboxgl.Popup({ closeButton: false, closeOnClick: false }).setDOMContent(popupBody);

        const el = document.createElement('div');
        el.className = 'guess-map-marker';
        el.style.width = '12px';
        el.style.height = '12px';
        el.style.borderRadius = '9999px';
        el.style.background = '#2563eb';
        el.style.border = '2px solid #ffffff';
        el.style.boxShadow = '0 1px 3px rgba(0,0,0,0.35)';
        el.style.cursor = 'pointer';

        const marker = new window.mapboxgl.Marker({ element: el })
          .setLngLat([lng, lat])
          .addTo(map);

        // Desktop: hover to show temporarily
        el.addEventListener('mouseenter', () => {
          // Only show on hover if this popup isn't already pinned by click
          if (activePopupRef.current !== popup) {
            popup.setLngLat([lng, lat]).addTo(map);
          }
        });
        el.addEventListener('mouseleave', () => {
          // Only hide on mouse leave if this popup isn't pinned by click
          if (activePopupRef.current !== popup) {
            popup.remove();
          }
        });

        // Mobile + Desktop: click/tap to toggle popup
        el.addEventListener('click', (e) => {
          e.stopPropagation();

          // If this popup is already open (pinned), close it
          if (activePopupRef.current === popup) {
            popup.remove();
            activePopupRef.current = null;
          } else {
            // Close any other pinned popup
            if (activePopupRef.current) {
              activePopupRef.current.remove();
            }
            // Open this one and pin it
            popup.setLngLat([lng, lat]).addTo(map);
            activePopupRef.current = popup;
          }
        });

        markerList.push(marker);
        bounds.extend([lng, lat]);
      });

      if (!bounds.isEmpty()) {
        map.fitBounds(bounds, { padding: 40, maxZoom: 14 });
      }

      // Close pinned popup when clicking on map background
      map.on('click', () => {
        if (activePopupRef.current) {
          activePopupRef.current.remove();
          activePopupRef.current = null;
        }
      });

      mapInstanceRef.current = map;
      markersRef.current = markerList;
    };

    if (typeof window.mapboxgl === 'undefined') {
      const script = document.createElement('script');
      script.src = 'https://api.mapbox.com/mapbox-gl-js/v3.19.0/mapbox-gl.js';
      script.onload = initMap;
      document.head.appendChild(script);
    } else {
      initMap();
    }

    return () => {
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      if (activePopupRef.current) {
        activePopupRef.current.remove();
        activePopupRef.current = null;
      }
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [showMap, mapData]);

  const handleOpenMap = async () => {
    setShowMap(true);
    if (!isAuthor || mapData !== null || loadingMapPoints) return;

    setLoadingMapPoints(true);
    setMapPointsError(null);

    try {
      const data = await getPostGuessMapPoints(postId);
      setMapData(data);
    } catch {
      setMapPointsError('რუკის მონაცემების ჩატვირთვა ვერ მოხერხდა.');
      setMapData({ guessPoints: [], photoCoordinates: null });
    } finally {
      setLoadingMapPoints(false);
    }
  };

  return (
    <div className="mt-4 space-y-2">
      {(guessCount > 0 || isAuthor || canGuess) && (
        <div className="px-4 py-2 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {guessCount > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <div className="inline-flex items-center gap-1.5 py-1">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="w-4 h-4 text-zinc-500 dark:text-zinc-400"
                    aria-hidden="true"
                  >
                    <path d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                  <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{guessCount}</span>
                </div>
              </div>
            )}
            {guessCount > 0 && <SortButtons sortType={sortType} onSortChange={setSortType} />}
          </div>
          {isAuthor && guessCount > 0 && (
            <button
              type="button"
              onClick={handleOpenMap}
              className={actionButtonClass}
              title="რუკაზე ყველა გამოცნობის ჩვენება"
            >
              <MapPinIcon className="w-5 h-5" />
              <span className="hidden sm:inline">რუკაზე ნახვა</span>
            </button>
          )}
          {!isAuthor && canGuess && (
            <button
              type="button"
              className={actionButtonClass}
              onClick={() => setShowGuessModal(true)}
            >
              <MapPinIcon className="w-5 h-5" />
              <span className="hidden sm:inline">სცადე</span>
            </button>
          )}
        </div>
      )}
      <div className="space-y-2">
        {sortedGuesses.map((guess) => (
          <PostGuess key={guess.id} guess={guess} />
        ))}
      </div>

      {showGuessModal && (
        <NewGuess
          postId={postId}
          postImage={postImage}
          postTitle={postTitle || ''}
          onClose={() => setShowGuessModal(false)}
          onSubmitted={(newGuess) => onGuessSubmitted?.(newGuess)}
        />
      )}

      {showMap && (
        <div className="fixed inset-0 z-layer-modal bg-zinc-900/50 backdrop-blur-sm p-4">
          <div className="mx-auto h-full max-w-4xl rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">გამოცნობები რუკაზე</h3>
              <button
                type="button"
                onClick={() => setShowMap(false)}
                className="p-2 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition"
                aria-label="დახურვა"
                title="დახურვა"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>
            {loadingMapPoints ? (
              <div className="flex-1 flex items-center justify-center text-sm text-zinc-600 dark:text-zinc-300 px-4 text-center">
                იტვირთება...
              </div>
            ) : mapPointsError ? (
              <div className="flex-1 flex items-center justify-center text-sm text-rose-600 dark:text-rose-400 px-4 text-center">
                {mapPointsError}
              </div>
            ) : (mapData?.guessPoints.length ?? 0) > 0 || mapData?.photoCoordinates ? (
              <div ref={mapRef} className="flex-1 bg-zinc-100 dark:bg-zinc-800" />
            ) : (
              <div className="flex-1 flex items-center justify-center text-sm text-zinc-600 dark:text-zinc-300 px-4 text-center">
                ამ პოსტის გამოცნობებისთვის რუკის წერტილები ვერ მოიძებნა.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
