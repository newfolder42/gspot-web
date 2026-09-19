import { Image } from 'react-native';

/**
 * Warms React Native's image cache from a push payload.
 *
 * A notification that opens a post carries that post's small renditions
 * (`imageThumb`/`imageFeed`, added in gspot-services src/lib/push.ts). Fetching
 * them while the notification is still sitting in the tray means the detail
 * screen paints from cache on tap rather than starting a cold download with the
 * user already looking at it.
 *
 * This runs on delivery, which only reaches us while the app is alive — a push
 * that arrives to a killed app still opens cold, and that path is covered by
 * the thumb→feed staging in components/ui/ProgressiveImage.tsx instead.
 */
export function prefetchPushImages(data: unknown): void {
  const payload = data as Record<string, unknown> | null;
  if (!payload) return;

  // Thumb first: it is the layer that has to be there for the screen to look
  // loaded, and it is ~30 KB against the feed rendition's several hundred.
  prefetchImage(payload.imageThumb);
  prefetchImage(payload.imageFeed);
}

function prefetchImage(uri: unknown): void {
  if (typeof uri !== 'string' || !uri) return;
  // Offline, a 404, an expired URL — a cold load later is the only cost.
  Image.prefetch(uri).catch(() => {});
}
