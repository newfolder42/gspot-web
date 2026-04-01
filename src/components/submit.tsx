"use client"

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { createPost } from '@/lib/posts';
import { storeContent } from '@/lib/content';
import { generateFileUrl } from '@/lib/s3';
import { convertToWebP, extractDateTaken, extractGPSCorrdinates } from '@/lib/image';
import { formatCoordinates } from '@/lib/utils';
import type { ZoneSubmitType } from '@/actions/zones';

declare global {
  interface Window {
    mapboxgl: any;
  }
}

interface UploadedPhoto {
  key?: string;
  contentId?: number;
  url: string;
  filename: string;
  size: number;
  uploadedAt: Date;
  coordinates?: {
    latitude: number | null;
    longitude: number | null;
  } | null;
  dateTaken?: Date | null;
}

const MapPreview = ({ coordinates, onChange }: { coordinates: UploadedPhoto['coordinates'] | undefined | null; onChange: (c: { latitude: number; longitude: number }) => void }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [gettingLocation, setGettingLocation] = useState(false);

  const onChangeRef = useRef(onChange);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

  useEffect(() => {
    if (!document.querySelector('link[href*="mapbox-gl.css"]')) {
      const link = document.createElement('link');
      link.href = 'https://api.mapbox.com/mapbox-gl-js/v3.19.0/mapbox-gl.css';
      link.rel = 'stylesheet';
      document.head.appendChild(link);
    }

    // Only add the script if it's not already present to avoid multiple loads/costs
    if (!document.querySelector('script[src*="mapbox-gl-js"]')) {
      const script = document.createElement('script');
      script.src = 'https://api.mapbox.com/mapbox-gl-js/v3.19.0/mapbox-gl.js';
      script.onload = () => initMap();
      document.head.appendChild(script);
    } else if (typeof window.mapboxgl !== 'undefined') {
      // If script already loaded, initialize immediately
      initMap();
    }

    function initMap() {
      if (!mapRef.current || mapInstanceRef.current) return;

      window.mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

      const hasValidCoords = coordinates &&
        typeof coordinates.latitude === 'number' &&
        typeof coordinates.longitude === 'number' &&
        isFinite(coordinates.latitude) &&
        isFinite(coordinates.longitude);

      const defaultCenter: [number, number] = [44.8271, 41.7151];
      const mapCenter: [number, number] = hasValidCoords
        ? [coordinates!.longitude!, coordinates!.latitude!]
        : defaultCenter;

      const map = new window.mapboxgl.Map({
        container: mapRef.current,
        style: 'mapbox://styles/mapbox/standard-satellite',
        center: mapCenter,
        zoom: 12,
        renderWorldCopies: false,
        // restrict map to Georgia bounding box: [west, south], [east, north]
        maxBounds: [[39.4, 40.8], [46.9, 43.8]],
        maxZoom: 18,
      });

      const startLng = hasValidCoords ? coordinates!.longitude! : defaultCenter[0];
      const startLat = hasValidCoords ? coordinates!.latitude! : defaultCenter[1];

      markerRef.current = new window.mapboxgl.Marker({ draggable: true, color: '#3b82f6' })
        .setLngLat([startLng, startLat])
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
    }

    return () => {
      if (mapInstanceRef.current) { mapInstanceRef.current.remove(); mapInstanceRef.current = null; }
      markerRef.current = null;
    };
    // Run only once on mount — do not reinitialize the whole map when `coordinates` change.
  }, []);

  useEffect(() => {
    if (!markerRef.current) return;
    if (coordinates &&
      typeof coordinates.latitude === 'number' &&
      typeof coordinates.longitude === 'number' &&
      isFinite(coordinates.latitude) &&
      isFinite(coordinates.longitude)) {
      markerRef.current.setLngLat([coordinates.longitude!, coordinates.latitude!]);
    }
  }, [coordinates]);

  return (
    <div className="relative rounded overflow-hidden border border-zinc-200 dark:border-zinc-800">
      <div className="absolute top-3 right-3 z-10">
        <button
          type="button"
          onClick={() => {
            if (!navigator.geolocation) { return; }
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

                onChangeRef.current({ latitude: lat, longitude: lng });
                if (mapInstanceRef.current) {
                  try { mapInstanceRef.current.flyTo({ center: [lng, lat], zoom: 12 }); } catch (e) { mapInstanceRef.current.setCenter([lng, lat]); }
                }
                if (markerRef.current) {
                  try { markerRef.current.setLngLat([lng, lat]); if (typeof markerRef.current.setDraggable === 'function') markerRef.current.setDraggable(true); } catch (e) { }
                }
                setGettingLocation(false);
              },
              (err) => { console.error('Geolocation error', err); setGettingLocation(false); },
              { enableHighAccuracy: true, timeout: 10000 }
            );
          }}
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
      <div className="absolute left-2 top-2 z-10 text-xs text-zinc-700 dark:text-zinc-200 bg-white/80 dark:bg-zinc-900/60 backdrop-blur-sm px-2 py-1 rounded border border-zinc-100 dark:border-zinc-800">
        {formatCoordinates(coordinates?.latitude, coordinates?.longitude, 'No GPS data — მონიშნე რუკაზე')}
      </div>
      <div ref={mapRef} className="w-full h-[400px] bg-zinc-100 dark:bg-zinc-800" />
    </div>
  );
};

