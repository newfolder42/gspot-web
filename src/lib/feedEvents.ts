import { query } from '@/lib/db';
import { logerror } from './logger';
import { eventBus } from './eventBus';
import type { FeedEventReactedEvent } from '@/types/events/feed-event-reacted';
import {
  FeedEvent,
  FeedEventBubble,
  FeedEventDetails,
  FeedEventType,
  FeedEventViewer,
  OwnFeedEvent,
  feedEventPreviewImage,
  feedEventTitle,
} from '@/types/feed-event';

// feed_events ("ამბები") are only surfaced for 48h.
const VISIBLE_WINDOW = "NOW() - INTERVAL '48 hours'";

// Who may see an event: follower-scoped types require following the actor;
// quest_created is scoped to active members of the quest's zone instead.
// $1 must be the viewer's user id wherever this fragment is embedded.
const VISIBILITY_FILTER = `(
  (fe.type <> 'quest_created' AND EXISTS (
     SELECT 1 FROM user_connections uc
     WHERE uc.user_id = $1 AND uc.type = 'connection' AND uc.connection_id = fe.actor_id
  ))
  OR
  (fe.type = 'quest_created' AND EXISTS (
     SELECT 1 FROM zone_members zm
     WHERE zm.zone_id = (fe.details->>'zoneId')::bigint
       AND zm.user_id = $1 AND zm.status = 'active'
  ))
)`;

function mapEvent(row: any): FeedEvent {
  return {
    id: Number(row.id),
    type: row.type as FeedEventType,
    groupKey: row.group_key,
    refId: row.ref_id != null ? Number(row.ref_id) : null,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    actorAlias: row.actor_alias,
    actorLevel: row.actor_level != null ? Number(row.actor_level) : null,
    seen: Boolean(row.seen),
    reacted: Boolean(row.reacted),
    details: row.details as FeedEventDetails,
  };
}

/**
 * Preview bubbles for the strip: quests/achievements completed by people the
 * user follows within the last 48h, grouped by quest/achievement. Groups with
 * any unseen event come first, then newest → oldest.
 */
export async function getFeedEventBubbles(userId: number): Promise<FeedEventBubble[]> {
  try {
    const res = await query(
      `WITH visible AS (
         SELECT fe.group_key, fe.type, fe.ref_id, fe.details, fe.created_at,
                (fs.id IS NOT NULL) AS seen
         FROM feed_events fe
         LEFT JOIN feed_event_seens fs ON fs.event_id = fe.id AND fs.user_id = $1
         WHERE fe.created_at > ${VISIBLE_WINDOW}
           AND fe.actor_id <> $1
           AND ${VISIBILITY_FILTER}
       )
       SELECT
         group_key,
         (array_agg(type ORDER BY created_at DESC))[1] AS type,
         (array_agg(details ORDER BY created_at DESC))[1] AS details,
         MAX(created_at) AS latest_at,
         COUNT(*)::int AS total,
         bool_or(NOT seen) AS has_unseen
       FROM visible
       GROUP BY group_key
       ORDER BY has_unseen DESC, latest_at DESC
       LIMIT 50`,
      [userId]
    );

    return res.rows.map((row: any) => {
      const type = row.type as FeedEventType;
      const details = row.details as FeedEventDetails;
      return {
        groupKey: row.group_key,
        type,
        title: feedEventTitle(details, type),
        previewImage: feedEventPreviewImage(details, type),
        total: Number(row.total),
        hasUnseen: Boolean(row.has_unseen),
        latestAt: row.latest_at instanceof Date ? row.latest_at.toISOString() : String(row.latest_at),
      };
    });
  } catch (err) {
    await logerror('getFeedEventBubbles error', [err]);
    return [];
  }
}

/** All events inside one bubble (one per user), unseen first then newest. */
export async function getFeedEventGroup(userId: number, groupKey: string): Promise<FeedEvent[]> {
  try {
    const res = await query(
      `SELECT fe.id, fe.type, fe.group_key, fe.ref_id, fe.details, fe.created_at,
              u.alias AS actor_alias, ux.level AS actor_level,
              (fs.id IS NOT NULL) AS seen,
              (fr.id IS NOT NULL) AS reacted
       FROM feed_events fe
       JOIN users u ON u.id = fe.actor_id
       LEFT JOIN user_xp ux ON ux.user_id = fe.actor_id
       LEFT JOIN feed_event_seens fs ON fs.event_id = fe.id AND fs.user_id = $1
       LEFT JOIN feed_event_reactions fr ON fr.event_id = fe.id AND fr.user_id = $1
       WHERE fe.group_key = $2
         AND fe.created_at > ${VISIBLE_WINDOW}
         AND fe.actor_id <> $1
         AND ${VISIBILITY_FILTER}
       ORDER BY seen ASC, fe.created_at DESC`,
      [userId, groupKey]
    );

    return res.rows.map(mapEvent);
  } catch (err) {
    await logerror('getFeedEventGroup error', [err]);
    return [];
  }
}

