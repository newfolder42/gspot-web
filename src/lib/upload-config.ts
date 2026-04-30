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

/** JPEG / WebP output quality (0–1) */
export const UPLOAD_QUALITY = {
  PROFILE_JPEG: 0.92,
  POST_WEBP:    0.86,
} as const;

/** browser-image-compression settings for post photos */
export const POST_PHOTO_COMPRESSION = {
  maxSizeMB:        1.5,
  maxWidthOrHeight: 1920,
} as const;
