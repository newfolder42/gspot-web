import { useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export type UserStreakInfo = {
  current: number;
  longest: number;
  activeToday: boolean;
};

/**
 * Mirrors web StreakBadge — flame chip, lit (orange) when the user has been
 * active today. Tapping shows the detail the web tooltip carries on hover.
 */
export function StreakBadge({ streak }: { streak: UserStreakInfo }) {
  const [open, setOpen] = useState(false);
  const lit = streak.activeToday;

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        className="flex-row items-center gap-1 px-2.5 py-1.5 rounded-full border"
        style={{
          borderColor: lit ? 'rgba(249,115,22,0.4)' : '#3F3F46',
          backgroundColor: lit ? 'rgba(249,115,22,0.1)' : 'rgba(113,113,122,0.12)',
        }}
      >
        <MaterialCommunityIcons name="fire" size={15} color={lit ? '#FB923C' : '#A1A1AA'} />
        <Text className="text-sm font-semibold" style={{ color: lit ? '#FB923C' : '#A1A1AA' }}>
          {streak.current}
        </Text>
      </Pressable>

      <Modal transparent animationType="fade" visible={open} onRequestClose={() => setOpen(false)}>
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}
          className="items-center justify-center px-10"
          onPress={() => setOpen(false)}
        >
          <View className="w-full rounded-2xl bg-zinc-900 px-4 py-3">
            <Text className="text-sm font-semibold text-white">უწყვეტობა: {streak.current} დღე</Text>
            <Text className="mt-1 text-xs text-zinc-400">რეკორდი: {streak.longest} დღე</Text>
            <Text className="mt-1 text-xs text-zinc-400">
              {lit
                ? 'დღეს უკვე აქტიური ხარ 🔥'
                : 'დაპოსტე, გამოიცანი, შეასრულე მისია ან მოიწონე სხვისი ნამუშევარი'}
            </Text>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}
