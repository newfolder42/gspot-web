import { Text, View } from 'react-native';
import { ScreenLayout } from '@/components/ui/ScreenLayout';

/**
 * Home feed — intentionally empty for the initial release.
 * Content will be added once the feed API endpoints are ready.
 */
export default function HomeScreen() {
  return (
    <ScreenLayout>
      <View className="flex-1 items-center justify-center px-8">
        <Text className="text-5xl mb-4">📍</Text>
        <Text className="text-xl font-bold text-zinc-900 dark:text-zinc-50 text-center mb-2">
          Coming soon
        </Text>
        <Text className="text-zinc-500 dark:text-zinc-400 text-sm text-center leading-5">
          The feed is on its way. Stay tuned!
        </Text>
      </View>
    </ScreenLayout>
  );
}
