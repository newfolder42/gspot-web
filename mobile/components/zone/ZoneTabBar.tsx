import { Pressable, ScrollView, Text, View } from 'react-native';

export type ZoneTabId = 'feed' | 'leaderboard' | 'quests' | 'manage';

export function ZoneTabBar({
  tabs,
  tab,
  onChange,
}: {
  tabs: { id: ZoneTabId; label: string }[];
  tab: ZoneTabId;
  onChange: (id: ZoneTabId) => void;
}) {
  return (
    <View className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 10 }}
      >
        {tabs.map((t) => {
          const active = t.id === tab;
          return (
            <Pressable
              key={t.id}
              onPress={() => onChange(t.id)}
              className={`px-4 py-1.5 rounded-full border ${
                active ? 'bg-teal-600 border-teal-600' : 'bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700'
              }`}
            >
              <Text className={`text-sm font-medium ${active ? 'text-white' : 'text-zinc-700 dark:text-zinc-300'}`}>
                {t.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
