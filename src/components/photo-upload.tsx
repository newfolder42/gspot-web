'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import exifr from 'exifr';

interface UploadedPhoto {
    key: string;
    url: string;
    filename: string;
    size: number;
    uploadedAt: string;
}

export default function PhotoUpload() {
    const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!['image/png', 'image/jpeg', 'image/gif', 'image/webp'].includes(file.type)) {
            setError('Only PNG, JPEG, GIF, and WebP images are allowed');
            return;
        }

        // Validate file size (5MB max)
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
        setSuccess(null);
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
                    size: file.size,
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

            const { url, key } = await signUrlResponse.json();

            // Step 2: Upload file directly to S3 using the signed URL
            const uploadResponse = await fetch(url, {
                method: 'PUT',
                headers: { 'Content-Type': file.type },
                body: file,
            });

            if (!uploadResponse.ok) {
                throw new Error('Failed to upload file to S3');
            }

            // Step 3: Add photo to list (in production, save to your DB)
            const newPhoto: UploadedPhoto = {
                key,
                url: `${url.split('?')[0]}`, // remove query params for display
                filename: file.name,
                size: file.size,
                uploadedAt: new Date().toLocaleString(),
            };

            setPhotos([newPhoto, ...photos]);
            setSuccess(`${file.name} uploaded successfully!`);

            // Reset input
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }

            setTimeout(() => setSuccess(null), 2000);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Upload failed';
            setError(message);
            // eslint-disable-next-line no-console
            console.error('Upload error:', err);
        } finally {
            setUploading(false);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.currentTarget.classList.add('drag-over');
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.currentTarget.classList.remove('drag-over');
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        e.currentTarget.classList.remove('drag-over');

        const file = e.dataTransfer.files?.[0];
        if (!file) return;

        // Simulate file input change
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        if (fileInputRef.current) {
            fileInputRef.current.files = dataTransfer.files;
            const event = new Event('change', { bubbles: true });
            fileInputRef.current.dispatchEvent(event);
        }
    };

    return (
        <div className="w-full max-w-4xl mx-auto py-8 px-4">
            {/* Upload Area */}
            <div className="mb-8">
                <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className="relative border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-lg p-8 transition hover:border-zinc-400 dark:hover:border-zinc-600 cursor-pointer bg-zinc-50 dark:bg-zinc-900/50 hover:bg-zinc-100 dark:hover:bg-zinc-800/50"
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        disabled={uploading}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />

                    <div className="text-center pointer-events-none">
                        <div className="mb-3">
                            <svg
                                className="mx-auto h-12 w-12 text-zinc-400 dark:text-zinc-500"
                                stroke="currentColor"
                                fill="none"
                                aria-hidden="true"
                            >
                                <path
                                    d="M28 8H12a4 4 0 00-4 4v20a4 4 0 004 4h24a4 4 0 004-4V20m-14-8l6-6m-6 6v12m0-12L16 8m12 8h12m-12-6v6m12 20l-6-6m0 12l-6 6m12-6v-6m-12 6h-12"
                                    strokeWidth={2}
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            </svg>
                        </div>
                        <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-1">
                            {uploading ? 'Uploading...' : 'Drop your photo here'}
                        </p>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">
                            {uploading ? 'Please wait...' : 'or click to select a file (max 5MB)'}
                        </p>
                    </div>

                    {uploading && (
                        <div className="absolute inset-0 rounded-lg bg-black/5 dark:bg-white/5 flex items-center justify-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-2 border-zinc-300 border-t-zinc-600 dark:border-zinc-700 dark:border-t-zinc-200"></div>
                        </div>
                    )}
                </div>

                {/* Messages */}
                {error && (
                    <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                        <p className="text-sm font-medium text-red-800 dark:text-red-200">{error}</p>
                    </div>
                )}

                {success && (
                    <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
                        <p className="text-sm font-medium text-green-800 dark:text-green-200">✓ {success}</p>
                    </div>
                )}
            </div>

            {/* Uploaded Photos List */}
            {photos.length > 0 && (
                <div>
                    <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
                        Uploaded Photos ({photos.length})
                    </h2>
                    <div className="space-y-3">
                        {photos.map((photo, idx) => (
                            <div
                                key={idx}
                                className="flex items-center justify-between p-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700/50 transition"
                            >
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
                                            {(photo.size / 1024).toFixed(2)} KB • {photo.uploadedAt}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-2 flex-shrink-0 ml-2">
                                    <a
                                        href={photo.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-3 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition"
                                    >

                                    </a>
                                    <button
                                        onClick={() => {
                                            setPhotos(photos.filter((_, i) => i !== idx));
                                            setSuccess(null);
                                        }}
                                        className="px-3 py-1 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition"
                                    >
                                        Remove
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {photos.length === 0 && !uploading && (
                <div className="text-center py-8">
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        No photos uploaded yet. Start by uploading one above!
                    </p>
                </div>
            )}
        </div>
    );
}
