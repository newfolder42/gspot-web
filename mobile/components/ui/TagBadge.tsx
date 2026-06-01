import { Text, View } from 'react-native';

type Props = {
  name: string;
  color: string;
};

/** Matches web: solid bg, white text, rounded-full pill. */
export function TagBadge({ name, color }: Props) {
  return (
    <View
      className="self-start rounded-full px-2 py-0.5 mt-1"
      style={{ backgroundColor: color }}
    >
      <Text className="text-xs font-semibold text-white leading-tight">{name}</Text>
    </View>
  );
}
