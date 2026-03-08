"use client"

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { createPost } from '@/lib/posts';
import { storeContent } from '@/lib/content';
import { generateFileUrl } from '@/lib/s3';
import { convertToWebP, extractDateTaken, extractGPSCorrdinates } from '@/lib/image';
import { formatCoordinates } from '@/lib/utils';
import { ImageIcon } from './icons';

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

export default function CreatePost() {
  const [photo, setPhoto] = useState<UploadedPhoto | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelStep, setPanelStep] = useState<0 | 1 | 2 | 3>(0); // 0=select,1=preview,2=map,3=meta
  const [coords, setCoords] = useState<{ latitude: number | null; longitude: number | null } | null>(null);
  const [dateTaken, setDateTaken] = useState<Date | null>(null);
  const previewUrlRef = useRef<string | null>(null);
  const [processing, setProcessing] = useState(false); // Loading state for EXIF extraction and image processing

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (panelOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [panelOpen]);

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
    setPanelOpen(true);
    setPanelStep(0); // Show in select mode with loading

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
          setPanelOpen(false);
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

      // move to preview step
      setPanelStep(1);
    } catch (err) {
      console.error(err);
      setError('ვერ მოხერხდა სურათის დამუშავება');
      setPanelOpen(false);
    } finally {
      setProcessing(false);
    }
  };

  const uploadAndCreate = async (finalCoords: { latitude: number; longitude: number }) => {
    setError(null);
    if (!selectedFile) return setError('ფაილი არ არის არჩეული');
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

              await createPost({ title: title.trim() || '', contentId: content.id });
              window.location.reload();

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

  const formatDateForInput = (d: Date | null) => {
    if (!d) return '';
    const tzOffset = d.getTimezoneOffset();
    const local = new Date(d.getTime() - tzOffset * 60000);
    return local.toISOString().slice(0, 16);
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

  return (
    <>
      <div className="p-2">
        <button
          onClick={() => { setPanelOpen(true); setPanelStep(0); }}
          type="button"
          className="px-3 py-2 border border-zinc-200 dark:border-zinc-800 rounded-md text-sm bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 cursor-pointer inline-flex items-center"
        >
          <ImageIcon className="w-5 h-5" />
          <span className="ml-2">ატვირთვა</span>
        </button>
      </div>

      {/* Modal Dialog */}
      {panelOpen && (
        <div className="fixed inset-0 z-layer-modal flex items-center justify-center bg-black/50 p-4" onClick={() => {
          if (!uploading && !processing) {
            setPanelOpen(false);
            setPanelStep(0);
            setSelectedFile(null);
            setPhoto(null);
            setCoords(null);
            setDateTaken(null);
            setTitle('');
            setError(null);
            if (previewUrlRef.current) { try { URL.revokeObjectURL(previewUrlRef.current); } catch { } previewUrlRef.current = null; }
          }
        }}>
          <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">ფოტოს ატვირთვა</h3>
                <button
                  type="button"
                  className="text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                  onClick={() => {
                    if (!uploading && !processing) {
                      setPanelOpen(false);
                      setPanelStep(0);
                      setSelectedFile(null);
                      setPhoto(null);
                      setCoords(null);
                      setDateTaken(null);
                      setTitle('');
                      setError(null);
                      if (previewUrlRef.current) { try { URL.revokeObjectURL(previewUrlRef.current); } catch { } previewUrlRef.current = null; }
                    }
                  }}
                  disabled={uploading || processing}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                  <p className="text-sm font-medium text-red-800 dark:text-red-200">{error}</p>
                </div>
              )}


              {panelStep === 0 && (
                <div className="p-3 border rounded-md text-xs text-zinc-700 dark:text-zinc-300">
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
                    <>
                      <div className="space-y-1 mb-3">
                        <p className="font-medium text-blue-700 dark:text-blue-400">📋 ატვირთვის მოთხოვნები:</p>
                        <p>• დასაშვები: WebP/JPEG/PNG · მაქს 15მბ.</p>
                        <p>• GPS ლოკაციის მითითება სავალდებულოა და ლოკაცია უნდა იყოს საქართველოში.</p>
                        <p>• <strong>მობილურზე:</strong> ბრაუზერი შლის GPS მონაცემებს და ლოკაცია მიუთითე რუკაზე.</p>
                        <p>• არ გამოიყენო დაზუმილი ან შემთხვევითი ფოტო - უნდა ჩანდეს ამოსაცნობი ადგილი.</p>
                        <p>• უპირატესობა მიანიჭე ფორთრეითში გადაღებულ სურათს.</p>
                      </div>

                      <div>
                        <label className="w-full block p-4 border border-dashed border-zinc-200 rounded-md text-center cursor-pointer bg-zinc-50 dark:bg-zinc-800">
                          <div className="inline-flex items-center gap-2">
                            <span>აირჩიე ან გადაიღე ფოტო</span>
                          </div>
                          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} disabled={processing || uploading} className="hidden" aria-hidden="true" />
                        </label>
                      </div>
                    </>
                  )}
                </div>
              )}

              {panelStep === 1 && photo && (
                <div>
                  <div className="mb-3">
                    <div className="relative w-full h-[320px] bg-zinc-50 dark:bg-zinc-900 rounded overflow-hidden">
                      <Image src={photo.url} alt={photo.filename} fill sizes="(max-width: 768px) 100vw, 768px" className="object-contain" priority />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button className="px-3 py-1 bg-blue-600 text-white rounded-md cursor-pointer" onClick={() => setPanelStep(2)}>შემდეგი</button>
                  </div>
                </div>
              )}

              {panelStep === 2 && (
                <div>
                  <MapPreview
                    coordinates={coords ?? photo?.coordinates ?? null}
                    onChange={(c) => {
                      setCoords({ latitude: c.latitude, longitude: c.longitude });
                      setPhoto((p) => p ? { ...p, coordinates: { latitude: c.latitude, longitude: c.longitude } } : p);
                      setError(null);
                    }}
                  />

                  <div className="flex justify-between mt-3">
                    <div>
                      <button className="px-3 py-1 bg-blue-600 text-white rounded-md cursor-pointer" onClick={() => setPanelStep(1)}>უკან</button>
                    </div>
                    <div className="flex gap-2">
                      {(() => {
                        const final = coords ?? photo?.coordinates ?? null;
                        const hasCoords = final && final.latitude != null && final.longitude != null;
                        const inGeorgia = hasCoords ? isInGeorgia(final.latitude!, final.longitude!) : false;
                        const disabled = !hasCoords || !inGeorgia;
                        return (
                          <button
                            className={`px-3 py-1 rounded-md text-white ${disabled ? 'bg-blue-300 cursor-not-allowed opacity-60' : 'bg-blue-600 cursor-pointer'}`}
                            onClick={async () => {
                              const finalCoords = coords ?? photo?.coordinates;
                              if (!finalCoords || finalCoords.latitude == null || finalCoords.longitude == null) {
                                setError('GPS კოორდინატები სავალდებულოა');
                                return;
                              }
                              if (!isInGeorgia(finalCoords.latitude, finalCoords.longitude)) {
                                setError('ლოკაცია უნდა იყოს საქართველოში');
                                return;
                              }
                              setError(null);
                              setPanelStep(3);
                            }}
                            disabled={disabled}
                          >შემდეგი</button>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              )}

              {panelStep === 3 && (
                <div>
                  <div className="space-y-3">
                    <label className="block text-sm">
                      სათაური:
                      <input
                        className="mt-1 w-full px-3 py-2 border rounded-md bg-white dark:bg-zinc-800"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="სათაური (არასავალდებულო)"
                      />
                    </label>

                    <label className="block text-sm">
                      გადაღებულია:
                      <input
                        type="date"
                        className="mt-1 w-full px-3 py-2 border rounded-md bg-white dark:bg-zinc-800"
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

                  <div className="flex justify-between mt-3">
                    <div>
                      <button className="px-3 py-1 bg-blue-600 text-white rounded-md cursor-pointer" onClick={() => setPanelStep(2)}>უკან</button>
                    </div>
                    <div className="flex gap-2">
                      <button
                        className="px-3 py-1 bg-blue-600 text-white rounded-md cursor-pointer"
                        onClick={async () => {
                          const final = coords ?? photo?.coordinates;
                          if (!final || final.latitude == null || final.longitude == null) return setError('GPS coordinates required');
                          const dateErr = validateDateTaken(dateTaken);
                          if (dateErr) return setError(dateErr);
                          await uploadAndCreate({ latitude: final.latitude, longitude: final.longitude });
                        }}
                      >ატვირთვა</button>
                    </div>
                  </div>
                </div>
              )}

              {uploading && uploadProgress !== null && (
                <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                  <div className="w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-blue-500 h-3 rounded-full transition-all duration-200"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
