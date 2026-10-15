import { Text, View } from 'react-native';

export function ReadyStep({ alias, padding }: { alias: string; padding: number }) {
  return (
    <View className="flex-1 items-center justify-center" style={{ paddingHorizontal: padding }}>
      <Text className="text-3xl font-extrabold leading-10 text-center text-zinc-900 dark:text-zinc-50">
        <Text className="text-brand">&apos;{alias}</Text> ჯისპოტელო, შენ მზად ხარ!
      </Text>
    </View>
  );
}
