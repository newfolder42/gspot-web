import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

/**
 * On-device image normalization for uploads, mirroring the web pipeline
 * (src/lib/image.ts + src/lib/upload-config.ts):
 *   • post / quest masters → longest edge ≤ 4096px, JPEG q0.90
 *   • profile photo        → fixed 512×512 square, JPEG q0.92
 *
 * JPEG everywhere (not WebP) because expo-image-manipulator cannot encode WebP on iOS.
 * That format gap is invisible in practice: the server still generates WebP feed/thumb
 * variants for post/quest, and a 512² profile JPEG is indistinguishable from WebP at
 * avatar size. Forcing a re-encode also normalizes iOS HEIC originals to JPEG.
 */

const POST_MAX_EDGE = 4096;
const POST_QUALITY = 0.9;
const PROFILE_SIZE = 512;
const PROFILE_QUALITY = 0.92;

export type ProcessedImage = {
  uri: string;
  name: string;
  type: 'image/jpeg';
  size: number;
};

/** Read a local file's byte length via blob (RN supports fetching file:// URIs). */
async function byteSize(uri: string): Promise<number> {
  try {
    const blob = await fetch(uri).then((r) => r.blob());
    return blob.size;
  } catch {
    return 0;
  }
}

function jpegName(name: string | undefined, fallback: string): string {
  const base = (name ?? fallback).replace(/\.[^.]+$/, '');
  return `${base}.jpg`;
}

/**
 * Downscale a post/quest capture so its longest edge is ≤ 4096px and re-encode as JPEG q0.90.
 * Pass the source dimensions from the picker asset to avoid an extra decode; when they're
 * missing the image is re-encoded at its original size (still normalizing the format).
 */
export async function processPostPhoto(
  uri: string,
  srcWidth?: number,
  srcHeight?: number,
  name?: string,
): Promise<ProcessedImage> {
  const context = ImageManipulator.manipulate(uri);

  if (
    typeof srcWidth === 'number' && typeof srcHeight === 'number' &&
    isFinite(srcWidth) && isFinite(srcHeight) &&
    Math.max(srcWidth, srcHeight) > POST_MAX_EDGE
  ) {
    if (srcWidth >= srcHeight) context.resize({ width: POST_MAX_EDGE });
    else context.resize({ height: POST_MAX_EDGE });
  }

  const ref = await context.renderAsync();
  const result = await ref.saveAsync({ compress: POST_QUALITY, format: SaveFormat.JPEG });

  return {
    uri: result.uri,
    name: jpegName(name, `upload-${Date.now()}`),
    type: 'image/jpeg',
    size: await byteSize(result.uri),
  };
}

/**
 * Resize an already square-cropped avatar (expo-image-picker `aspect: [1, 1]`) to a
 * fixed 512×512 and re-encode as JPEG q0.92, matching the web crop output.
 */
export async function processProfilePhoto(uri: string, name?: string): Promise<ProcessedImage> {
  const ref = await ImageManipulator.manipulate(uri)
    .resize({ width: PROFILE_SIZE, height: PROFILE_SIZE })
    .renderAsync();
  const result = await ref.saveAsync({ compress: PROFILE_QUALITY, format: SaveFormat.JPEG });

  return {
    uri: result.uri,
    name: jpegName(name, `avatar-${Date.now()}`),
    type: 'image/jpeg',
    size: await byteSize(result.uri),
  };
}
