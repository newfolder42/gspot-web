/** Accepted MIME types for image uploads across the app */
export const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const;

/** For use in <input accept="..."> */
export const ACCEPTED_IMAGE_ACCEPT = 'image/png,image/jpeg,image/webp';

/** Upload size limits in bytes */
export const UPLOAD_SIZE_LIMIT = {
  PROFILE_PHOTO:  5 * 1024 * 1024,  // 5 MB
  BANNER:         8 * 1024 * 1024,  // 8 MB
  POST_PHOTO:    15 * 1024 * 1024,  // 15 MB
} as const;

/** WebP output quality (0–1) */
export const UPLOAD_QUALITY = {
  PROFILE_WEBP: 0.92,
  POST_WEBP:    0.90,
} as const;

/**
 * browser-image-compression settings for post photos.
 *
 * This produces a high-quality ~4096px "master" that is uploaded to S3; the server
 * (see lib/image-pipeline.ts) then generates the responsive thumb/feed/full WebP variants.
 * Note: no `maxSizeMB` — its library default is Infinity, so resize + quality alone apply.
 * A hard byte ceiling would silently drop quality below POST_WEBP to hit the target.
 */
export const POST_PHOTO_COMPRESSION = {
  maxWidthOrHeight: 4096,
} as const;
