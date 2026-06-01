import { Image, Text, View } from 'react-native';
import { getProfileColor } from '@/lib/profileColors';

type Props = {
  name: string;
  photoUrl?: string | null;
  /** Side length in pixels, default 24. */
  size?: number;
  /** Border radius: 'md' = 6, 'full' = 999. Default 'md'. */
  shape?: 'md' | 'full';
  initialsClassName?: string;
};

/**
 * Mirrors web ProfileAvatar: photo if available, else coloured initials square.
 * Size matches web default of w-6 h-6 (24 px) for feed/post contexts.
 */
export function ProfileAvatar({ name, photoUrl, size = 24, shape = 'md', initialsClassName }: Props) {
  const radius = shape === 'full' ? size / 2 : 6;
  const initials = (name || '?').slice(0, 2).toUpperCase();
  const bg = getProfileColor(name);

  if (photoUrl) {
    return (
      <Image
        source={{ uri: photoUrl }}
        style={{ width: size, height: size, borderRadius: radius }}
        resizeMode="cover"
      />
    );
  }

  return (
    <View
      style={{ width: size, height: size, borderRadius: radius, backgroundColor: bg }}
      className="items-center justify-center flex-shrink-0"
    >
      <Text
        className={initialsClassName ?? 'text-[8px] font-bold text-white'}
      >
        {initials}
      </Text>
    </View>
  );
}
