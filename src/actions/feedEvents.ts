'use server';

import { getCurrentUser } from '@/lib/session';
import {
  getFeedEventBubbles,
  getFeedEventGroup,
  getFeedEventViewers,
  getOwnFeedEvents,
  markFeedEventSeen,
} from '@/lib/feedEvents';
import { FeedEvent, FeedEventBubble, FeedEventViewer, OwnFeedEvent } from '@/types/feed-event';

export async function loadFeedEventStrip(): Promise<{ bubbles: FeedEventBubble[]; own: OwnFeedEvent[] }> {
  const user = await getCurrentUser();
  if (!user) return { bubbles: [], own: [] };

  const [bubbles, own] = await Promise.all([
    getFeedEventBubbles(user.userId),
    getOwnFeedEvents(user.userId),
  ]);

  return { bubbles, own };
}

export async function loadFeedEventGroup(groupKey: string): Promise<FeedEvent[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  return getFeedEventGroup(user.userId, groupKey);
}

export async function seeFeedEvent(eventId: number): Promise<{ ok: boolean }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false };
  await markFeedEventSeen(user.userId, eventId);
  return { ok: true };
}

export async function loadFeedEventViewers(eventId: number): Promise<FeedEventViewer[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  return getFeedEventViewers(user.userId, eventId);
}
