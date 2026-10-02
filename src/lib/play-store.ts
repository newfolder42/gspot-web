import { PLAY_STORE_URL } from "@/types/constants";

/**
 * Play Store link tagged with an install referrer, so Play Console shows
 * which web placement an install came from (Acquisition → UTM campaigns).
 */
export function playStoreUrl(campaign: string): string {
  const referrer = `utm_source=gspot_web&utm_medium=web&utm_campaign=${campaign}`;
  return `${PLAY_STORE_URL}&referrer=${encodeURIComponent(referrer)}`;
}
