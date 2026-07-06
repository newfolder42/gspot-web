import type { ReactNode } from 'react';
import { FeedEvent, OwnFeedEvent } from '@/types/feed-event';
import UserLink from './common/user-link';
import TimePassed from './common/time-passed';

export type Slide = FeedEvent | OwnFeedEvent;

export function SlideHeader({ event, icon }: { event: Slide; icon: ReactNode }) {
  return (
    <div className="flex items-center gap-2 px-4 py-3">
      <span className="flex-shrink-0">{icon}</span>
      <UserLink alias={event.actorAlias} level={event.actorLevel} className="text-sm" />
      <span className="text-xs text-zinc-400">•</span>
      <TimePassed date={event.createdAt} className="text-xs text-zinc-400" />
    </div>
  );
}
