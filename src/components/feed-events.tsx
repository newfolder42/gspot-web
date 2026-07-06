'use client';

import { useEffect, useState } from 'react';
import { loadFeedEventStrip, loadFeedEventGroup } from '@/actions/feedEvents';
import {
  FeedEvent,
  FeedEventBubble,
  OwnFeedEvent,
  feedEventPreviewImage,
} from '@/types/feed-event';
import FeedEventViewer from './feed-event-viewer';
import { BubblePreview } from './feed-event-bubble-preview';

export default function FeedEvents() {
  const [bubbles, setBubbles] = useState<FeedEventBubble[]>([]);
  const [own, setOwn] = useState<OwnFeedEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const [viewer, setViewer] = useState<
    | { mode: 'others'; events: FeedEvent[] }
    | { mode: 'own'; events: OwnFeedEvent[] }
    | null
  >(null);
  const [openingKey, setOpeningKey] = useState<string | null>(null);

  const refresh = async () => {
    const { bubbles, own } = await loadFeedEventStrip();
    setBubbles(bubbles);
    setOwn(own);
  };

  useEffect(() => {
    let cancelled = false;
    loadFeedEventStrip()
      .then(({ bubbles, own }) => {
        if (cancelled) return;
        setBubbles(bubbles);
        setOwn(own);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const openGroup = async (groupKey: string) => {
    if (openingKey) return;
    setOpeningKey(groupKey);
    try {
      const events = await loadFeedEventGroup(groupKey);
      if (events.length > 0) setViewer({ mode: 'others', events });
    } finally {
      setOpeningKey(null);
    }
  };

  const closeViewer = () => {
    setViewer(null);
    // reflect newly-seen state in the ring
    refresh();
  };

  if (loading || (bubbles.length === 0 && own.length === 0)) return null;

  return (
    <div className="max-w-4xl mx-auto px-2">
      <h2 className="pt-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        ამბები
      </h2>
      <div className="flex items-start gap-3 overflow-x-auto pb-3 pt-2 no-scrollbar">
        {own.length > 0 && (
          <button onClick={() => setViewer({ mode: 'own', events: own })} className="focus:outline-none">
            <BubblePreview
              image={feedEventPreviewImage(own[0].details, own[0].type)}
              type={own[0].type}
              ring="bg-gradient-to-tr from-teal-400 to-teal-600"
              label="შენი ამბები"
            />
          </button>
        )}

        {bubbles.map((b) => (
          <button
            key={b.groupKey}
            onClick={() => openGroup(b.groupKey)}
            disabled={openingKey === b.groupKey}
            className="focus:outline-none disabled:opacity-60"
          >
            <BubblePreview
              image={b.previewImage}
              type={b.type}
              ring={b.hasUnseen ? 'bg-teal-500' : 'bg-zinc-300 dark:bg-zinc-700'}
              label={b.title}
            />
          </button>
        ))}
      </div>

      {viewer && (
        <FeedEventViewer
          events={viewer.events}
          mode={viewer.mode}
          onClose={closeViewer}
        />
      )}
    </div>
  );
}
