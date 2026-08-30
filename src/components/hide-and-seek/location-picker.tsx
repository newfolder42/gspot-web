"use client";

import { useEffect, useRef, useState } from 'react';
import { mapMaxBounds, mapMaxZoom, mapDefaultCenter } from '@/lib/map';
import { isInGeorgia } from '@/lib/geo';
import { formatCoordinates } from '@/lib/utils';
import { MapPinIcon } from '@/components/icons';

declare global {
  interface Window {
    mapboxgl: any;
  }
}

type Props = {
  value: { latitude: number; longitude: number };
  onChange: (coords: { latitude: number; longitude: number }) => void;
};

/**
 * Map with a draggable pin and a "where I am now" shortcut. The host does not have to be
 * standing on the spot they pick — the pin is the answer, not a check-in.
 */
export default function LocationPicker({ value, onChange }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const onChangeRef = useRef(onChange);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  onChangeRef.current = onChange;

  useEffect(() => {
    if (!document.querySelector('link[href*="mapbox-gl.css"]')) {
      const link = document.createElement('link');
      link.href = 'https://api.mapbox.com/mapbox-gl-js/v3.20.0/mapbox-gl.css';
      link.rel = 'stylesheet';
      document.head.appendChild(link);
    }

    if (typeof window.mapboxgl === 'undefined') {
      const script = document.createElement('script');
      script.src = 'https://api.mapbox.com/mapbox-gl-js/v3.20.0/mapbox-gl.js';
      script.onload = initMap;
      document.head.appendChild(script);
    } else {
      initMap();
    }

    function initMap() {
      if (!mapRef.current || mapInstanceRef.current) return;

      window.mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

      const map = new window.mapboxgl.Map({
        container: mapRef.current,
        style: 'mapbox://styles/mapbox/standard-satellite',
        center: [value.longitude, value.latitude],
        zoom: 13,
        renderWorldCopies: false,
        maxBounds: mapMaxBounds,
        maxZoom: mapMaxZoom,
      });

      markerRef.current = new window.mapboxgl.Marker({ draggable: true, color: 'rgb(20, 184, 166)' })
        .setLngLat([value.longitude, value.latitude])
        .addTo(map);

      markerRef.current.on('dragend', () => {
        const lngLat = markerRef.current.getLngLat();
        onChangeRef.current({ latitude: lngLat.lat, longitude: lngLat.lng });
      });

      map.on('click', (e: any) => {
        markerRef.current.setLngLat([e.lngLat.lng, e.lngLat.lat]);
        onChangeRef.current({ latitude: e.lngLat.lat, longitude: e.lngLat.lng });
      });

      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('ბრაუზერი მდებარეობას არ იძლევა.');
      return;
    }

    setLocating(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
        setLocating(false);

        if (!isInGeorgia(coords.latitude, coords.longitude)) {
          setLocationError('შენი მდებარეობა საქართველოს გარეთაა.');
          return;
        }

        markerRef.current?.setLngLat([coords.longitude, coords.latitude]);
        mapInstanceRef.current?.flyTo({ center: [coords.longitude, coords.latitude], zoom: 15 });
        onChangeRef.current(coords);
      },
      () => {
        setLocating(false);
        setLocationError('მდებარეობის დადგენა ვერ მოხერხდა.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const inGeorgia = isInGeorgia(value.latitude, value.longitude);

  return (
    <div className="space-y-2">
      <div ref={mapRef} className="w-full h-64 sm:h-80 rounded-lg overflow-hidden bg-zinc-100 dark:bg-zinc-900" />

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={useCurrentLocation}
          disabled={locating}
          className="inline-flex items-center gap-1.5 rounded-md border border-zinc-300 dark:border-zinc-700 px-2.5 py-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50"
        >
          <MapPinIcon className="w-4 h-4" />
          {locating ? 'იძებნება...' : 'ჩემი მდებარეობა'}
        </button>
        <span className="font-mono text-xs text-zinc-500">
          {formatCoordinates(value.latitude, value.longitude)}
        </span>
      </div>

      {!inGeorgia && (
        <p className="text-sm text-rose-600 dark:text-rose-400">აირჩიე წერტილი საქართველოს ტერიტორიაზე.</p>
      )}
      {locationError && <p className="text-sm text-amber-600 dark:text-amber-400">{locationError}</p>}
    </div>
  );
}
