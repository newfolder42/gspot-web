import { Pressable, Text } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { PhotoDialog } from '@/components/ui/PhotoDialog';
import { useTheme } from '@/constants/colors';

export type PostOption = {
  key: string;
  label: string;
  icon: keyof typeof Feather.glyphMap;
  onPress: () => void;
  /** `amber` marks the location dispute, `danger` the destructive ones. */
  tone?: 'default' | 'amber' | 'danger';
};

const TONES = {
  default: { icon: null, text: 'text-zinc-700 dark:text-zinc-300' },
  amber: { icon: '#D97706', text: 'text-amber-700 dark:text-amber-300' },
  danger: { icon: '#E11D48', text: 'text-rose-600 dark:text-rose-400' },
} as const;

/**
 * The post's ⋯ menu: the same card dialog the upload screen uses, with one row per action.
 * The dialog closes first, then the action runs, so an action that opens its own sheet or a
 * confirmation does not stack on top of this one.
 */
export function PostOptionsDialog({ options, onClose }: { options: PostOption[]; onClose: () => void }) {
  const theme = useTheme();

  return (
    <PhotoDialog title="პოსტი" onClose={onClose}>
      {options.map((option, idx) => {
        const tone = TONES[option.tone ?? 'default'];
        return (
          <Pressable
            key={option.key}
            onPress={() => {
              onClose();
              option.onPress();
            }}
            className={`h-11 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex-row items-center justify-center gap-2 active:opacity-80 ${
              idx > 0 ? 'mt-2' : ''
            }`}
          >
            <Feather name={option.icon} size={16} color={tone.icon ?? theme.icon} />
            <Text className={`text-sm font-semibold ${tone.text}`}>{option.label}</Text>
          </Pressable>
        );
      })}
    </PhotoDialog>
  );
}
