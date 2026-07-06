import Image from 'next/image';
import Link from 'next/link';
import { QuestCompletedDetails } from '@/types/feed-event';
import ProfileAvatar from './common/profileAvatar';
import { FlagIcon } from './icons';
import { Slide, SlideHeader } from './feed-event-slide-header';

export function QuestSlide({ event }: { event: Slide }) {
  const d = event.details as QuestCompletedDetails;
  const photos = d.photos ?? [];

  return (
    <div>
      <SlideHeader
        event={event}
        icon={
          <ProfileAvatar
            name={d.characterAvatar ? d.questTitle : 'quest'}
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
        className="block px-4 pb-3 text-base font-semibold text-amber-600 dark:text-amber-400 hover:underline"
      >
        <FlagIcon className="inline w-4 h-4 mr-1 -mt-0.5" />
        შეასრულა მისია {d.questTitle}
      </Link>
      {photos.length > 0 ? (
        <div className={`grid gap-0.5 ${photos.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
          {photos.map((photo, idx) => {
            const tile = (
              <>
                <Image src={photo.feed ?? photo.url} alt={photo.objectiveTitle ?? ''} fill className="object-cover" sizes="480px" />
                {photo.objectiveTitle && (
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent px-2 pt-4 pb-1.5">
                    <span className="text-xs font-medium text-white drop-shadow-sm">{photo.objectiveTitle}</span>
                  </div>
                )}
              </>
            );
            const tileClass = 'relative aspect-square overflow-hidden bg-zinc-100 dark:bg-zinc-800';
            return d.postId ? (
              <Link key={idx} href={`/post/${d.postId}`} className={`block ${tileClass}`}>
                {tile}
              </Link>
            ) : (
              <div key={idx} className={tileClass}>
                {tile}
              </div>
            );
          })}
        </div>
      ) : (
        (() => {
          const fallbackClass = 'aspect-square flex items-center justify-center bg-gradient-to-br from-amber-400 to-amber-600 dark:from-amber-600 dark:to-amber-800';
          const icon = <FlagIcon className="w-16 h-16 text-white/90" />;
          return d.postId ? (
            <Link href={`/post/${d.postId}`} className={fallbackClass}>{icon}</Link>
          ) : (
            <div className={fallbackClass}>{icon}</div>
          );
        })()
      )}
    </div>
  );
}
