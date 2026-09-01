"use client";

import { useEffect, useRef, useState } from 'react';
import { loadHideAndSeekCheckMapAction } from '@/actions/hideAndSeek';
import { formatDistance, HIDING_SPOT_COLOR } from '@/types/hide-and-seek';
import type { HideAndSeekCheckMapDataType } from '@/types/hide-and-seek';
import { mapDefaultCenter, mapMaxBounds, mapMaxZoom } from '@/lib/map';
import { XIcon } from '@/components/icons';

declare global {
  interface Window {
    mapboxgl: any;
  }
}

/** A dot with a white ring, the same marker language the guess map uses. */
function dotElement(color: string, size: number, ring: number): HTMLDivElement {
  const el = document.createElement('div');
  el.style.width = `${size}px`;
  el.style.height = `${size}px`;
  el.style.borderRadius = '9999px';
  el.style.background = color;
  el.style.border = `${ring}px solid #ffffff`;
  el.style.boxShadow = '0 1px 3px rgba(0,0,0,0.35)';
  el.style.cursor = 'pointer';
  return el;
}

function popupElement(lines: string[], accent: string): HTMLDivElement {
  const body = document.createElement('div');
  body.style.fontSize = '14px';
  body.style.lineHeight = '1.3';
  body.style.padding = '4px 6px';
  body.style.background = '#ffffff';
  body.style.color = '#18181b';
  body.style.borderRadius = '6px';

  lines.forEach((line, i) => {
    const span = document.createElement(i === 0 ? 'strong' : 'span');
    span.textContent = line;
    if (i === 0) span.style.color = accent;
    body.appendChild(span);
    if (i < lines.length - 1) body.appendChild(document.createElement('br'));
  });

  return body;
}

/**
 * The host's post-game board: every check anyone placed, coloured per seeker, around the
 * spot they were actually hiding at. Mirrors the author-only "რუკაზე ნახვა" on a
 * gps-photo post, with the extra colour axis because one seeker leaves many points.
 */