const ZoneDropdown = ({
  zones,
  selected,
  onSelect,
}: {
  zones: ZoneSubmitType[];
  selected: ZoneSubmitType | null;
  onSelect: (z: ZoneSubmitType) => void;
}) => {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = query.trim()
    ? zones.filter(
      (z) =>
        z.name.toLowerCase().includes(query.toLowerCase()) ||
        z.slug.toLowerCase().includes(query.toLowerCase()) ||
        z.description?.toLowerCase().includes(query.toLowerCase())
    )
    : zones;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2.5 border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-900 text-sm text-left shadow-sm hover:border-zinc-400 dark:hover:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
      >
        <span className="truncate text-zinc-800 dark:text-zinc-100">{selected ? `r/${selected.slug}` : 'საბზონა არჩეული არ არის'}</span>
        <svg className="w-4 h-4 shrink-0 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-lg">
          <div className="p-2 border-b border-zinc-100 dark:border-zinc-800">
            <input
              autoFocus
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ძებნა..."
              className="w-full px-2 py-1.5 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <ul className="max-h-52 overflow-y-auto py-1">
            {filtered.length === 0 && (
              <li className="px-3 py-2 text-sm text-zinc-400">ვერ მოიძებნა</li>
            )}
            {filtered.map((z) => (
              <li key={z.id}>
                <button
                  type="button"
                  onClick={() => {
                    onSelect(z);
                    setOpen(false);
                    setQuery('');
                  }}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-start gap-2 ${selected?.id === z.id ? 'font-medium text-blue-600 dark:text-blue-400' : ''
                    }`}
                >
                  <span className="truncate">r/{z.slug}</span>
                  {z.description && (
                    <span className="ml-auto shrink text-xs text-zinc-400 truncate max-w-40">{z.description}</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default function Submit({
  zones,
  initialZoneId,
  initialZoneSlug,
}: {
  zones: ZoneSubmitType[];
  initialZoneId: number | null;
  initialZoneSlug: string | null;
}) {
  const router = useRouter();

  const findInitialZone = () => {
    if (initialZoneId) return zones.find((z) => z.id === initialZoneId) ?? null;
    if (initialZoneSlug) return zones.find((z) => z.slug === initialZoneSlug) ?? null;
    return zones.find((z) => z.slug === 'public') ?? zones[0] ?? null;
  };

  const [selectedZone, setSelectedZone] = useState<ZoneSubmitType | null>(findInitialZone);
  const [photo, setPhoto] = useState<UploadedPhoto | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [coords, setCoords] = useState<{ latitude: number | null; longitude: number | null } | null>(null);
  const [dateTaken, setDateTaken] = useState<Date | null>(null);
  const previewUrlRef = useRef<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const f = e.target.files?.[0];
    if (!f) return;

    if (!['image/png', 'image/jpeg', 'image/webp'].includes(f.type)) {
      setError('ხმოლოდ PNG, JPEG, და WebP ფოტო-სურათებია ნებადართული');
      return;
    }

    if (f.size > 15 * 1024 * 1024) {
      setError('ფაილის ზომა არ უნდა აღემატებოდეს 15 მბს');
      return;
    }

    // Start processing indicator
    setProcessing(true);

    try {
      // Extract EXIF data (GPS and date) - this takes 3-4 seconds
      const extractedCoords = await extractGPSCorrdinates(f);
      const extractedDate = await extractDateTaken(f);
      setCoords(extractedCoords ?? null);
      setDateTaken(extractedDate ?? null);

      // prepare preview
      if (previewUrlRef.current) {
        try { URL.revokeObjectURL(previewUrlRef.current); } catch { }
        previewUrlRef.current = null;
      }

      let fileToUse = f;
      if (f.type === 'image/png' || f.type === 'image/jpeg') {
        setUploading(true);
        try {
          fileToUse = await convertToWebP(f);
        } catch (err) {
          console.error(err);
          setError('ვერ მოხერხდა სურათის WebP ფორმატში გარდაქმნა');
          setProcessing(false);
          setUploading(false);
          return;
        } finally {
          setUploading(false);
        }
      }

      const preview = URL.createObjectURL(fileToUse);
      previewUrlRef.current = preview;
      setSelectedFile(fileToUse);
      setPhoto({
        key: undefined,
        contentId: undefined,
        url: preview,
        filename: fileToUse.name,
        size: fileToUse.size,
        uploadedAt: new Date(),
        coordinates: extractedCoords ?? null,
        dateTaken: extractedDate ?? null,
      });
    } catch (err) {
      console.error(err);
      setError('ვერ მოხერხდა სურათის დამუშავება');
    } finally {
      setProcessing(false);
    }
  };

  const uploadAndCreate = async (finalCoords: { latitude: number; longitude: number }) => {
    setError(null);
    if (!selectedFile) return setError('ფაილი არ არის არჩეული');
    if (!selectedZone) return setError('საბზონა არ არის არჩეული');
    setUploading(true);
    setUploadProgress(0);
    try {
      const signUrl = await generateFileUrl('gps-photo');

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', signUrl, true);
        xhr.setRequestHeader('Content-Type', selectedFile.type);
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            setUploadProgress(Math.round((event.loaded / event.total) * 100));
          }
        };
        xhr.onload = async () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            const uploadUrl = signUrl.split('?')[0];
            try {
              const content = await storeContent(
                uploadUrl,
                'gps-photo',
                {
                  originalFileName: selectedFile.name,
                  fileSize: selectedFile.size,
                  coordinates: finalCoords,
                  dateTaken: dateTaken ? dateTaken.toISOString() : null,
                }
              );
              if (content == null) {
                throw new Error('ვერ მოხერხდა ფოტო-სურათის ატვირთვა');
              }

              const postId = await createPost({ title: title.trim() || '', contentId: content.id, zoneId: selectedZone!.id, zoneSlug: selectedZone!.slug });
              if (postId) {
                router.push(`/post/${postId}`);
              }

              resolve();
            } catch (err) {
              reject(err);
            }
          } else {
            reject(new Error('ვერ მოხერხდა ფოტო-სურათის ატვირთვა'));
          }
        };
        xhr.onerror = (err) => reject(new Error('' + err));
        xhr.send(selectedFile);
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'ვერ მოხდა ფოტო-სურათის ატვირთვა';
      setError(message);
    } finally {
      setUploading(false);
      setUploadProgress(null);
    }
  };

  const formatDateOnly = (d: Date | null) => {
    if (!d) return '';
    const tzOffset = d.getTimezoneOffset();
    const local = new Date(d.getTime() - tzOffset * 60000);
    return local.toISOString().slice(0, 10);
  };

  const parseDateOnly = (dateVal: string) => {
    if (!dateVal) return null;
    const [y, m, day] = dateVal.split('-').map((s) => parseInt(s, 10));
    const local = new Date(y, m - 1, day); // local midnight
    const tzOffset = new Date().getTimezoneOffset();
    return new Date(local.getTime() + tzOffset * 60000);
  };

  const validateDateTaken = (d: Date | null) => {
    if (!d) return null;
    const today = new Date();
    // normalize dates to compare only date portion
    const y = d.getFullYear();
    const dOnly = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const tOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    if (dOnly.getTime() > tOnly.getTime()) return 'თარიღი არ უნდა იყოს მომავალში';
    if (y < 2012) return 'თარიღი არ შეიძლება იყოს 2012 წელზე ადრე';
    return null;
  };

  const isInGeorgia = (lat: number, lng: number) => {
    // Approximate bounding box for Georgia (country)
    // latitude roughly between 40.8 and 43.8, longitude between 39.4 and 46.9
    return lat >= 40.8 && lat <= 43.8 && lng >= 39.4 && lng <= 46.9;
  };

  // Centralized mandatory-field validation before creating a post.
  const validateBeforeSubmit = () => {
    if (!selectedZone) {
      setError('საბზონა სავალდებულოა');
      return null;
    }

    if (!photo || !selectedFile) {
      setError('ფოტო-სურათი სავალდებულოა');
      return null;
    }

    if (!dateTaken) {
      setError('გადაღების თარიღი სავალდებულოა');
      return null;
    }

    const dateErr = validateDateTaken(dateTaken);
    if (dateErr) {
      setError(dateErr);
      return null;
    }

    const finalCoords = coords ?? photo.coordinates ?? null;
    if (!finalCoords || finalCoords.latitude == null || finalCoords.longitude == null) {
      setError('GPS კოორდინატები სავალდებულოა');
      return null;
    }

    if (!isInGeorgia(finalCoords.latitude, finalCoords.longitude)) {
      setError('ლოკაცია უნდა იყოს საქართველოში');
      return null;
    }

    setError(null);
    return { latitude: finalCoords.latitude, longitude: finalCoords.longitude };
  };

  const selectedZoneRules = selectedZone!.settings.upload_rules;

  return (
    <>
      {/* Modal Dialog */}
      {(
        <div className="w-full overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="space-y-5 p-4 md:p-6">
            <h3 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">ახალი პოსტის შექმნა</h3>

            {error && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                <p className="text-sm font-medium text-red-800 dark:text-red-200">{error}</p>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_280px] gap-4 lg:gap-6 items-start">
              <div className="space-y-4">
                <div className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4 space-y-4">
                  <div className="block text-sm">
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-300">საბზონა</label>
                    <div className="mt-1">
                      <ZoneDropdown zones={zones} selected={selectedZone} onSelect={setSelectedZone} />
                      {zones.length === 0 && (
                        <p className="mt-1 text-xs text-zinc-500">თქვენ არ ხართ არცერთი საბზონის წევრი</p>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <label className="block text-sm">
                      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-300">სათაური</span>
                      <input
                        className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="მაგ: ძველი ეკლესია კახეთში"
                      />
                    </label>

                    <label className="block text-sm">
                      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-300">გადაღებულია</span>
                      <input
                        type="date"
                        className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                        value={formatDateOnly(dateTaken)}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                          const parsed = parseDateOnly(e.target.value);
                          setDateTaken(parsed);
                          const err = validateDateTaken(parsed);
                          setError(err);
                        }}
                      />
                    </label>
                  </div>
                </div>

                {!photo && (
                  <div className="p-4 border border-zinc-300 dark:border-zinc-700 rounded-lg text-xs text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-900">
                    {processing ? (
                      <div className="flex flex-col items-center justify-center py-8 space-y-4">
                        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                        <div className="text-center space-y-1">
                          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">ფოტოს დამუშავება...</p>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            {uploading ? 'ფორმატირება...' : 'GPS და თარიღის მონაცემების ამოღება...'}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <label className="w-full block p-7 border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-lg text-center cursor-pointer bg-zinc-50 dark:bg-zinc-950 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors">
                          <div className="inline-flex items-center gap-2 text-zinc-700 dark:text-zinc-200">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                              <polyline points="17 8 12 3 7 8" />
                              <line x1="12" y1="3" x2="12" y2="15" />
                            </svg>
                            <span className="text-sm font-medium">აირჩიე ან გადაიღე ფოტო</span>
                          </div>
                          <p className="mt-2 text-xs text-zinc-500">WebP/JPEG/PNG, მაქს 15MB</p>
                          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} disabled={processing || uploading} className="hidden" aria-hidden="true" />
                        </label>
                      </div>
                    )}
                  </div>
                )}

                {photo && (
                  <MapPreview
                    coordinates={coords ?? photo?.coordinates ?? null}
                    onChange={(c) => {
                      setCoords({ latitude: c.latitude, longitude: c.longitude });
                      setPhoto((p) => p ? { ...p, coordinates: { latitude: c.latitude, longitude: c.longitude } } : p);
                      setError(null);
                    }}
                  />
                )}

                {photo && (
                  <div className="rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-950 overflow-hidden shadow-sm">
                    <div className="px-3 py-2 border-b border-zinc-800 text-xs text-zinc-300 flex items-center justify-between">
                      <span className="truncate">{photo.filename}</span>
                      <span>{Math.max(1, Math.round(photo.size / 1024 / 1024))}MB</span>
                    </div>
                    <div className="relative w-full h-[360px] md:h-[420px]">
                      <Image src={photo.url} alt={photo.filename} fill sizes="(max-width: 768px) 100vw, 900px" className="object-contain" priority />
                    </div>
                  </div>
                )}
              </div>

              <aside className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 overflow-hidden lg:sticky lg:top-4">
                <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
                  <p className="mt-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100">წესები</p>
                </div>
                <div className="px-4 py-3">
                  {selectedZone?.description && (
                    <p className="text-xs text-zinc-600 dark:text-zinc-300 mb-3">{selectedZone.description}</p>
                  )}
                  <ol className="space-y-2 text-sm text-zinc-700 dark:text-zinc-200">
                    {selectedZoneRules!.map((rule, idx) => (
                      <li key={rule} className="flex gap-2">
                        <span className="text-zinc-400 shrink-0">{idx + 1}.</span>
                        <span>{rule}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </aside>
            </div>

            {uploading && uploadProgress !== null && (
              <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800">
                <div className="w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-blue-500 h-3 rounded-full transition-all duration-200"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end">
              {(() => {
                const hasPhoto = Boolean(photo && selectedFile);
                const final = coords ?? photo?.coordinates ?? null;
                const hasCoords = final && final.latitude != null && final.longitude != null;
                const inGeorgia = hasCoords ? isInGeorgia(final.latitude!, final.longitude!) : false;
                const disabled = !hasPhoto || !hasCoords || !inGeorgia || !selectedZone || !dateTaken;
                return (
                  <button
                    className={`px-3 py-1 text-white rounded-md ${disabled ? 'bg-blue-300 cursor-not-allowed opacity-60' : 'bg-blue-600 cursor-pointer'}`}
                    onClick={async () => {
                      const validForSubmit = validateBeforeSubmit();
                      if (!validForSubmit) return;
                      await uploadAndCreate(validForSubmit);
                    }}
                    disabled={disabled}
                  >ატვირთვა</button>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
