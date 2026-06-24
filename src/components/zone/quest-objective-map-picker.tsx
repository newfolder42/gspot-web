"use client"

import { useEffect, useRef, useState } from 'react';
import { formatCoordinates } from '@/lib/utils';
import { mapMaxBounds, mapMaxZoom } from '@/lib/map';

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

export default function QuestObjectiveMapPicker({
  latitude,
  longitude,
  onChange,
}: {
  latitude: number;
  longitude: number;
  onChange: (coords: { latitude: number; longitude: number }) => void;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadMapboxAssets(() => {
      if (!cancelled) setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready || !mapRef.current || mapInstanceRef.current) return;

    window.mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

    const map = new window.mapboxgl.Map({
      container: mapRef.current,
      style: 'mapbox://styles/mapbox/standard-satellite',
      center: [longitude, latitude],
      zoom: 13,
      renderWorldCopies: false,
      maxBounds: mapMaxBounds,
      maxZoom: mapMaxZoom,
    });

    markerRef.current = new window.mapboxgl.Marker({ draggable: true, color: 'rgb(20, 184, 166)' })
      .setLngLat([longitude, latitude])
      .addTo(map);

    markerRef.current.on('dragend', () => {
      const lngLat = markerRef.current!.getLngLat();
      onChangeRef.current({ latitude: lngLat.lat, longitude: lngLat.lng });
    });

    map.on('click', (e: any) => {
      markerRef.current!.setLngLat([e.lngLat.lng, e.lngLat.lat]);
      onChangeRef.current({ latitude: e.lngLat.lat, longitude: e.lngLat.lng });
    });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  return (
    <div className="rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800 relative h-56">
      <div ref={mapRef} className="w-full h-full bg-zinc-100 dark:bg-zinc-800" />
      <div className="absolute top-2 right-2 inline-flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-white/90 dark:bg-zinc-800/90 text-zinc-800 dark:text-zinc-100 text-xs">
        {formatCoordinates(latitude, longitude)}
      </div>
    </div>
  );
}
