import type { RewardSpec, RewardDefinition } from '@/types/reward';
import { ProgressIcon } from '@/components/icons';
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

function TileFrame({ size, children }: { size: RewardTileSize; children: React.ReactNode }) {
  return (
    <div className={`${FRAME_SIZE[size]} shrink-0 rounded border-2 border-zinc-400 dark:border-zinc-600 bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center overflow-hidden`}>
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
      <TileFrame size={size}>
        <ProgressIcon className={ICON_SIZE[size]} />
      </TileFrame>
      <TileLabel size={size}>{xp}</TileLabel>
    </div>
  );
}

export function CatalogRewardTile({ definition, size = 'md' }: { definition: RewardDefinition; size?: RewardTileSize }) {
  return (
    <div className="flex flex-col items-center gap-1 w-16">
      <TileFrame size={size}>
        <RewardIcon iconUrl={definition.iconUrl} name={definition.name} className={ICON_SIZE[size]} />
      </TileFrame>
      <TileLabel size={size}>{definition.name}</TileLabel>
    </div>
  );
}

export function RewardSpecTiles({
  rewards,
  definitions,
  size = 'md',
}: {
  rewards: RewardSpec[];
  definitions: RewardDefinition[];
  size?: RewardTileSize;
}) {
  if (rewards.length === 0) return null;

  return (
    <div className="flex flex-wrap items-start">
      {rewards.map((reward) => {
        if (reward.type === 'user-xp') {
          return <XpRewardTile key="user-xp" xp={reward.value} size={size} />;
        }
        const definition = definitions.find((d) => d.key === reward.key);
        if (!definition) return null;
        return <CatalogRewardTile key={reward.key} definition={definition} size={size} />;
      })}
    </div>
  );
}
