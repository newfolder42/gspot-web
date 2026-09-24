import { Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { shareLink } from '@/lib/share';
import { useTheme } from '@/constants/colors';

type Props = {
  /** App/web path of the shared page, e.g. `/zone/tbilisi`. */
  path: string;
  title?: string;
  size?: number;
  color?: string;
  className?: string;
};

export function ShareButton({ path, title, size = 16, color, className = '' }: Props) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={() => shareLink({ path, title })}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel="გაზიარება"
      className={className}
    >
      <Feather name="share-2" size={size} color={color ?? theme.icon} />
    </Pressable>
  );
}
