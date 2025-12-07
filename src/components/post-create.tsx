"use client"

import { useState, useRef } from 'react';
import Link from 'next/link';
import { createPost } from '@/lib/posts';
import { storeContent } from '@/lib/content';
import { generateFileUrl } from '@/lib/s3';
import { convertToWebP, extractGPSCorrdinates } from '@/lib/image';

interface UploadedPhoto {
    key?: string;
    contentId?: number;
    url: string;
    filename: string;
    size: number;
    uploadedAt: string;
    coordinates?: {
        latitude: number | null;
        longitude: number | null;
    } | null;
}

type PhotoUploadProps = {
    showCreate?: boolean;
};

export default function CreatePost({ showCreate }: PhotoUploadProps = {}) {
    const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
            setError('ხმოლოდ PNG, JPEG, და WebP ფოტო-სურათებია ნებადართული');
            return;
        }

        if (file.size > 15 * 1024 * 1024) {
            setError('ფაილის ზომა არ უნდა აღემატებოდეს 15 მბს');
            return;
        }
        const coordinates = await extractGPSCorrdinates(file);

        if (coordinates == null || coordinates.latitude == null || coordinates.longitude == null) {
            setError('სურათზე არ მოიძებნა GPS თაგები.');
            return;
        }

        let processedFile = file;

        if (file.type === 'image/png' || file.type === 'image/jpeg') {
            setUploading(true);

            try {
                processedFile = await convertToWebP(file);
            } catch (conversionErr) {
                setError('ვერ მოხერხდა სურათის WebP ფორმატში გარდაქმნა');
                return;
            }
        }

        console.log('original size:', file.size, 'processed size:', processedFile.size);

        setError(null);
        setUploading(true);
        setUploadProgress(0);

        try {
            const signUrl = await generateFileUrl('gps-photo');

            await new Promise<void>((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                xhr.open('PUT', signUrl, true);
                xhr.setRequestHeader('Content-Type', processedFile.type);
                xhr.upload.onprogress = (event) => {
                    if (event.lengthComputable) {
                        setUploadProgress(Math.round((event.loaded / event.total) * 100));
                    }
                };
                xhr.onload = async (e) => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        const uploadUrl = signUrl.split('?')[0];
                        try {
                            const content = await storeContent(
                                uploadUrl,
                                'gps-photo',
                                {
                                    originalFileName: processedFile.name,
                                    fileSize: processedFile.size,
                                    coordinates: coordinates
                                }
                            );
                            if (content == null) {
                                throw new Error('ვერ მოხერხდა ფოტო-სურათის ატვირთვა');
                            }
                            const newPhoto: UploadedPhoto = {
                                key: undefined,
                                contentId: content.id,
                                url: `${uploadUrl}`,
                                filename: processedFile.name,
                                size: processedFile.size,
                                uploadedAt: new Date().toLocaleString(),
                                coordinates: coordinates,
                            };
                            setPhotos([newPhoto, ...photos]);
                            if (fileInputRef.current) {
                                fileInputRef.current.value = '';
                            }
                            resolve();
                        } catch (err) {
                            reject(err);
                        }
                    } else {
                        reject(new Error('Failed to upload file to S3'));
                    }
                };
                xhr.onerror = (err) => reject(new Error('' + err));
                xhr.send(processedFile);
            });
        } catch (err) {
            const message = err instanceof Error ? err.message : 'ვერ მოხერხდა ფოტო-სურათის ატვირთვა';
            setError(message);
            console.error('Upload error:', err);
        } finally {
            setUploading(false);
            setUploadProgress(null);
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
                        <svg
                            className="w-5 h-5 text-blue-500 flex-shrink-0"
                            fill="currentColor"
                        >
                            <path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" />
                        </svg>
                    </button>
                    <input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="სათაური"
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
                                window.location.reload();
                            } catch (err) {
                                setLocalError(err instanceof Error ? err.message : 'ვერ მოხერხდა ფოტო-სურათის ატვირთვა');
                            } finally {
                                setCreating(false);
                            }
                        }}
                        className={`px-4 py-2 rounded-md text-sm text-white ${disabled ? 'bg-zinc-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
                    >
                        {creating ? 'მიმდინარეობს...' : 'ატვირთვა'}
                    </button>
                </div>
                {localError && <p className="text-sm text-red-600 mt-2">{localError}</p>}
            </div>
        );
    };

    const MapPreview = ({ coordinates }: { coordinates: UploadedPhoto['coordinates'] }) => {
        if (!coordinates) return null;
        const { latitude, longitude } = coordinates;
        const src = `https://www.google.com/maps?q=${latitude},${longitude}&z=18&output=embed&&maptype=satellite&hl=ka`;
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
                capture="environment"
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
                {uploading && uploadProgress !== null && (
                    <div className="mt-2 w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-3 overflow-hidden">
                        <div
                            className="bg-blue-500 h-3 rounded-full transition-all duration-200"
                            style={{ width: `${uploadProgress}%` }}
                        />
                        <div className="text-xs text-center mt-1 text-zinc-600 dark:text-zinc-300">ატვირთვა: {uploadProgress}%</div>
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
                                                {(photo.size / 1024).toFixed(2)} კბ • {photo.coordinates ? `განედი: ${photo.coordinates.latitude?.toFixed(4)}, გრძედი: ${photo.coordinates.longitude?.toFixed(4)}` : 'No GPS data'}
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
                                            ნახვა
                                        </Link>
                                        <button
                                            onClick={() => {
                                                setPhotos(photos.filter((_, i) => i !== idx));
                                            }}
                                            className="px-3 py-1 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition"
                                        >
                                            წაშლა
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
