import Image from 'next/image';
import { AchievementUnlockedDetails } from '@/types/feed-event';
import { TrophyIcon } from './icons';
import { Slide, SlideHeader } from './feed-event-slide-header';

export function AchievementSlide({ event }: { event: Slide }) {
  const d = event.details as AchievementUnlockedDetails;
  const title = d.milestoneName || d.achievementName;

  return (
    <div>
      <SlideHeader event={event} icon={<TrophyIcon className="w-7 h-7 text-amber-400" />} />
      <div className="aspect-square flex flex-col items-center justify-center gap-5 bg-gradient-to-br from-zinc-100 via-white to-zinc-100 dark:from-zinc-800 dark:via-zinc-900 dark:to-black px-6 text-center">
        {d.imageUrl ? (
          <div className="relative w-40 h-40">
            <Image src={d.imageUrl} alt={title} fill className="object-contain drop-shadow-lg" sizes="160px" />
          </div>
        ) : (
          <TrophyIcon className="w-28 h-28 text-amber-400" />
        )}
        <div>
          <p className="text-sm uppercase tracking-wide text-amber-600 dark:text-amber-300/80 mb-1">მიღწევა</p>
          <p className="text-xl font-bold text-zinc-900 dark:text-white">{title}</p>
        </div>
      </div>
    </div>
  );
}
