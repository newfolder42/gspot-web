import { View } from 'react-native';
import { RemoteImage } from '@/components/ui/RemoteImage';
import { useTheme } from '@/constants/colors';
import { BackpackIcon } from './BackpackIcon';

/**
 * An item's artwork. Item icons may be SVG or PNG, so this goes through RemoteImage
 * (which paints SVG via react-native-svg). Falls back to the bag glyph when the catalog
 * row has no icon yet, so a slot never renders empty.
 */
export function ItemIcon({ iconUrl, size = 40 }: { iconUrl: string | null; size?: number }) {
  const theme = useTheme();

  if (!iconUrl) {
    return (
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <BackpackIcon size={Math.round(size * 0.6)} color={theme.iconFaint} />
      </View>
    );
  }

  return <RemoteImage uri={iconUrl} style={{ width: size, height: size }} resizeMode="contain" />;
}
