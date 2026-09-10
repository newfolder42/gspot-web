import type { RewardSpec, RewardDefinition } from '@/types/reward';
import type { ItemDefinition } from '@/types/item';
import { itemQualityColor } from '@/types/item';
import { GiftIcon, ProgressIcon } from '@/components/icons';
import ItemIcon from '@/components/inventory/item-icon';
import RewardIcon from './reward-icons';

export type RewardTileSize = 'sm' | 'md';

const FRAME_SIZE: Record<RewardTileSize, string> = {
  sm: 'w-9 h-9',
  md: 'w-12 h-12',
};

const ICON_SIZE: Record<RewardTileSize, string> = {
  sm: 'w-5 h-5',
  md: 'w-8 h-8',
};

const LABEL_SIZE: Record<RewardTileSize, string> = {
  sm: 'text-[10px]',
  md: 'text-xs',
};

/** Border treatment per reward kind, so the tiles read apart at a glance. */
const FRAME_BORDER = {
  /** XP and reward-limit: nothing you keep in hand, so an open dashed frame. */
  dashed: 'border-2 border-zinc-400 dark:border-zinc-600',
  /** Catalog reward: a gift-like double frame in the ჯილდო amber. */
  gift: 'border-[3px] border-double border-amber-500 dark:border-amber-400',
} as const;

type TileFrameVariant = keyof typeof FRAME_BORDER;

function TileFrame({
  size,
  variant,
  children,
}: {
  size: RewardTileSize;
  variant: TileFrameVariant;
  children: React.ReactNode;
}) {
  return (
    <div className={`${FRAME_SIZE[size]} shrink-0 rounded ${FRAME_BORDER[variant]} bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center overflow-hidden`}>
      {children}
    </div>
  );
}

function TileLabel({ size, children }: { size: RewardTileSize; children: React.ReactNode }) {
  return (
    <span className={`${LABEL_SIZE[size]} text-center text-zinc-700 dark:text-zinc-300 leading-tight`}>
      {children}
    </span>
  );
}

export function XpRewardTile({ xp, size = 'md' }: { xp: number; size?: RewardTileSize }) {
  return (
    <div className="flex flex-col items-center gap-1 w-16">
      <TileFrame size={size} variant="dashed">
        <ProgressIcon className={ICON_SIZE[size]} />
      </TileFrame>
      <TileLabel size={size}>{xp}</TileLabel>
    </div>
  );
}

export function RewardLimitTile({ value, size = 'md' }: { value: number; size?: RewardTileSize }) {
  return (
    <div className="flex flex-col items-center gap-1 w-16">
      <TileFrame size={size} variant="dashed">
        <GiftIcon className={ICON_SIZE[size]} />
      </TileFrame>
      <TileLabel size={size}>+{value}</TileLabel>
    </div>
  );
}

export function CatalogRewardTile({ definition, size = 'md' }: { definition: RewardDefinition; size?: RewardTileSize }) {
  return (
    <div className="flex flex-col items-center gap-1 w-16">
      <TileFrame size={size} variant="gift">
        <RewardIcon iconUrl={definition.iconUrl} name={definition.name} className={ICON_SIZE[size]} />
      </TileFrame>
      <TileLabel size={size}>{definition.name}</TileLabel>
    </div>
  );
}

/** An ინვენტარი item promised by a quest or achievement, framed in its quality colour. */
export function ItemRewardTile({ item, size = 'md' }: { item: ItemDefinition; size?: RewardTileSize }) {
  return (
    <div className="flex flex-col items-center gap-1 w-16">
      <div
        className={`${FRAME_SIZE[size]} shrink-0 rounded bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center overflow-hidden`}
        style={{ border: `2px solid ${itemQualityColor(item.quality)}` }}
      >
        <ItemIcon iconUrl={item.iconUrl} name={item.name} className={ICON_SIZE[size]} />
      </div>
      <TileLabel size={size}>{item.name}</TileLabel>
    </div>
  );
}

export function RewardSpecTiles({
  rewards,
  definitions,
  itemDefinitions = [],
  size = 'md',
}: {
  rewards: RewardSpec[];
  definitions: RewardDefinition[];
  itemDefinitions?: ItemDefinition[];
  size?: RewardTileSize;
}) {
  if (rewards.length === 0) return null;

  return (
    <div className="flex flex-wrap items-start">
      {rewards.map((reward) => {
        if (reward.type === 'user-xp') {
          return <XpRewardTile key="user-xp" xp={reward.value} size={size} />;
        }
        if (reward.type === 'reward-limit') {
          return <RewardLimitTile key="reward-limit" value={reward.value} size={size} />;
        }
        if (reward.type === 'item') {
          const item = itemDefinitions.find((i) => i.alias === reward.alias);
          if (!item) return null;
          return <ItemRewardTile key={`item-${item.alias}`} item={item} size={size} />;
        }
        const definition = definitions.find((d) => d.key === reward.key);
        if (!definition) return null;
        return <CatalogRewardTile key={reward.key} definition={definition} size={size} />;
      })}
    </div>
  );
}
