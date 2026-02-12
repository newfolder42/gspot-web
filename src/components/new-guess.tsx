"use client"

import { useState, useEffect, useRef } from 'react';
import { createPostGuess, getPhotoCoordinates } from '@/lib/posts';
import { calculateGuessScore, haversineMeters } from '@/lib/gpsPhotoGuessScore';
import { formatCoordinates } from '@/lib/utils';

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
  const [gettingLocation, setGettingLocation] = useState(false);
  const [distance, setDistance] = useState<number | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const guessMarkerRef = useRef<any>(null);
  const photoMarkerRef = useRef<any>(null);

  // Handle countdown timer
  useEffect(() => {
    if (countdown === null || countdown <= 0) return;

    const timer = setTimeout(() => {
      if (countdown === 1) {
        setCountdown(null);
        setSubmitting(false);
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

      window.mapboxgl.accessToken = process.env.MAPBOX_ACCESS_TOKEN;

      const map = new window.mapboxgl.Map({
        container: mapRef.current,
        style: 'mapbox://styles/mapbox/standard-satellite',
        center: [selectedCoords.longitude, selectedCoords.latitude],
        zoom: 12,
        renderWorldCopies: false,
        // restrict map to Georgia bounding box: [west, south], [east, north]
        maxBounds: [[39.4, 40.8], [46.9, 43.8]],
        maxZoom: 18,
      });

      guessMarkerRef.current = new window.mapboxgl.Marker({ draggable: true, color: '#3b82f6' })
        .setLngLat([selectedCoords.longitude, selectedCoords.latitude])
        .addTo(map);

      guessMarkerRef.current.on('dragend', () => {
        const lngLat = guessMarkerRef.current!.getLngLat();
        setSelectedCoords({
          latitude: lngLat.lat,
          longitude: lngLat.lng,
        });
      });

      map.on('click', (e: any) => {
        guessMarkerRef.current!.setLngLat([e.lngLat.lng, e.lngLat.lat]);
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
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await getPhotoCoordinates({ postId });
      if (res === null || !res.coordinates) {
        setSubmitting(false);
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

        // Add or move photo marker (red)
        if (photoMarkerRef.current) {
          photoMarkerRef.current.setLngLat([lng, lat]);
        } else {
          photoMarkerRef.current = new window.mapboxgl.Marker({ draggable: false, color: '#ef4444' })
            .setLngLat([lng, lat])
            .addTo(mapInstanceRef.current);
        }

        // Keep guess marker (blue) at user-selected point
        if (guessMarkerRef.current) {
          guessMarkerRef.current.setDraggable(false);
          guessMarkerRef.current.setLngLat([selectedCoords.longitude, selectedCoords.latitude]);
        }

        // Fit both markers in view — build explicit SW/NE arrays to avoid
        // LngLatLike coercion issues across mapbox versions.
        const coordsA: [number, number] = [Number(lng), Number(lat)];
        const coordsB: [number, number] = [Number(selectedCoords.longitude), Number(selectedCoords.latitude)];
        const sw: [number, number] = [Math.min(coordsA[0], coordsB[0]), Math.min(coordsA[1], coordsB[1])];
        const ne: [number, number] = [Math.max(coordsA[0], coordsB[0]), Math.max(coordsA[1], coordsB[1])];
        mapInstanceRef.current.fitBounds([sw, ne], { padding: 40, maxZoom: 16 });
      }

      const calculatedDistance = haversineMeters(photoCoordinates, selectedCoords);

      await createPostGuess({ postId, coordinates: selectedCoords, distance: calculatedDistance, score: calculateGuessScore(calculatedDistance) });

      setDistance(calculatedDistance);
      setCountdown(10);
    } catch (err) {
      setSubmitting(false);
    }
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      return;
    }

    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos?.coords?.latitude);
        const lng = Number(pos?.coords?.longitude);
        if (!isFinite(lat) || !isFinite(lng)) {
          console.error('Invalid geolocation coords', pos);
          setGettingLocation(false);
          return;
        }

        setSelectedCoords({ latitude: lat, longitude: lng });

        if (mapInstanceRef.current) {
          try {
            mapInstanceRef.current.flyTo({ center: [lng, lat], zoom: 12 });
          } catch (e) {
            mapInstanceRef.current.setCenter([lng, lat]);
          }
        }

        if (guessMarkerRef.current) {
          try {
            guessMarkerRef.current.setLngLat([lng, lat]);
            // ensure marker is draggable so user can nudge it
            if (typeof guessMarkerRef.current.setDraggable === 'function') {
              guessMarkerRef.current.setDraggable(true);
            }
          } catch (e) {
            // ignore marker errors
          }
        }

        setGettingLocation(false);
      },
      (err) => {
        console.error('Geolocation error', err);
        setGettingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <form onSubmit={submit} className="mt-4 grid gap-3">
      <div className="rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700 relative">
        <div ref={mapRef} className="w-full h-[400px] bg-zinc-100 dark:bg-zinc-800" />

        <div className="absolute top-3 right-3">
          <button
            type="button"
            onClick={useMyLocation}
            disabled={gettingLocation}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-white/90 dark:bg-zinc-800/90 text-zinc-800 dark:text-zinc-100 shadow-sm hover:shadow-md transition cursor-pointer disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-400"
            aria-label="მომხმარებლის ლოკაცია"
            title="გამოიყენე ჩემი ლოკაცია"
          >
            {gettingLocation && (
              <span className="h-3 w-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            )}
            <span className="text-xs">ჩემი ლოკაცია</span>
          </button>
        </div>
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
          {formatCoordinates(selectedCoords.latitude, selectedCoords.longitude)}
          {distance !== null && (
            <span className="ml-3 font-semibold text-blue-600 dark:text-blue-400">
              მანძილი: {distance} მ
              {countdown !== null && (
                <span className="ml-2 text-zinc-400">({countdown}წ)</span>
              )}
            </span>
          )}
        </div>
      </div>


    </form>
  );
}
