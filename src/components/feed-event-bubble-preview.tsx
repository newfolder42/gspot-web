import Image from 'next/image';
import { FeedEventType } from '@/types/feed-event';
import { FlagIcon, TrophyIcon } from './icons';

export function BubblePreview({
  image,
  type,
  ring,
  label,
}: {
  image: string | null;
  type: FeedEventType;
  ring: string;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1 w-[72px] flex-shrink-0">
      <div className={`relative w-16 h-16 rounded-full p-[2px] ${ring}`}>
        <div className="w-full h-full rounded-full overflow-hidden bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
          {image ? (
            <Image src={image} alt={label} width={64} height={64} className="w-full h-full object-cover" />
          ) : type === 'quest_completed' || type === 'quest_created' ? (
            <FlagIcon className="w-6 h-6 text-amber-500" />
          ) : (
            <TrophyIcon className="w-6 h-6 text-amber-500" />
          )}
        </div>
      </div>
      <span className="text-[11px] text-zinc-600 dark:text-zinc-400 text-center leading-tight line-clamp-2 w-full">
        {label}
      </span>
    </div>
  );
}
