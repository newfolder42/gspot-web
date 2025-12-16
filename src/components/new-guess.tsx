"use client"

import { useState, useEffect, useRef } from 'react';
import { createPostGuess, getPhotoCoordinates } from '@/lib/posts';
import { calculateGuessScore } from '@/lib/gpsPhotoGuessScore';

declare global {
  interface Window {
    mapboxgl: any;
  }
}

export default function NewGuess({ postId, onSubmitted }: { postId: number; onSubmitted?: () => void }) {
  const [selectedCoords, setSelectedCoords] = useState<{ latitude: number; longitude: number }>({
    latitude: 41.7151,
    longitude: 44.8271
  });
  const [submitting, setSubmitting] = useState(false);
  const [distance, setDistance] = useState<number | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  // Handle countdown timer
  useEffect(() => {
    if (countdown === null || countdown <= 0) return;

    const timer = setTimeout(() => {
      if (countdown === 1) {
        setCountdown(null);
        onSubmitted?.();
      } else {
        setCountdown(countdown - 1);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown, onSubmitted]);

  useEffect(() => {
    // Load Mapbox CSS
    if (!document.querySelector('link[href*="mapbox-gl.css"]')) {
      const link = document.createElement('link');
      link.href = 'https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.css';
      link.rel = 'stylesheet';
      document.head.appendChild(link);
    }

    // Load Mapbox JS
    if (typeof window.mapboxgl === 'undefined') {
      const script = document.createElement('script');
      script.src = 'https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.js';
      script.onload = initMap;
      document.head.appendChild(script);
    } else {
      initMap();
    }

    function initMap() {
      if (!mapRef.current || mapInstanceRef.current) return;

      window.mapboxgl.accessToken = 'pk.eyJ1IjoibmV3Zm9sZGVyNDIiLCJhIjoiY21pcTNxa2RxMDEweDR2czgxZ3JjY3ltNSJ9.0R65cn75XdOhjO-_VoLqFQ';

      const map = new window.mapboxgl.Map({
        container: mapRef.current,
        style: 'mapbox://styles/mapbox/satellite-streets-v12',
        center: [selectedCoords.longitude, selectedCoords.latitude],
        zoom: 12,
      });

      markerRef.current = new window.mapboxgl.Marker({ draggable: true })
        .setLngLat([selectedCoords.longitude, selectedCoords.latitude])
        .addTo(map);

      markerRef.current.on('dragend', () => {
        const lngLat = markerRef.current!.getLngLat();
        setSelectedCoords({
          latitude: lngLat.lat,
          longitude: lngLat.lng,
        });
      });

      map.on('click', (e: any) => {
        markerRef.current!.setLngLat([e.lngLat.lng, e.lngLat.lat]);
        setSelectedCoords({
          latitude: e.lngLat.lat,
          longitude: e.lngLat.lng,
        });
      });

      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [selectedCoords]);

  function haversineMeters(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) {
    const toRad = (x: number) => x * Math.PI / 180;
    const R = 6371000; // meters
    const dLat = toRad(b.latitude - a.latitude);
    const dLon = toRad(b.longitude - a.longitude);
    const lat1 = toRad(a.latitude);
    const lat2 = toRad(b.latitude);
    const sinDLat = Math.sin(dLat / 2);
    const sinDLon = Math.sin(dLon / 2);
    const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;
    const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
    return Math.round(R * c);
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await getPhotoCoordinates({ postId });
      if (res === null || !res.coordinates) {
        return;
      }
      const photoCoordinates = res.coordinates;
      // drop marker for photo
      if (mapInstanceRef.current && window.mapboxgl) {
        // Normalize coordinates to [lng, lat]
        const normalizeToLngLat = (coord: any): [number, number] => {
          if (!coord) throw new Error('No coordinates provided');
          const objLng = (coord.longitude ?? coord.lng ?? coord.lon);
          const objLat = (coord.latitude ?? coord.lat);
          if (objLng != null && objLat != null) {
            return [Number(objLng), Number(objLat)];
          }
          if (Array.isArray(coord) && coord.length >= 2) {
            const a = Number(coord[0]);
            const b = Number(coord[1]);
            const looksLatA = isFinite(a) && Math.abs(a) <= 90;
            const looksLngB = isFinite(b) && Math.abs(b) <= 180;
            return looksLatA && looksLngB ? [b, a] : [a, b];
          }
          throw new Error('Unsupported coordinates shape');
        };

        const [lng, lat] = normalizeToLngLat(photoCoordinates);

        // Move existing marker to photo location
        if (markerRef.current) {
          markerRef.current.setLngLat([lng, lat]);
          markerRef.current.setDraggable(false);
        } else {
          // Safety: if no marker exists, create one
          markerRef.current = new window.mapboxgl.Marker({ draggable: false })
            .setLngLat([lng, lat])
            .addTo(mapInstanceRef.current);
        }

        // Center and zoom on the photo location
        mapInstanceRef.current.flyTo({ center: [lng, lat], zoom: 16 });
      }

      const calculatedDistance = haversineMeters(photoCoordinates, selectedCoords);

      await createPostGuess({ postId, coordinates: selectedCoords, distance: calculatedDistance, score: calculateGuessScore(calculatedDistance) });

      setDistance(calculatedDistance);
      setCountdown(10);
    } catch (err) {
      alert('Failed to post guess' + err);
      setSubmitting(false);
    } finally {
      setSubmitting(true);
    }
  };

  return (
    <form onSubmit={submit} className="mt-4 grid gap-3">
      <div className="rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700">
        <div ref={mapRef} className="w-full h-[400px] bg-zinc-100 dark:bg-zinc-800" />
      </div>

      <div className="text-xs text-zinc-600 dark:text-zinc-400">
        მონიშნე ადგილი რუკაზე
      </div>

      <div className="flex gap-2 items-center">
        <button
          type="submit"
          disabled={submitting}
          className="px-4 py-2 rounded-md bg-blue-600 text-white disabled:opacity-50"
        >
          {submitting ? 'მიმდინარეობს...' : 'ცდა'}
        </button>
        <div className="text-xs text-zinc-500">
          {selectedCoords.latitude.toFixed(6)}, {selectedCoords.longitude.toFixed(6)}
          {distance !== null && (
            <span className="ml-3 font-semibold text-blue-600 dark:text-blue-400">
              მანძილი: {distance} მ
              {countdown !== null && (
                <span className="ml-2 text-zinc-400">({countdown}s)</span>
              )}
            </span>
          )}
        </div>
      </div>


    </form>
  );
}
