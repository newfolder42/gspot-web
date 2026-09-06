'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { loadShufflePosts, skipShufflePosts } from '@/actions/feed';
import { SHUFFLE_DECK_SIZE } from '@/types/constants';
import type { GpsPostType } from '@/types/post';

/** Deal the next deck once this few cards are left, so it lands before it's needed. */
const REFILL_AT = 3;

/** Below this, moving on is a flick past the card rather than a considered skip. */
const SKIP_AFTER_MS = 2000;

/** How many dealt ids ride along as "don't deal these again" (the API caps it too). */
const EXCLUDE_LIMIT = 200;

/**
 * The shuffle deck: cards arrive ten at a time, the next one is always
 * preloaded, and skips are buffered and sent with the following deal.
 */
export function useShuffleDeck() {
  const [cards, setCards] = useState<GpsPostType[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  /** Set once a short deck comes back: the pool has nothing else to offer. */
  const drained = useRef(false);
  const dealing = useRef(false);
  const dealtIds = useRef<number[]>([]);
  const pendingSkips = useRef<number[]>([]);
  const shownAt = useRef(0);

  const flushSkips = useCallback(async () => {
    if (pendingSkips.current.length === 0) return;
    const ids = pendingSkips.current;
    pendingSkips.current = [];
    try {
      await skipShufflePosts(ids);
    } catch {
      // A lost skip only means the post comes round again.
    }
  }, []);

  const deal = useCallback(async () => {
    if (dealing.current || drained.current) return;
    dealing.current = true;
    setLoading(true);
    try {
      // Sent first so the new deck already knows about them.
      await flushSkips();
      const posts = await loadShufflePosts({ excludeIds: dealtIds.current.slice(-EXCLUDE_LIMIT) });
      if (posts.length < SHUFFLE_DECK_SIZE) drained.current = true;
      dealtIds.current = [...dealtIds.current, ...posts.map((p) => Number(p.id))];
      setCards((prev) => [...prev, ...posts]);
    } catch {
      drained.current = true;
    } finally {
      dealing.current = false;
      setLoading(false);
    }
  }, [flushSkips]);

  useEffect(() => { shownAt.current = Date.now(); }, []);

  // Also does the first deal, when the deck is still empty.
  useEffect(() => {
    if (cards.length - index <= REFILL_AT) void deal();
  }, [cards.length, index, deal]);

  // Keep the next couple of photos warm so advancing feels instant.
  useEffect(() => {
    for (const card of cards.slice(index + 1, index + 3)) {
      const img = new window.Image();
      img.src = card.imageVariants?.feed ?? card.image;
    }
  }, [cards, index]);

  useEffect(() => () => { void flushSkips(); }, [flushSkips]);

  const advance = useCallback(
    (skipped: boolean) => {
      const card = cards[index];
      if (card && skipped && Date.now() - shownAt.current >= SKIP_AFTER_MS) {
        pendingSkips.current.push(Number(card.id));
      }
      shownAt.current = Date.now();
      setIndex((i) => i + 1);
    },
    [cards, index]
  );

  const current = cards[index] ?? null;

  return {
    current,
    /** Cards played so far, for the "4 / 10" style counter. */
    played: index,
    /** No card and nothing on the way: the pool is used up. */
    finished: !current && !loading,
    loading: !current && loading,
    advance,
  };
}
