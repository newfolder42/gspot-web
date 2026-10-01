import type { ReactNode } from 'react';
import { FeedEvent, OwnFeedEvent, QuestCreatedDetails } from '@/types/feed-event';
import UserLink from './common/user-link';
import CharacterLink from './common/character-link';
import TimePassed from './common/time-passed';

export type Slide = FeedEvent | OwnFeedEvent;

function SlideActor({ event }: { event: Slide }) {
  if (event.type === 'quest_created') {
    const d = event.details as QuestCreatedDetails;
    return (
      <CharacterLink
        name={d.characterName ?? d.zoneName}
        zoneSlug={d.zoneSlug}
        characterSlug={d.characterName ? d.characterSlug : null}
        className="text-sm"
      />
    );
  }
  return <UserLink alias={event.actorAlias} level={event.actorLevel} className="text-sm" />;
}

export function SlideHeader({ event, icon }: { event: Slide; icon: ReactNode }) {
  return (
    <div className="flex items-center gap-2 px-4 py-3">
      <span className="flex-shrink-0">{icon}</span>
      <SlideActor event={event} />
      <span className="text-xs text-zinc-400">•</span>
      <TimePassed date={event.createdAt} className="text-xs text-zinc-400" />
    </div>
  );
}
