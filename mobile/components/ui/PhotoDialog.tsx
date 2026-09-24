import type { ReactNode } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/constants/colors';

export type PhotoSource = 'camera' | 'library';

type PhotoDialogProps = {
  title: string;
  onClose: () => void;
  children: ReactNode;
};

/**
 * Shared frame for photo upload dialogs: dimmed backdrop (tap to close), a card with a
 * titled header and close button, and a padded body.
 */
export function PhotoDialog({ title, onClose, children }: PhotoDialogProps) {
  const theme = useTheme();

  return (
    <Modal transparent animationType="fade" visible onRequestClose={onClose}>
      <Pressable
        style={{ flex: 1, backgroundColor: 'rgba(24,24,27,0.7)' }}
        className="items-center justify-center px-6"
        onPress={onClose}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          className="w-full max-w-sm rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 overflow-hidden"
        >
          <View className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 flex-row items-center justify-between">
            <Text className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{title}</Text>
            <Pressable onPress={onClose} hitSlop={8} className="p-1.5 rounded-md bg-zinc-100 dark:bg-zinc-800">
              <Feather name="x" size={15} color={theme.icon} />
            </Pressable>
          </View>

          <View className="px-4 py-5">{children}</View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

type PhotoSourceButtonsProps = {
  description: string;
  onPick: (source: PhotoSource) => void;
};

/** Description plus the camera (primary) and gallery (secondary) buttons. */
export function PhotoSourceButtons({ description, onPick }: PhotoSourceButtonsProps) {
  const theme = useTheme();

  return (
    <>
      <Text className="text-sm text-zinc-600 dark:text-zinc-400 text-center mb-4 leading-5">{description}</Text>
      <Pressable
        onPress={() => onPick('camera')}
        className="h-11 rounded-xl bg-teal-600 flex-row items-center justify-center gap-2 mb-2"
      >
        <Feather name="camera" size={16} color="#fff" />
        <Text className="text-sm font-semibold text-white">ფოტოს გადაღება</Text>
      </Pressable>
      <Pressable
        onPress={() => onPick('library')}
        className="h-11 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex-row items-center justify-center gap-2"
      >
        <Feather name="image" size={16} color={theme.icon} />
        <Text className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">გალერეიდან არჩევა</Text>
      </Pressable>
    </>
  );
}
