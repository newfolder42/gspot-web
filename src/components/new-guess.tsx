"use client"

import Image from 'next/image';
import { useState, useEffect, useRef } from 'react';
import { createPostGuess, getPhotoCoordinates } from '@/lib/posts';
import { calculateGuessScore, haversineMeters } from '@/lib/gpsPhotoGuessScore';
import { formatCoordinates } from '@/lib/utils';
import type { PostGuessType } from '@/types/post-guess';
import { MapPinIcon, ImageIcon, XIcon } from '@/components/icons';
import { mapMaxBounds, mapMaxZoom, mapDefaultCenter } from '@/lib/map';
import { isInGeorgia } from '@/lib/geo';
import ZoomableImage from '@/components/common/zoomable-image';

declare global {
  interface Window {
    mapboxgl: any;
  }
}

/**
 * `layout`: "toggle" flips between the photo and the map (the post page, and any
 * narrow screen). "split" shows them side by side from md up, so the photo stays
 * readable while the pin is placed; below md it falls back to toggling.
 *
 * `closeLabel`: what the button that ends a finished guess says. The shuffle deck
 * moves on to the next card when this modal closes, so there it reads "შემდეგი".
 */
export default function NewGuess({ postId, postImage, postTitle, layout = 'toggle', closeLabel = 'დახურვა', onClose, onSubmitted }:
  { postId: number; postImage?: string; postTitle?: string; layout?: 'toggle' | 'split'; closeLabel?: string; onSubmitted?: (guess: PostGuessType) => void; onClose?: () => void }) {
  const split = layout === 'split';
  // No pin until the player places one: an unplaced guess can't be submitted by
  // accident, and the map opens on Tbilisi rather than on a pre-made answer.
  const [selectedCoords, setSelectedCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [submitting, setSubmitting] = useState<null | "submitting" | "success" | "error">(null);
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
      link.href = 'https://api.mapbox.com/mapbox-gl-js/v3.20.0/mapbox-gl.css';
      link.rel = 'stylesheet';
      document.head.appendChild(link);
    }

    // Load Mapbox JS
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
        center: mapDefaultCenter,
        zoom: 12,
        renderWorldCopies: false,
        maxBounds: mapMaxBounds,
        maxZoom: mapMaxZoom,
      });

      // The marker is created on the first click, not up front — see selectedCoords.
      map.on('click', (e: any) => {
        if (!guessMarkerRef.current) {
          guessMarkerRef.current = new window.mapboxgl.Marker({ draggable: true, color: 'rgb(20, 184, 166)' })
            .setLngLat([e.lngLat.lng, e.lngLat.lat])
            .addTo(map);

          guessMarkerRef.current.on('dragend', () => {
            const lngLat = guessMarkerRef.current!.getLngLat();
            setSelectedCoords({
              latitude: lngLat.lat,
              longitude: lngLat.lng,
            });
          });
        } else {
          guessMarkerRef.current.setLngLat([e.lngLat.lng, e.lngLat.lat]);
        }

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

  // The map's maxBounds is a rectangle around the country, so panning still
  // reaches Turkey, Armenia, Azerbaijan and Russia.
  const guessInGeorgia = selectedCoords !== null && isInGeorgia(selectedCoords.latitude, selectedCoords.longitude);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCoords || !guessInGeorgia) return;
    const guessCoords = selectedCoords;
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
          guessMarkerRef.current.setLngLat([guessCoords.longitude, guessCoords.latitude]);
        }

        // Add distance line between markers
        const lineData = {
          type: 'Feature' as const,
          geometry: {
            type: 'LineString' as const,
            coordinates: [
              [lng, lat],
              [guessCoords.longitude, guessCoords.latitude]
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
        const coordsB: [number, number] = [Number(guessCoords.longitude), Number(guessCoords.latitude)];
        const sw: [number, number] = [Math.min(coordsA[0], coordsB[0]), Math.min(coordsA[1], coordsB[1])];
        const ne: [number, number] = [Math.max(coordsA[0], coordsB[0]), Math.max(coordsA[1], coordsB[1])];
        mapInstanceRef.current.fitBounds([sw, ne], { padding: 40, maxZoom: 16 });
      }

      const calculatedDistance = haversineMeters(photoCoordinates, guessCoords);

      const createdGuess = await createPostGuess({ postId, coordinates: guessCoords, distance: calculatedDistance, score: calculateGuessScore(calculatedDistance) });

      setDistance(calculatedDistance);
      setSubmitting('success');
      if (createdGuess) {
        onSubmitted?.(createdGuess);
      }
    } catch (err) {
      setSubmitting('error');
    }
  };

  return (
    <>
      {postImage && (
        <div className="fixed inset-0 z-layer-modal bg-black flex flex-col overflow-hidden bg-zinc-900/50 backdrop-blur-sm">
          {/* Control buttons header */}
          <div className="flex items-center justify-between gap-2 px-4 py-3">
            <span className="min-w-0 truncate text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              {postTitle}
            </span>
            <div className="flex flex-shrink-0 items-center gap-2">
              <button
                onClick={() => setShowMapOrImage(showMapOrImage === "image" ? "map" : "image")}
                className={`p-2 rounded-md bg-white/90 dark:bg-zinc-800/90 text-zinc-800 dark:text-zinc-100 hover:bg-white dark:hover:bg-zinc-700 transition ${split ? 'md:hidden' : ''}`}
                title={showMapOrImage === "image" ? 'რუკა' : 'სურათი'}
                aria-label="Toggle between image and map"
              >
                {showMapOrImage === "image" ? (
                  <MapPinIcon className="w-5 h-5" />
                ) : (
                  <ImageIcon className="w-5 h-5" />
                )}
              </button>

              <button
                onClick={onClose}
                className="p-2 rounded-md bg-white/90 dark:bg-zinc-800/90 text-zinc-800 dark:text-zinc-100 hover:bg-white dark:hover:bg-zinc-700 transition"
                title="დახურვა"
                aria-label="დახურვა"
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Panels container */}
          <div className="flex-1 flex flex-row">
            {/* Image Panel */}
            <div className={`${showMapOrImage === "image" ? 'w-full h-full' : 'hidden'} ${split ? 'md:flex md:w-1/2 md:h-full' : ''} relative flex items-center justify-center overflow-hidden`}>
              <ZoomableImage className="w-full h-full">
                <Image
                  src={postImage}
                  alt={postTitle || ''}
                  fill
                  className="object-contain"
                  priority
                />
              </ZoomableImage>
            </div>

            {/* Map Panel */}
            <div className={`${showMapOrImage === "map" ? 'w-full h-full' : 'hidden'} ${split ? 'md:flex md:w-1/2 md:h-full' : ''} relative flex flex-col overflow-hidden`}>
              <form onSubmit={submit} className="h-full flex flex-col p-4 gap-3">
                <div className="rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800 relative flex-1">
                  <div ref={mapRef} className={`w-full h-full bg-zinc-100 dark:bg-zinc-800 ${submitting !== null ? 'pointer-events-none' : ''}`} />

                  <div className="absolute top-3 right-3 flex items-center gap-2">
                    {/* Distance Info */}
                    {distance !== null && (
                      <div className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-white/90 dark:bg-zinc-800/90 text-zinc-800 dark:text-zinc-100 text-xs">
                        <span className="font-semibold text-teal-600 dark:text-teal-400">
                          {distance} მ
                        </span>
                      </div>
                    )}

                    {/* Coordinates — only once a pin exists */}
                    {selectedCoords && (
                      <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-md text-xs ${guessInGeorgia
                        ? 'bg-white/90 dark:bg-zinc-800/90 text-zinc-800 dark:text-zinc-100'
                        : 'bg-red-600/90 text-white'}`}>
                        {formatCoordinates(selectedCoords.latitude, selectedCoords.longitude)}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 items-center justify-end">
                  {selectedCoords === null && submitting === null && (
                    <span className="mr-auto text-xs text-zinc-500 dark:text-zinc-400">
                      მონიშნე ადგილი რუკაზე
                    </span>
                  )}
                  {selectedCoords !== null && !guessInGeorgia && submitting === null && (
                    <span className="mr-auto text-xs text-red-600 dark:text-red-400">
                      ლოკაცია უნდა იყოს საქართველოში
                    </span>
                  )}
                  {submitting === 'error' && (
                    <span className="mr-auto text-xs text-red-600 dark:text-red-400">
                      გამოცნობა ვერ შეინახა
                    </span>
                  )}
                  <button
                    type="submit"
                    disabled={submitting !== null || !guessInGeorgia}
                    hidden={submitting === 'success' || submitting === 'error'}
                    className="px-4 py-2 rounded-md bg-teal-600 text-white disabled:opacity-50"
                  >
                    {submitting ? 'მიმდინარეობს...' : 'ცდა'}
                  </button>
                  {(submitting === 'success' || submitting === 'error') && (
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-5 py-2 rounded-md bg-teal-600 text-white"
                    >
                      {submitting === 'success' ? closeLabel : 'დახურვა'}
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
