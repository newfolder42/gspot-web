"use client";

import { useState, useRef } from 'react';
import exifr from 'exifr';
import Link from 'next/link';
import { createPost } from '@/lib/posts';

interface UploadedPhoto {
    key?: string;
    contentId?: number;
    url: string;
    filename: string;
    size: number;
    uploadedAt: string;
    coordinates?: {
        latitude: number;
        longitude: number;
    } | null;
}

type PhotoUploadProps = {
    showCreate?: boolean;
};

export default function PhotoUpload({ showCreate }: PhotoUploadProps = {}) {
    const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!['image/png', 'image/jpeg', 'image/gif', 'image/webp'].includes(file.type)) {
            setError('Only PNG, JPEG, GIF, and WebP images are allowed');
            return;
        }

        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
            setError('File size must be less than 5MB');
            return;
        }

        let lat: number | null = null;
        let lon: number | null = null;

        try {
            const gps = await exifr.gps(file);
            if (gps && typeof gps.latitude === 'number' && typeof gps.longitude === 'number') {
                lat = gps.latitude;
                lon = gps.longitude;
            } else {
                const all = await exifr.parse(file);
                if (all?.GPSLatitude && all?.GPSLongitude) {
                    lat = all.latitude ?? null;
                    lon = all.longitude ?? null;
                }
            }
            if (lat == null || lon == null) {
                setError('No GPS data found in image.');
                return;
            }
        } catch (exifErr) {
            console.warn('EXIF parse error', exifErr);
        }

        setError(null);
        setUploading(true);

        try {
            // Step 1: Request a signed URL from your backend
            const signUrlResponse = await fetch('/api/account/upload-content', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    filename: file.name,
                    type: 'gps-photo',
                    contentType: file.type,
                    fileSize: file.size,
                    coordinates: {
                        lat,
                        lon
                    }
                }),
            });

            if (!signUrlResponse.ok) {
                const errData = await signUrlResponse.json();
                throw new Error(errData.error || 'Failed to get signed URL');
            }

            const signData = await signUrlResponse.json();
            const uploadUrl = signData.uploadUrl || signData.url || signData.uploadUrl;
            const contentId = signData.contentId ?? signData.content_id ?? null;

            // Step 2: Upload file directly to S3 using the signed URL
            const uploadResponse = await fetch(uploadUrl, {
                method: 'PUT',
                headers: { 'Content-Type': file.type },
                body: file,
            });

            if (!uploadResponse.ok) {
                throw new Error('Failed to upload file to S3');
            }

            // Step 3: Add photo to list (in production, save to your DB)
            const publicUrl = `${uploadUrl.split('?')[0]}`;

            const newPhoto: UploadedPhoto = {
                key: undefined,
                contentId: contentId,
                url: publicUrl,
                filename: file.name,
                size: file.size,
                uploadedAt: new Date().toLocaleString(),
                coordinates: lat && lon ? {
                    latitude: lat,
                    longitude: lon
                } : null,
            };

            setPhotos([newPhoto, ...photos]);

            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }

        } catch (err) {
            const message = err instanceof Error ? err.message : 'Upload failed';
            setError(message);
            // eslint-disable-next-line no-console
            console.error('Upload error:', err);
        } finally {
            setUploading(false);
        }
    };

    const CreateCard = ({ photos, uploading, onAddPhoto }: { photos: UploadedPhoto[]; uploading: boolean; onAddPhoto: () => void }) => {
        const [title, setTitle] = useState('');
        const [creating, setCreating] = useState(false);
        const [localError, setLocalError] = useState<string | null>(null);

        const disabled = creating || uploading || photos.length === 0 || title.trim() === '';

        return (
            <div className="mt-4 p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-md">
                <div className="flex items-center gap-3">
                    <button
                        onClick={onAddPhoto}
                        type="button"
                        className="px-3 py-2 border rounded-md text-sm bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                    >
                        Add Photo
                    </button>
                    <input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Post title"
                        className="flex-1 rounded-md border border-zinc-200 dark:border-zinc-700 px-3 py-2 bg-white dark:bg-zinc-800 text-sm"
                    />
                    <button
                        disabled={disabled}
                        onClick={async () => {
                            setLocalError(null);
                            if (photos.length === 0) return setLocalError('No uploaded photo');
                            const first = photos[0];
                            if (!first.contentId) return setLocalError('Uploaded photo missing content id');
                            setCreating(true);
                            try {
                                await createPost({ title: title.trim(), contentId: first.contentId });
                                // const res = await fetch('/api/posts', {
                                //     method: 'POST',
                                //     headers: { 'Content-Type': 'application/json' },
                                //     body: JSON.stringify({ title: title.trim(), contentId: first.contentId }),
                                // });
                                // if (!res.ok) {
                                //     const data = await res.json().catch(() => ({}));
                                //     throw new Error(data?.error || 'Failed to create post');
                                // }
                                window.location.reload();
                            } catch (err) {
                                setLocalError(err instanceof Error ? err.message : 'Create post failed');
                            } finally {
                                setCreating(false);
                            }
                        }}
                        className={`px-4 py-2 rounded-md text-sm text-white ${disabled ? 'bg-zinc-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
                    >
                        {creating ? 'Creating...' : 'Create Post'}
                    </button>
                </div>
                {localError && <p className="text-sm text-red-600 mt-2">{localError}</p>}
            </div>
        );
    };

    const MapPreview = ({ coordinates }: { coordinates: UploadedPhoto['coordinates'] }) => {
        if (!coordinates) return null;
        const { latitude, longitude } = coordinates;
        const src = `https://www.google.com/maps?q=${latitude},${longitude}&z=15&output=embed`;
        return (
            <div className="mt-2 rounded overflow-hidden border border-zinc-200 dark:border-zinc-700">
                <iframe
                    title={`map-${latitude}-${longitude}`}
                    src={src}
                    width="100%"
                    height={180}
                    loading="lazy"
                    className="block"
                />
            </div>
        );
    };

    return (
        <div className="w-full max-w-4xl mx-auto">
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                disabled={uploading}
                className="hidden"
            />
            <div className="mb-4">
                {error && (
                    <div className="mt-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                        <p className="text-sm font-medium text-red-800 dark:text-red-200">{error}</p>
                    </div>
                )}
            </div>

            {(
                <div>
                    {showCreate && (
                        <CreateCard photos={photos} uploading={uploading} onAddPhoto={() => fileInputRef.current?.click()} />
                    )}
                    <div className="space-y-2">
                        {photos.map((photo, idx) => (
                            <div key={idx} className="space-y-2">
                                <div className="flex items-center justify-between p-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700/50 transition">
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                        <svg
                                            className="w-5 h-5 text-blue-500 flex-shrink-0"
                                            fill="currentColor"
                                        >
                                            <path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" />
                                        </svg>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50 truncate">
                                                {photo.filename}
                                            </p>
                                            <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                                {(photo.size / 1024).toFixed(2)} KB • {photo.coordinates ? `Lat: ${photo.coordinates.latitude.toFixed(4)}, Lon: ${photo.coordinates.longitude.toFixed(4)}` : 'No GPS data'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 flex-shrink-0 ml-2">
                                        <Link
                                            href={photo.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="px-3 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition"
                                        >
                                            View
                                        </Link>
                                        <button
                                            onClick={() => {
                                                setPhotos(photos.filter((_, i) => i !== idx));
                                            }}
                                            className="px-3 py-1 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                </div>

                                {photo.coordinates && (
                                    <div className="">
                                        <MapPreview coordinates={photo.coordinates} />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
