"use client";

import { useEffect, useRef, useState } from 'react';
import { mapDefaultCenter, mapMaxBounds, mapMaxZoom } from '@/lib/map';
import type { HeatmapPointType } from '@/types/heatmap';

declare global {
  interface Window {
    mapboxgl: any;
  }
}

function loadMapboxAssets(onReady: () => void) {
  if (!document.querySelector('link[href*="mapbox-gl.css"]')) {
    const link = document.createElement('link');
    link.href = 'https://api.mapbox.com/mapbox-gl-js/v3.20.0/mapbox-gl.css';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
  }

  if (typeof window.mapboxgl !== 'undefined') {
    onReady();
    return;
  }

  const existingScript = document.querySelector('script[src*="mapbox-gl.js"]');
  if (existingScript) {
    existingScript.addEventListener('load', onReady, { once: true });
    return;
  }

  const script = document.createElement('script');
  script.src = 'https://api.mapbox.com/mapbox-gl-js/v3.20.0/mapbox-gl.js';
  script.onload = onReady;
  document.head.appendChild(script);
}

const SOURCE_ID = 'post-heatmap-source';
const HEAT_LAYER_ID = 'post-heatmap-layer';
const POINT_LAYER_ID = 'post-heatmap-points';

type Props = {
  points: HeatmapPointType[];
  /** blocks zooming in past the aggregation grid, so single posts stay unreadable */
  maxZoom?: number;
  /** shows the individual dots once zoomed past this level */
  pointZoom?: number;
  className?: string;
  emptyMessage?: string;
  showLegend?: boolean;
};

export default function HeatmapMap({
  points,
  maxZoom = mapMaxZoom,
  pointZoom = 13,
  className = 'h-[70vh] min-h-[380px] w-full',
  emptyMessage = 'რუკაზე საჩვენებელი კოორდინატები ჯერ არ არის.',
  showLegend = true,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (points.length === 0) return;

    let cancelled = false;

    const initMap = () => {
      if (cancelled || !containerRef.current || mapRef.current || !window.mapboxgl) return;

      window.mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

      const map = new window.mapboxgl.Map({
        container: containerRef.current,
        style: 'mapbox://styles/mapbox/standard-satellite',
        center: mapDefaultCenter,
        zoom: 6,
        renderWorldCopies: false,
        maxBounds: mapMaxBounds,
        maxZoom,
      });

      mapRef.current = map;

      map.addControl(new window.mapboxgl.NavigationControl({ showCompass: false }), 'top-right');

      const maxWeight = points.reduce((max, p) => Math.max(max, p.weight), 1);

      // a lone post still has to burn, so the ramp starts at a floor instead of at zero.
      // equal stops are a style error, so a map where every cell has one post skips the ramp
      const LONE_POST_WEIGHT = 0.45;
      const weightExpression = maxWeight > 1
        ? ['interpolate', ['linear'], ['get', 'weight'], 1, LONE_POST_WEIGHT, maxWeight, 1]
        : LONE_POST_WEIGHT;

      const geojson = {
        type: 'FeatureCollection',
        features: points.map((p) => ({
          type: 'Feature',
          properties: { weight: p.weight },
          geometry: { type: 'Point', coordinates: [p.longitude, p.latitude] },
        })),
      };

      // interpolate stops have to strictly ascend, so the top stop is pinned above the mid one
      const topZoom = Math.max(maxZoom, 10);
      // when the dots would only show at the very last zoom level, they are dropped instead
      const showPoints = pointZoom < maxZoom;

      map.on('load', () => {
        if (cancelled) return;

        map.addSource(SOURCE_ID, { type: 'geojson', data: geojson });

        map.addLayer({
          id: HEAT_LAYER_ID,
          type: 'heatmap',
          source: SOURCE_ID,
          slot: 'top',
          paint: {
            'heatmap-weight': weightExpression,
            'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 1, topZoom, 3],
            // colour arrives early so an isolated cell reads as a clear blob, not a faint smudge
            'heatmap-color': [
              'interpolate',
              ['linear'],
              ['heatmap-density'],
              0, 'rgba(13, 148, 136, 0)',
              0.1, 'rgba(13, 148, 136, 0.5)',
              0.3, 'rgba(56, 189, 248, 0.7)',
              0.5, 'rgba(250, 204, 21, 0.8)',
              0.75, 'rgba(249, 115, 22, 0.9)',
              1, 'rgba(220, 38, 38, 0.95)',
            ],
            'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, 6, 9, 22, topZoom, 46],
            // fades back where the individual dots take over
            'heatmap-opacity': showPoints
              ? ['interpolate', ['linear'], ['zoom'], pointZoom, 0.9, topZoom, 0.35]
              : 0.85,
          },
        });

        if (showPoints) {
          map.addLayer({
            id: POINT_LAYER_ID,
            type: 'circle',
            source: SOURCE_ID,
            slot: 'top',
            minzoom: pointZoom,
            paint: {
              'circle-radius': ['interpolate', ['linear'], ['zoom'], pointZoom, 3, topZoom, 9],
              'circle-color': 'rgba(248, 250, 252, 0.9)',
              'circle-stroke-color': 'rgba(220, 38, 38, 0.9)',
              'circle-stroke-width': 1.5,
              'circle-opacity': ['interpolate', ['linear'], ['zoom'], pointZoom, 0, topZoom, 0.85],
            },
          });
        }

        const bounds = new window.mapboxgl.LngLatBounds();
        points.forEach((p) => bounds.extend([p.longitude, p.latitude]));
        if (!bounds.isEmpty()) {
          map.fitBounds(bounds, { padding: 48, maxZoom: Math.min(12, maxZoom), duration: 0 });
        }

        setReady(true);
      });
    };

    loadMapboxAssets(initMap);

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      setReady(false);
    };
  }, [points, maxZoom, pointZoom]);

  if (points.length === 0) {
    return (
      <div className={`${className} flex items-center justify-center rounded-md border border-dashed border-zinc-300 dark:border-zinc-700 text-sm text-zinc-500 dark:text-zinc-400 text-center px-4`}>
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="relative">
      <div ref={containerRef} className={`${className} rounded-md overflow-hidden`} />
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center rounded-md bg-zinc-100/70 dark:bg-zinc-900/70 text-sm text-zinc-500 dark:text-zinc-400">
          იტვირთება...
        </div>
      )}
      {showLegend && ready && (
        <div className="absolute top-3 left-3 rounded-md bg-white/85 dark:bg-zinc-900/85 px-3 py-2 backdrop-blur-sm">
          <div className="flex items-center gap-2 text-[11px] text-zinc-600 dark:text-zinc-300">
            <span>ნაკლები</span>
            <span
              aria-hidden
              className="h-2 w-24 rounded-full"
              style={{
                background:
                  'linear-gradient(90deg, rgba(13,148,136,0.55), rgba(56,189,248,0.7), rgba(250,204,21,0.8), rgba(249,115,22,0.9), rgba(220,38,38,0.95))',
              }}
            />
            <span>მეტი</span>
          </div>
        </div>
      )}
    </div>
  );
}
