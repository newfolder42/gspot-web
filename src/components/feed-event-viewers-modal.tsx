'use client';

import { useEffect, useState } from 'react';
import { loadFeedEventViewers } from '@/actions/feedEvents';
import { FeedEventViewer } from '@/types/feed-event';
import UserLink from './common/user-link';
import TimePassed from './common/time-passed';

export default function FeedEventViewersModal({ eventId, onClose }: { eventId: number; onClose: () => void }) {
  const [viewers, setViewers] = useState<FeedEventViewer[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadFeedEventViewers(eventId).then((v) => {
      if (!cancelled) setViewers(v);
    });
    return () => { cancelled = true; };
  }, [eventId]);

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-sm bg-white dark:bg-zinc-900 rounded-t-2xl sm:rounded-2xl max-h-[70vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
          <span className="font-semibold text-sm text-zinc-800 dark:text-zinc-100">
            ვინ ნახა{viewers ? ` (${viewers.length})` : ''}
          </span>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 text-lg leading-none">✕</button>
        </div>
        {viewers === null ? (
          <div className="p-6 text-center text-zinc-400 text-sm">იტვირთება...</div>
        ) : viewers.length === 0 ? (
          <div className="p-6 text-center text-zinc-400 text-sm">ჯერ არავის უნახავს</div>
        ) : (
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {viewers.map((v, i) => (
              <li key={i} className="px-4 py-3 flex items-center justify-between">
                <UserLink alias={v.alias} level={v.level} className="text-sm" />
                <TimePassed date={v.seenAt} className="text-xs text-zinc-400" />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
