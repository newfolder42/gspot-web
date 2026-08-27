import { RemoteImage } from '@/components/ui/RemoteImage';

/**
 * Mirrors web RewardIcon: renders nothing when the definition has no icon.
 * The catalog stores its icons as SVG (…/reactions/love.svg), which RemoteImage
 * paints through react-native-svg — <Image> has no SVG decoder.
 */
export function RewardIcon({ iconUrl, size = 16 }: { iconUrl: string | null; size?: number }) {
  if (!iconUrl) return null;
  return <RemoteImage uri={iconUrl} style={{ width: size, height: size }} resizeMode="contain" />;
}