export default function ChecksMap({ postId, onClose }: { postId: number; onClose: () => void }) {
  const [data, setData] = useState<HideAndSeekCheckMapDataType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const activePopupRef = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;

    loadHideAndSeekCheckMapAction(postId)
      .then((result) => {
        if (cancelled) return;
        if (!result) setError('რუკის მონაცემები ვერ ჩაიტვირთა.');
        setData(result);
      })
      .catch(() => {
        if (!cancelled) setError('რუკის მონაცემები ვერ ჩაიტვირთა.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [postId]);

  useEffect(() => {
    if (!data) return;

    if (!document.querySelector('link[href*="mapbox-gl.css"]')) {
      const link = document.createElement('link');
      link.href = 'https://api.mapbox.com/mapbox-gl-js/v3.20.0/mapbox-gl.css';
      link.rel = 'stylesheet';
      document.head.appendChild(link);
    }

    const colorOf = new Map(data.seekers.map((s) => [s.userId, s.color]));

    const initMap = () => {
      if (!mapRef.current || mapInstanceRef.current || !window.mapboxgl) return;

      window.mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

      const center: [number, number] = data.hidingSpot
        ? [data.hidingSpot.longitude, data.hidingSpot.latitude]
        : mapDefaultCenter;

      const map = new window.mapboxgl.Map({
        container: mapRef.current,
        style: 'mapbox://styles/mapbox/standard-satellite',
        center,
        zoom: 12,
        renderWorldCopies: false,
        maxBounds: mapMaxBounds,
        maxZoom: mapMaxZoom,
      });

      const bounds = new window.mapboxgl.LngLatBounds();
      const markerList: any[] = [];

      const attach = (el: HTMLElement, popup: any, lngLat: [number, number]) => {
        el.addEventListener('mouseenter', () => {
          if (activePopupRef.current !== popup) popup.setLngLat(lngLat).addTo(map);
        });
        el.addEventListener('mouseleave', () => {
          if (activePopupRef.current !== popup) popup.remove();
        });
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          if (activePopupRef.current === popup) {
            popup.remove();
            activePopupRef.current = null;
            return;
          }
          activePopupRef.current?.remove();
          popup.setLngLat(lngLat).addTo(map);
          activePopupRef.current = popup;
        });
      };

      if (data.hidingSpot) {
        const lngLat: [number, number] = [data.hidingSpot.longitude, data.hidingSpot.latitude];
        const el = dotElement(HIDING_SPOT_COLOR, 16, 3);
        const popup = new window.mapboxgl.Popup({ closeButton: false, closeOnClick: false })
          .setDOMContent(popupElement(['სამალავი'], HIDING_SPOT_COLOR));

        markerList.push(new window.mapboxgl.Marker({ element: el }).setLngLat(lngLat).addTo(map));
        attach(el, popup, lngLat);
        bounds.extend(lngLat);
      }

      data.points.forEach((point) => {
        const lng = Number(point.coordinates.longitude);
        const lat = Number(point.coordinates.latitude);
        if (!isFinite(lng) || !isFinite(lat)) return;

        const color = colorOf.get(point.userId) ?? '#38bdf8';
        // the catching check is drawn larger so the winning move stands out of the trail
        const el = dotElement(color, point.found ? 16 : 11, 2);
        const popup = new window.mapboxgl.Popup({ closeButton: false, closeOnClick: false })
          .setDOMContent(
            popupElement(
              [
                `'${point.author}`,
                `მანძილი: ${formatDistance(point.distanceMeters)}`,
                ...(point.found ? ['იპოვა'] : []),
              ],
              color
            )
          );

        const lngLat: [number, number] = [lng, lat];
        markerList.push(new window.mapboxgl.Marker({ element: el }).setLngLat(lngLat).addTo(map));
        attach(el, popup, lngLat);
        bounds.extend(lngLat);
      });

      if (!bounds.isEmpty()) {
        map.fitBounds(bounds, { padding: 40, maxZoom: 15 });
      }

      map.on('click', () => {
        activePopupRef.current?.remove();
        activePopupRef.current = null;
      });

      mapInstanceRef.current = map;
      markersRef.current = markerList;
    };

    if (typeof window.mapboxgl === 'undefined') {
      const script = document.createElement('script');
      script.src = 'https://api.mapbox.com/mapbox-gl-js/v3.20.0/mapbox-gl.js';
      script.onload = initMap;
      document.head.appendChild(script);
    } else {
      initMap();
    }

    return () => {
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      activePopupRef.current?.remove();
      activePopupRef.current = null;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [data]);

  return (
    <div className="fixed inset-0 z-layer-modal bg-zinc-900/50 backdrop-blur-sm p-4">
      <div className="mx-auto h-full max-w-4xl rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden flex flex-col">
        <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">მცდელობები რუკაზე</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition"
            aria-label="დახურვა"
            title="დახურვა"
          >
            <XIcon className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center text-sm text-zinc-600 dark:text-zinc-300">
            იტვირთება...
          </div>
        ) : error || !data ? (
          <div className="flex-1 flex items-center justify-center px-4 text-center text-sm text-rose-600 dark:text-rose-400">
            {error ?? 'რუკის მონაცემები ვერ ჩაიტვირთა.'}
          </div>
        ) : data.points.length === 0 ? (
          <div className="flex-1 flex items-center justify-center px-4 text-center text-sm text-zinc-600 dark:text-zinc-300">
            ამ თამაშში მცდელობა არავის გაუკეთებია.
          </div>
        ) : (
          <>
            <div ref={mapRef} className="flex-1 bg-zinc-100 dark:bg-zinc-800" />
            <div className="border-t border-zinc-200 dark:border-zinc-800 px-4 py-3 max-h-40 overflow-y-auto">
              <ul className="flex flex-wrap gap-x-4 gap-y-2">
                <li className="inline-flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-300">
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ background: HIDING_SPOT_COLOR }}
                  />
                  სამალავი
                </li>
                {data.seekers.map((seeker) => (
                  <li
                    key={seeker.userId}
                    className="inline-flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-300"
                  >
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ background: seeker.color }}
                    />
                    <span className="font-medium">&apos;{seeker.alias}</span>
                    <span className="tabular-nums text-zinc-400">
                      {seeker.checkCount}
                      {seeker.bestDistance != null && ` · ${formatDistance(seeker.bestDistance)}`}
                    </span>
                    {seeker.found && <span className="text-teal-600 dark:text-teal-400">იპოვა</span>}
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
