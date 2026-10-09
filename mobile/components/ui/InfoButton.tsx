import { useState } from 'react';
import { Pressable, type StyleProp, type ViewStyle } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { InfoDialog } from '@/components/ui/InfoDialog';
import { getInfoTopic, type InfoTopicKey } from '@/constants/infoTopics';
import { useTheme } from '@/constants/colors';

type Props = {
  topic: InfoTopicKey;
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
};

/**
 * A (?) icon that opens the help text registered under `topic` in `constants/infoTopics`.
 * Opens on tap and keeps its own open state, so it works the same in a navigation header,
 * inline in a row, or inside another dialog.
 */
export function InfoButton({ topic, size = 18, color, style }: Props) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const info = getInfoTopic(topic);

  if (!info) return null;

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        hitSlop={10}
        style={style}
        accessibilityRole="button"
        accessibilityLabel={`${info.title}: დეტალები`}
      >
        <Feather name="help-circle" size={size} color={color ?? theme.icon} />
      </Pressable>
      {open ? <InfoDialog title={info.title} description={info.description} onClose={() => setOpen(false)} /> : null}
    </>
  );
}
