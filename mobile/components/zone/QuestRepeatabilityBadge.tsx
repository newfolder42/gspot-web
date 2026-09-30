import { Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/constants/colors';
import { QUEST_REPEATABILITY_LABELS } from '@/types/quest';
import type { QuestRepeatability } from '@/types/quest';

// Tells players a quest can be taken again; one-time quests render nothing.
export function QuestRepeatabilityBadge({ repeatability }: { repeatability: QuestRepeatability | undefined }) {
  const theme = useTheme();
  const label = repeatability ? QUEST_REPEATABILITY_LABELS[repeatability] : null;
  if (!label) return null;

  return (
    <View className="flex-row items-center gap-1 rounded-full px-1.5 py-0.5 bg-violet-100 dark:bg-violet-950/50">
      <Feather name="repeat" size={10} color={theme.scheme === 'dark' ? '#c4b5fd' : '#6d28d9'} />
      <Text className="text-xs font-medium text-violet-700 dark:text-violet-300">{label}</Text>
    </View>
  );
}
