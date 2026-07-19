import Image from 'next/image';
import Link from 'next/link';
import { QuestCreatedDetails } from '@/types/feed-event';
import ProfileAvatar from './common/profileAvatar';
import { FlagIcon } from './icons';
import { Slide, SlideHeader } from './feed-event-slide-header';

export function QuestCreatedSlide({ event }: { event: Slide }) {
  const d = event.details as QuestCreatedDetails;

  return (
    <div>
      <SlideHeader
        event={event}
        icon={
          <ProfileAvatar
            name={d.characterName ?? 'quest'}
            photoUrl={d.characterAvatar}
            className="w-8 h-8 rounded-full"
            fallbackText=""
            initialsClassName="hidden"
            width={32}
            height={32}
          />
        }
      />
      <Link
        href={`/zone/${d.zoneSlug}/quests/${d.questId}`}
        className="block aspect-square flex flex-col items-center justify-center gap-5 bg-gradient-to-br from-zinc-100 via-white to-zinc-100 dark:from-zinc-800 dark:via-zinc-900 dark:to-black px-6 text-center"
      >
        {d.characterAvatar ? (
          <div className="relative w-40 h-40 rounded-full overflow-hidden">
            <Image src={d.characterAvatar} alt={d.characterName ?? d.questTitle} fill className="object-cover drop-shadow-lg" sizes="160px" />
          </div>
        ) : (
          <FlagIcon className="w-28 h-28 text-amber-400" />
        )}
        <div>
          <p className="text-sm uppercase tracking-wide text-amber-600 dark:text-amber-300/80 mb-1">ახალი მისია</p>
          <p className="text-xl font-bold text-zinc-900 dark:text-white">{d.questTitle}</p>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{d.zoneName}</p>
        </div>
      </Link>
    </div>
  );
}
