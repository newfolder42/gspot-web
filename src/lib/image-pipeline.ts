import sharp from 'sharp';
import { getObjectBuffer, putObject } from './s3';
import { logerror } from './logger';

export type ImageVariants = {
  thumb: string;
  feed: string;
};

export type ProcessedPhoto = {
  /** URL to store as the content's display image — the bare master key (high-detail `full`). */
  displayUrl: string;
  variants: ImageVariants;
};

/**
 * Smaller WebP variants generated server-side by downscaling the uploaded master.
 * `full` is NOT in this list — it stays the bare master key (the uploaded high-quality WebP),
 * unrenamed and un-re-encoded, so the highest-detail image keeps its single client-side encode.
 * These named variants mainly serve the native app, which loads S3 URLs directly (web goes
 * through next/image, which downscales the source per `sizes`).
 */
const SMALL_VARIANTS = {
  feed:  { width: 1280, quality: 80 },
  thumb: { width: 400,  quality: 72 },
} as const;

/**
 * Generate WebP derivatives for a just-uploaded master. The master keeps its bare key
 * (`gps-photo/<uuid>`); only `feed`/`thumb` get named keys (`gps-photo/<uuid>/<name>.webp`).
 * Returns the `feed`/`thumb` variant URLs plus `displayUrl` (the untouched master, used as
 * public_url), or `null` if processing failed — callers must fall back to the original URL so an
 * upload is never blocked.
 */
export async function processGpsPhoto(publicUrl: string): Promise<ProcessedPhoto | null> {
  try {
    const base = publicUrl.split('?')[0];               // .../gps-photo/<uuid>
    const key = new URL(base).pathname.replace(/^\//, ''); // gps-photo/<uuid>

    const source = await getObjectBuffer(key);

    // Only the downscaled variants are generated; the full-detail image is the bare master key
    // itself (= displayUrl / public_url), so there is no `full` entry to store.
    const variants: ImageVariants = { feed: '', thumb: '' };

    for (const [name, cfg] of Object.entries(SMALL_VARIANTS)) {
      const out = await sharp(source, { failOn: 'none' })
        .rotate() // bake EXIF orientation; default strips all other metadata
        .resize(cfg.width, cfg.width, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: cfg.quality })
        .toBuffer();

      await putObject(`${key}/${name}.webp`, out, 'image/webp');
      variants[name as 'feed' | 'thumb'] = `${base}/${name}.webp`;
    }

    return { displayUrl: base, variants };
  } catch (err) {
    await logerror('processGpsPhoto error', [err, publicUrl]);
    return null;
  }
}
