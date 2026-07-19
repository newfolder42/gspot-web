'use client';

import { useCallback, useEffect, useState } from 'react';
import { OwnFeedEvent } from '@/types/feed-event';
import { seeFeedEvent } from '@/actions/feedEvents';
import { XIcon } from './icons';
import FeedEventViewersModal from './feed-event-viewers-modal';
import { Slide } from './feed-event-slide-header';
import { QuestSlide } from './feed-event-quest-slide';
import { AchievementSlide } from './feed-event-achievement-slide';
import { QuestCreatedSlide } from './feed-event-quest-created-slide';

type Props = {
  events: Slide[];
  mode: 'others' | 'own';
  initialIndex?: number;
  onClose: () => void;
};

function ChevronLeft({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
      <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronRight({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
      <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function FeedEventViewer({ events, mode, initialIndex = 0, onClose }: Props) {
  const [index, setIndex] = useState(initialIndex);
  const [viewersFor, setViewersFor] = useState<number | null>(null);

  const current = events[index];
  const count = events.length;

  const goNext = useCallback(() => {
    setIndex((i) => (i < count - 1 ? i + 1 : i));
  }, [count]);

  const goPrev = useCallback(() => {
    setIndex((i) => (i > 0 ? i - 1 : i));
  }, []);

  // Mark others' events seen as they surface.
  useEffect(() => {
    if (mode === 'others' && current && !current.seen) {
      seeFeedEvent(current.id);
      current.seen = true;
    }
  }, [current, mode]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') goNext();
      else if (e.key === 'ArrowLeft') goPrev();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goNext, goPrev, onClose]);

  if (!current) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80" onClick={onClose}>
      <div
        className="relative w-full max-w-md h-full sm:h-auto sm:max-h-[90vh] flex flex-col justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* progress segments */}
        <div className="absolute top-0 inset-x-0 z-10 flex gap-1 px-3 pt-3">
          {events.map((_, i) => (
            <div key={i} className="h-0.5 flex-1 rounded-full bg-white/30 overflow-hidden">
              <div className={`h-full bg-white transition-all ${i <= index ? 'w-full' : 'w-0'}`} />
            </div>
          ))}
        </div>

        <button
          onClick={onClose}
          className="absolute top-4 right-3 z-20 text-white/80 hover:text-white p-1"
          aria-label="დახურვა"
        >
          <XIcon className="w-5 h-5" />
        </button>

        <div className="overflow-hidden sm:rounded-xl bg-white dark:bg-zinc-900 pt-6">
          {current.type === 'quest_completed' ? (
            <QuestSlide event={current} />
          ) : current.type === 'quest_created' ? (
            <QuestCreatedSlide event={current} />
          ) : (
            <AchievementSlide event={current} />
          )}

          {mode === 'own' && (
            <button
              onClick={() => setViewersFor(current.id)}
              className="w-full flex items-center justify-center gap-1.5 py-3 text-sm text-zinc-500 hover:text-zinc-800 dark:text-white/80 dark:hover:text-white border-t border-zinc-200 dark:border-white/10"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              ნანახია {(current as OwnFeedEvent).seenCount}
            </button>
          )}
        </div>

        {/* nav */}
        {index > 0 && (
          <button
            onClick={goPrev}
            className="absolute left-1 top-1/2 -translate-y-1/2 z-10 text-zinc-600 hover:text-zinc-900 dark:text-white/70 dark:hover:text-white p-2"
            aria-label="წინა"
          >
            <ChevronLeft />
          </button>
        )}
        {index < count - 1 && (
          <button
            onClick={goNext}
            className="absolute right-1 top-1/2 -translate-y-1/2 z-10 text-zinc-600 hover:text-zinc-900 dark:text-white/70 dark:hover:text-white p-2"
            aria-label="შემდეგი"
          >
            <ChevronRight />
          </button>
        )}
      </div>

      {viewersFor != null && (
        <FeedEventViewersModal eventId={viewersFor} onClose={() => setViewersFor(null)} />
      )}
    </div>
  );
}