/** The current user's own recent events, newest first, with viewer counts. */
export async function getOwnFeedEvents(userId: number): Promise<OwnFeedEvent[]> {
  try {
    const res = await query(
      `SELECT fe.id, fe.type, fe.group_key, fe.ref_id, fe.details, fe.created_at,
              u.alias AS actor_alias, ux.level AS actor_level,
              (SELECT COUNT(*)::int FROM feed_event_seens s WHERE s.event_id = fe.id) AS seen_count,
              (SELECT COUNT(*)::int FROM feed_event_reactions r WHERE r.event_id = fe.id) AS reaction_count
       FROM feed_events fe
       JOIN users u ON u.id = fe.actor_id
       LEFT JOIN user_xp ux ON ux.user_id = fe.actor_id
       WHERE fe.actor_id = $1
         AND fe.created_at > ${VISIBLE_WINDOW}
       ORDER BY fe.created_at DESC`,
      [userId]
    );

    return res.rows.map((row: any) => ({
      ...mapEvent({ ...row, seen: true, reacted: false }),
      seenCount: Number(row.seen_count),
      reactionCount: Number(row.reaction_count),
    }));
  } catch (err) {
    await logerror('getOwnFeedEvents error', [err]);
    return [];
  }
}

/** Record that the user has seen an event. Idempotent. */
export async function markFeedEventSeen(userId: number, eventId: number): Promise<void> {
  try {
    await query(
      `INSERT INTO feed_event_seens (event_id, user_id)
       VALUES ($1, $2)
       ON CONFLICT (event_id, user_id) DO NOTHING`,
      [eventId, userId]
    );
  } catch (err) {
    await logerror('markFeedEventSeen error', [err]);
  }
}

/** Followers who viewed one of the user's own events. Authorized by ownerId. */
export async function getFeedEventViewers(ownerId: number, eventId: number): Promise<FeedEventViewer[]> {
  try {
    const res = await query(
      `SELECT u.alias, ux.level, s.seen_at, (r.id IS NOT NULL) AS reacted
       FROM feed_event_seens s
       JOIN feed_events fe ON fe.id = s.event_id
       JOIN users u ON u.id = s.user_id
       LEFT JOIN user_xp ux ON ux.user_id = s.user_id
       LEFT JOIN feed_event_reactions r ON r.event_id = s.event_id AND r.user_id = s.user_id
       WHERE s.event_id = $1 AND fe.actor_id = $2
       ORDER BY reacted DESC, s.seen_at DESC`,
      [eventId, ownerId]
    );

    return res.rows.map((row: any) => ({
      alias: row.alias,
      level: row.level != null ? Number(row.level) : null,
      seenAt: row.seen_at instanceof Date ? row.seen_at.toISOString() : String(row.seen_at),
      reacted: Boolean(row.reacted),
    }));
  } catch (err) {
    await logerror('getFeedEventViewers error', [err]);
    return [];
  }
}

/**
 * Record the current user's one-time reaction (upvote) to someone else's event.
 * Only allowed for events the user is actually able to see, and only once —
 * a repeat call is a no-op that still reports `reacted: true`.
 * Publishes `feed_event:reacted` on the first insert so the owner gets notified.
 */
export async function reactToFeedEvent(
  userId: number,
  alias: string,
  eventId: number
): Promise<{ ok: boolean; reacted: boolean }> {
  try {
    // authorize: the event must be visible to this user (and not their own)
    const eventRes = await query(
      `SELECT fe.id, fe.type, fe.actor_id, u.alias AS actor_alias
       FROM feed_events fe
       JOIN users u ON u.id = fe.actor_id
       WHERE fe.id = $2
         AND fe.created_at > ${VISIBLE_WINDOW}
         AND fe.actor_id <> $1
         AND ${VISIBILITY_FILTER}
       LIMIT 1`,
      [userId, eventId]
    );
    if ((eventRes.rowCount ?? 0) === 0) return { ok: false, reacted: false };
    const event = eventRes.rows[0];

    const insertRes = await query(
      `INSERT INTO feed_event_reactions (event_id, user_id, type)
       VALUES ($1, $2, 'upvote')
       ON CONFLICT (event_id, user_id) DO NOTHING
       RETURNING id`,
      [eventId, userId]
    );

    // already reacted before -> nothing new to announce
    if ((insertRes.rowCount ?? 0) === 0) return { ok: true, reacted: true };

    await eventBus.publish('feed_event', 'reacted', {
      eventId: +eventId,
      eventType: event.type,
      reaction: 'upvote',
      reactorId: userId,
      reactorAlias: alias,
      ownerId: Number(event.actor_id),
      ownerAlias: event.actor_alias,
    } as FeedEventReactedEvent);

    return { ok: true, reacted: true };
  } catch (err) {
    await logerror('reactToFeedEvent error', [err]);
    return { ok: false, reacted: false };
  }
}
