import { Pressable, ScrollView, Text, View } from 'react-native';

export type ZoneTabId = 'feed' | 'leaderboard' | 'quests' | 'manage';

/** Underline tabs mirroring web `AccountTabs`: no background, teal bar under the active tab. */
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
    <View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16 }}
      >
        {tabs.map((t) => {
          const active = t.id === tab;
          return (
            <Pressable
              key={t.id}
              onPress={() => onChange(t.id)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              className="items-center px-1 py-3"
            >
              <Text
                className={`text-sm font-medium ${
                  active ? 'text-zinc-900 dark:text-zinc-50' : 'text-zinc-500 dark:text-zinc-400'
                }`}
              >
                {t.label}
              </Text>
              <View className={`mt-1 h-0.5 self-stretch rounded ${active ? 'bg-teal-600' : 'bg-transparent'}`} />
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
