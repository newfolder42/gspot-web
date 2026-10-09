import { Text, View } from 'react-native';

/**
 * The zone's upload rules — what a correct location means in this zone. The same rules are
 * shown when a photo is submitted; here they are what a guesser, a reviewer and the author
 * measure a contested location against.
 */
export function ZoneRulesList({ rules, title = 'ზონის წესები' }: { rules: string[]; title?: string }) {
  if (rules.length === 0) return null;

  return (
    <View className="rounded-lg bg-zinc-100 dark:bg-zinc-800/70 px-3 py-2.5">
      <Text className="text-xs font-semibold text-zinc-700 dark:text-zinc-200 mb-1">{title}</Text>
      {rules.map((rule, idx) => (
        <View key={idx} className="flex-row gap-1.5 mt-0.5">
          <Text className="text-xs text-zinc-500 dark:text-zinc-400">•</Text>
          <Text className="flex-1 text-xs leading-4 text-zinc-600 dark:text-zinc-300">{rule}</Text>
        </View>
      ))}
    </View>
  );
}
