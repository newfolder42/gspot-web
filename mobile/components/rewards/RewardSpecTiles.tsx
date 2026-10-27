import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { RewardIcon } from '@/components/rewards/RewardIcon';
import { GiftIcon, ProgressIcon } from '@/components/rewards/RewardTileIcons';
import { ItemIcon } from '@/components/inventory/ItemIcon';
import { ItemDetailsModal } from '@/components/inventory/ItemDetailsModal';
import type { RewardDefinition, RewardSpec } from '@/types/reward';
import type { ItemDefinition } from '@/types/item';
import { itemQualityColor } from '@/types/item';
import { useTheme } from '@/constants/colors';

/** Mirrors web src/components/rewards/reward-tile.tsx. */

/**
 * Border treatment per reward kind, mirroring the web tiles:
 * 'dashed' for XP / reward-limit, 'gift' (an amber double ring) for a catalog
 * reward, and a solid quality-coloured frame for an ინვენტარი item.
 */
type TileVariant = 'dashed' | 'gift' | 'item';

const GIFT_BORDER = '#f59e0b';

function TileFrame({
  children,
  variant,
  color,
}: {
  children: React.ReactNode;
  variant: TileVariant;
  color?: string;
}) {
  // RN has no `border-style: double`, so a hairline outer ring stands in for it.
  // It wraps inside the same 36pt box, keeping every tile the same height.
  if (variant === 'gift') {
    return (
      <View
        className="h-9 w-9 rounded p-[2px] bg-zinc-100 dark:bg-zinc-800"
        style={{ borderWidth: 1, borderColor: GIFT_BORDER }}
      >
        <View
          className="flex-1 rounded-[2px] items-center justify-center overflow-hidden"
          style={{ borderWidth: 2, borderColor: GIFT_BORDER }}
        >
          {children}
        </View>
      </View>
    );
  }

  return (
    <View
      className={`h-9 w-9 rounded bg-zinc-100 dark:bg-zinc-800 items-center justify-center overflow-hidden ${
        variant === 'dashed' ? 'border-2 border-zinc-400 dark:border-zinc-600' : ''
      }`}
      style={
        variant === 'dashed' ? { borderStyle: 'dashed' } : { borderWidth: 2, borderColor: color }
      }
    >
      {children}
    </View>
  );
}

function Tile({
  label,
  variant,
  color,
  onPress,
  children,
}: {
  label: string;
  variant: TileVariant;
  color?: string;
  /** Makes the whole tile tappable; the label is never clamped, so a long name stays readable. */
  onPress?: () => void;
  children: React.ReactNode;
}) {
  const body = (
    <>
      <TileFrame variant={variant} color={color}>
        {children}
      </TileFrame>
      <Text className="text-[10px] text-center text-zinc-700 dark:text-zinc-300">{label}</Text>
    </>
  );

  if (!onPress) return <View className="w-16 items-center gap-1">{body}</View>;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} className="w-16 items-center gap-1">
      {body}
    </Pressable>
  );
}

export function RewardSpecTiles({
  rewards,
  definitions,
  itemDefinitions = [],
}: {
  rewards: RewardSpec[];
  definitions: RewardDefinition[];
  itemDefinitions?: ItemDefinition[];
}) {
  const ICON_COLOR = useTheme().icon;
  const [openItem, setOpenItem] = useState<ItemDefinition | null>(null);

  if (rewards.length === 0) return null;

  return (
    <View className="flex-row flex-wrap items-start">
      {openItem ? <ItemDetailsModal item={openItem} onClose={() => setOpenItem(null)} /> : null}
      {rewards.map((reward) => {
        if (reward.type === 'user-xp') {
          return (
            <Tile key="user-xp" label={`${reward.value}`} variant="dashed">
              <ProgressIcon size={20} color={ICON_COLOR} />
            </Tile>
          );
        }
        // Daily reward-giving quota increase — same gift icon as the "ჯილდოს გაცემა" button.
        if (reward.type === 'reward-limit') {
          return (
            <Tile key="reward-limit" label={`+${reward.value}`} variant="dashed">
              <GiftIcon size={20} color={ICON_COLOR} />
            </Tile>
          );
        }
        // An ინვენტარი item, framed in its quality colour like an inventory slot.
        if (reward.type === 'item') {
          const item = itemDefinitions.find((i) => i.alias === reward.alias);
          if (!item) return null;
          return (
            <Tile
              key={`item-${item.alias}`}
              label={item.name}
              variant="item"
              color={itemQualityColor(item.quality)}
              onPress={() => setOpenItem(item)}
            >
              <ItemIcon iconUrl={item.iconUrl} size={20} />
            </Tile>
          );
        }
        const definition = definitions.find((d) => d.key === reward.key);
        if (!definition) return null;
        return (
          <Tile key={reward.key} label={definition.name} variant="gift">
            <RewardIcon iconUrl={definition.iconUrl} size={20} />
          </Tile>
        );
      })}
    </View>
  );
}
