import { Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { RewardIcon } from '@/components/rewards/RewardIcon';
import type { RewardDefinition, RewardSpec } from '@/types/reward';

/** Mirrors web src/components/rewards/reward-tile.tsx. */

// Mid zinc — readable on both the light and dark tile backgrounds, as in RewardButton.
const ICON_COLOR = '#71717A';

function TileFrame({ children }: { children: React.ReactNode }) {
  return (
    <View className="h-9 w-9 rounded border-2 border-zinc-400 dark:border-zinc-600 bg-zinc-100 dark:bg-zinc-800 items-center justify-center overflow-hidden">
      {children}
    </View>
  );
}

function Tile({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View className="w-16 items-center gap-1">
      <TileFrame>{children}</TileFrame>
      <Text className="text-[10px] text-center text-zinc-700 dark:text-zinc-300" numberOfLines={2}>
        {label}
      </Text>
    </View>
  );
}

export function RewardSpecTiles({
  rewards,
  definitions,
}: {
  rewards: RewardSpec[];
  definitions: RewardDefinition[];
}) {
  if (rewards.length === 0) return null;

  return (
    <View className="flex-row flex-wrap items-start">
      {rewards.map((reward) => {
        if (reward.type === 'user-xp') {
          return (
            <Tile key="user-xp" label={`${reward.value}`}>
              <Feather name="battery-charging" size={20} color={ICON_COLOR} />
            </Tile>
          );
        }
        // Daily reward-giving quota increase — same gift icon as the "ჯილდოს გაცემა" button.
        if (reward.type === 'reward-limit') {
          return (
            <Tile key="reward-limit" label={`+${reward.value}`}>
              <Feather name="gift" size={20} color={ICON_COLOR} />
            </Tile>
          );
        }
        const definition = definitions.find((d) => d.key === reward.key);
        if (!definition) return null;
        return (
          <Tile key={reward.key} label={definition.name}>
            <RewardIcon iconUrl={definition.iconUrl} size={20} />
          </Tile>
        );
      })}
    </View>
  );
}
