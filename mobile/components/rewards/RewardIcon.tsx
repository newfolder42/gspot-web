import { Image } from 'react-native';

/** Mirrors web RewardIcon: renders nothing when the definition has no icon. */
export function RewardIcon({ iconUrl, size = 16 }: { iconUrl: string | null; size?: number }) {
  if (!iconUrl) return null;
  return <Image source={{ uri: iconUrl }} style={{ width: size, height: size }} resizeMode="contain" />;
}
