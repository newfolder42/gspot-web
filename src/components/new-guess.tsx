"use client"

import Image from 'next/image';
import { useState, useEffect, useRef } from 'react';
import { createPostGuess, getPhotoCoordinates } from '@/lib/posts';
import { calculateGuessScore, haversineMeters } from '@/lib/gpsPhotoGuessScore';
import { formatCoordinates } from '@/lib/utils';
import type { PostGuessType } from '@/types/post-guess';

declare global {
  interface Window {
    mapboxgl: any;
  }
}

export default function NewGuess({ postId, postImage, postTitle, onClose, onSubmitted }:
  { postId: number; postImage?: string; postTitle?: string; onSubmitted?: (guess: PostGuessType) => void; onClose?: () => void }) {
  const [selectedCoords, setSelectedCoords] = useState<{ latitude: number; longitude: number }>({
    latitude: 41.7151,
    longitude: 44.8271
  });
  const [submitting, setSubmitting] = useState<null | "submitting" | "success" | "error">(null);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [distance, setDistance] = useState<number | null>(null);
  const [showMapOrImage, setShowMapOrImage] = useState<"image" | "map">("map");
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const guessMarkerRef = useRef<any>(null);
  const photoMarkerRef = useRef<any>(null);

  useEffect(() => {
    // Load Mapbox CSS
    if (!document.querySelector('link[href*="mapbox-gl.css"]')) {
      const link = document.createElement('link');
      link.href = 'https://api.mapbox.com/mapbox-gl-js/v3.19.0/mapbox-gl.css';
      link.rel = 'stylesheet';
      document.head.appendChild(link);
    }

    // Load Mapbox JS
    if (typeof window.mapboxgl === 'undefined') {
      const script = document.createElement('script');
      script.src = 'https://api.mapbox.com/mapbox-gl-js/v3.19.0/mapbox-gl.js';
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
        // Clean up line layer and source
        if (mapInstanceRef.current.getLayer('distance-line')) {
          mapInstanceRef.current.removeLayer('distance-line');
        }
        if (mapInstanceRef.current.getSource('distance-line')) {
          mapInstanceRef.current.removeSource('distance-line');
        }
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Resize map when layout orientation changes
  useEffect(() => {
    if (mapInstanceRef.current) {
      setTimeout(() => {
        mapInstanceRef.current?.resize();
      }, 0);
    }
  }, [showMapOrImage]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting('submitting');
    try {
      const res = await getPhotoCoordinates({ postId });
      if (res === null || !res.coordinates) {
        setSubmitting('error');
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

        // Add distance line between markers
        const lineData = {
          type: 'Feature' as const,
          geometry: {
            type: 'LineString' as const,
            coordinates: [
              [lng, lat],
              [selectedCoords.longitude, selectedCoords.latitude]
            ]
          }
        };

        if (!mapInstanceRef.current.getSource('distance-line')) {
          mapInstanceRef.current.addSource('distance-line', {
            type: 'geojson',
            data: lineData
          });
          mapInstanceRef.current.addLayer({
            id: 'distance-line',
            type: 'line',
            source: 'distance-line',
            paint: {
              'line-color': '#fbbf24',
              'line-width': 2,
              'line-dasharray': [4, 4]
            }
          });
        } else {
          (mapInstanceRef.current.getSource('distance-line') as any).setData(lineData);
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

      const createdGuess = await createPostGuess({ postId, coordinates: selectedCoords, distance: calculatedDistance, score: calculateGuessScore(calculatedDistance) });

      setDistance(calculatedDistance);
      setSubmitting('success');
      if (createdGuess) {
        onSubmitted?.(createdGuess);
      }
    } catch (err) {
      setSubmitting('error');
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
    <>
      {postImage && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col overflow-hidden bg-zinc-900/50 backdrop-blur-sm">
          {/* Control buttons header */}
          <div className="flex items-center justify-end gap-2 px-4 py-3">
            <button
              onClick={() => setShowMapOrImage(showMapOrImage === "image" ? "map" : "image")}
              className="p-2 rounded-md bg-white/90 dark:bg-zinc-800/90 text-zinc-800 dark:text-zinc-100 hover:bg-white dark:hover:bg-zinc-700 transition"
              title={showMapOrImage === "image" ? 'რუკა' : 'სურათი'}
              aria-label="Toggle between image and map"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" />
              </svg>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-md bg-white/90 dark:bg-zinc-800/90 text-zinc-800 dark:text-zinc-100 hover:bg-white dark:hover:bg-zinc-700 transition"
              title="დახურვა"
              aria-label="დახურვა"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Panels container */}
          <div className="flex-1 flex flex-row">
            {/* Image Panel */}
            <div className={`${showMapOrImage === "image" ? 'w-full h-full' : 'hidden'} relative flex items-center justify-center overflow-hidden`}>
              <Image
                src={postImage}
                alt={postTitle || ''}
                fill
                className="object-contain"
                priority
              />
            </div>

            {/* Map Panel */}
            <div className={`${showMapOrImage === "map" ? 'w-full h-full' : 'hidden'} relative flex flex-col overflow-hidden`}>
              <form onSubmit={submit} className="h-full flex flex-col p-4 gap-3">
                <div className="rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800 relative flex-1">
                  <div ref={mapRef} className={`w-full h-full bg-zinc-100 dark:bg-zinc-800 ${submitting !== null ? 'pointer-events-none' : ''}`} />

                  <div className="absolute top-3 right-3 flex items-center gap-2">
                    {/* Distance Info */}
                    {distance !== null && (
                      <div className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-white/90 dark:bg-zinc-800/90 text-zinc-800 dark:text-zinc-100 text-xs">
                        <span className="font-semibold text-blue-600 dark:text-blue-400">
                          {distance} მ
                        </span>
                      </div>
                    )}

                    {/* Coordinates */}
                    <div className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-white/90 dark:bg-zinc-800/90 text-zinc-800 dark:text-zinc-100 text-xs">
                      {formatCoordinates(selectedCoords.latitude, selectedCoords.longitude)}
                    </div>

                    {/* Get Location Button */}
                    <button
                      type="button"
                      onClick={useMyLocation}
                      disabled={gettingLocation}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-white/90 dark:bg-zinc-800/90 text-zinc-800 dark:text-zinc-100 transition cursor-pointer disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-400"
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

                <div className="flex gap-2 items-center justify-end">
                  <button
                    type="submit"
                    disabled={submitting !== null}
                    hidden={submitting === 'success' || submitting === 'error'}
                    className="px-4 py-2 rounded-md bg-blue-600 text-white disabled:opacity-50"
                  >
                    {submitting ? 'მიმდინარეობს...' : 'ცდა'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
