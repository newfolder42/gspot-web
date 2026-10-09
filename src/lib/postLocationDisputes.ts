// Server-only. Deliberately not a "use server" module: every function takes an explicit
// user id and must never be reachable from a client as a server action.
//
// The location-dispute flow ("გასაჩივრება"):
//
//   guesser files a dispute (guess scored < 100)
//     -> post is flagged 'reported'; zone owners/admins and the author are told
//   staff review the post:
//     suspend   -> posts.status = 'suspended', hidden from every feed, no new guesses
//     dismiss   -> disputes closed, post carries on
//   a suspended post then ends one of three ways:
//     correct   -> the author moves the location, the post is live again and every guess is
//                  re-scored against it
//     discard   -> staff close it for good; it stays suspended, its guesses are simply
//                  not shown anymore (XP, leaderboards and achievements are left as they are)
//     restore   -> staff lift the suspension without any change
import { query, withTransaction } from '@/lib/db';
import { eventBus } from '@/lib/eventBus';
import { logerror } from '@/lib/logger';
import { isInGeorgia } from '@/lib/geo';
import {
  calculateGuessScore,
  calculatePhotoGuessScore,
  haversineMeters,
} from '@/lib/gpsPhotoGuessScore';
import { getZoneUploadRules } from '@/lib/zone-upload-rules';
import {
  LOCATION_DISPUTE_REASONS,
  LOCATION_NOTE_MAX,
  type LocationDisputeReason,
  type PostLocationDisputeEntry,
  type PostLocationReviewAction,
  type PostLocationReviewType,
  type PostLocationState,
} from '@/types/post-location';
import type { PostLocationDisputedEvent } from '@/types/events/post-location-disputed';
import type { PostSuspendedEvent } from '@/types/events/post-suspended';
import type { PostDiscardedEvent } from '@/types/events/post-discarded';
import type {
  PostLocationCorrectedEvent,
  PostLocationCorrectedGuess,
} from '@/types/events/post-location-corrected';

type Coordinates = { latitude: number; longitude: number };

/** A guess at or above this is "right" — nothing to contest. */
const PERFECT_SCORE = 100;

/** A correction has to actually move the pin; this much counts as "the same place". */
const MIN_CORRECTION_METERS = 10;

/** Who may review a disputed post. Moderators are left out on purpose. */
const REVIEW_ROLES = ['owner', 'admin'];

export type LocationActionError =
  | 'NOT_FOUND'
  | 'FORBIDDEN'
  | 'INVALID_STATE'
  | 'NO_GUESS'
  | 'SCORE_TOO_HIGH'
  | 'ALREADY_DISPUTED'
  | 'OUTSIDE_GEORGIA'
  | 'LOCATION_UNCHANGED'
  | 'INVALID_INPUT'
  | 'SERVER_ERROR';

export type LocationActionResult<T extends object = object> =
  | ({ ok: true } & T)
  | { ok: false; error: LocationActionError };

/** Thrown inside a transaction to roll it back with a reason the caller can return. */
class LocationActionFailure extends Error {
  constructor(public readonly code: LocationActionError) {
    super(code);
  }
}

function toFailure<T extends object>(err: unknown, context: string): LocationActionResult<T> {
  if (err instanceof LocationActionFailure) return { ok: false, error: err.code };
  void logerror(`${context} error`, [err]);
  return { ok: false, error: 'SERVER_ERROR' };
}

function readCoordinates(details: any): Coordinates | null {
  const latitude = Number(details?.coordinates?.latitude);
  const longitude = Number(details?.coordinates?.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return { latitude, longitude };
}

/** A user-written note: trimmed, capped, and null when empty. */
function cleanNote(note: string | null | undefined): string | null {
  const trimmed = (note ?? '').trim();
  return trimmed ? trimmed.slice(0, LOCATION_NOTE_MAX) : null;
}

/** "Other" means nothing without the guesser's own words. */
const MIN_OTHER_NOTE_LENGTH = 3;

function isReviewRole(role: string | null | undefined): boolean {
  return !!role && REVIEW_ROLES.includes(role);
}

// Post ids are bigints: the database driver hands them over as strings, and so does anything
// that read one from a page. Every entry point turns its `postId` into a number first, because
// the events published below are validated by gspot-services, which wants numbers.

type PostLocationRow = {
  id: number;
  userId: number;
  type: string;
  status: string;
  title: string;
  zoneId: number;
  zoneSlug: string;
  authorAlias: string;
};

function mapPostRow(r: any): PostLocationRow {
  return {
    id: Number(r.id),
    userId: Number(r.user_id),
    type: r.type,
    status: r.status,
    title: r.title ?? '',
    zoneId: Number(r.zone_id),
    zoneSlug: r.zone_slug,
    authorAlias: r.author_alias,
  };
}

const POST_ROW_SQL = `
  select p.id, p.user_id, p.type, p.status, p.title, p.zone_id,
         z.slug as zone_slug, u.alias as author_alias
  from posts p
  join zones z on z.id = p.zone_id
  join users u on u.id = p.user_id`;

/**
 * What the viewer sees and may do about a gps-photo post's location. Rides along on the post
 * detail, so the screen needs no extra round trip to decide which buttons to show.
 */
export async function getPostLocationReview(
  viewerId: number | null,
  postId: number
): Promise<PostLocationReviewType | null> {
  postId = Number(postId);
  try {
    const viewer = viewerId ?? 0;

    const res = await query(
      `select p.status, p.user_id, p.type,
              (select zm.role from zone_members zm
                where zm.zone_id = p.zone_id and zm.user_id = $2 and zm.status = 'active'
                limit 1) as viewer_role,
              (select pg.details from post_guesses pg
                where pg.post_id = p.id and pg.user_id = $2 limit 1) as my_guess,
              exists(select 1 from post_location_disputes d
                      where d.post_id = p.id and d.reporter_user_id = $2) as reported,
              (select count(*)::int from post_location_disputes d
                where d.post_id = p.id and d.status = 'open') as open_count,
              (select zs.upload_rules from zone_settings zs where zs.zone_id = p.zone_id limit 1) as upload_rules,
              s.id as suspension_id, s.state as suspension_state, s.created_at as suspended_at,
              s.note as suspension_note, sb.alias as suspended_by_alias
       from posts p
       left join lateral (
         select id, state, created_at, note, suspended_by from post_suspensions
         where post_id = p.id order by id desc limit 1
       ) s on true
       left join users sb on sb.id = s.suspended_by
       where p.id = $1`,
      [postId, viewer]
    );

    if ((res.rowCount ?? 0) === 0) return null;
    const r = res.rows[0];
    if (r.type !== 'gps-photo') return null;

    const isAuthor = viewer > 0 && Number(r.user_id) === viewer;
    const isReviewer = !isAuthor && isReviewRole(r.viewer_role);
    const openCount = Number(r.open_count);

    let state: PostLocationState = 'none';
    if (r.status === 'suspended') {
      state = r.suspension_state === 'discarded' ? 'discarded' : 'suspended';
    } else if (r.status === 'published' && openCount > 0) {
      state = 'reported';
    }

    // A pending dispute is between the guessers, the author and staff; to everyone else
    // the post is an ordinary one. (A suspended post is not reachable by them at all.)
    if (state === 'reported' && !isAuthor && !isReviewer) state = 'none';

    const myScore = Number(r.my_guess?.score);
    const canReport =
      r.status === 'published' &&
      !isAuthor &&
      r.my_guess != null &&
      !r.reported &&
      !(Number.isFinite(myScore) && myScore >= PERFECT_SCORE);

    let disputeCount = 0;
    let disputes: PostLocationDisputeEntry[] = [];

    if ((isAuthor || isReviewer) && state !== 'none') {
      // 'reported' counts what is waiting; a suspension counts what led to it, so an old,
      // already-corrected round does not inflate the number.
      const rows = await query(
        state === 'reported'
          ? `select u.alias, d.reason, d.note, d.score, d.distance, d.created_at
             from post_location_disputes d join users u on u.id = d.reporter_user_id
             where d.post_id = $1 and d.status = 'open'
             order by d.created_at desc limit 50`
          : `select u.alias, d.reason, d.note, d.score, d.distance, d.created_at
             from post_location_disputes d join users u on u.id = d.reporter_user_id
             where d.post_id = $1 and d.suspension_id = $2
             order by d.created_at desc limit 50`,
        state === 'reported' ? [postId] : [postId, r.suspension_id]
      );

      disputeCount = rows.rowCount ?? 0;
      // Everyone who may look gets the reasons; only reviewers also get who said it and how
      // far off their guess was — the author is told why, not by whom.
      disputes = rows.rows.map((d) => ({
        alias: isReviewer ? d.alias : null,
        reason: d.reason as LocationDisputeReason,
        note: d.note ?? null,
        score: isReviewer && d.score != null ? Number(d.score) : null,
        distance: isReviewer && d.distance != null ? Number(d.distance) : null,
        createdAt: new Date(d.created_at).toISOString(),
      }));
    }

    return {
      state,
      canReport,
      reported: Boolean(r.reported),
      canReview: isReviewer && (state === 'reported' || state === 'suspended'),
      canCorrect: isAuthor && state === 'suspended',
      disputeCount,
      disputes,
      suspension:
        (state === 'suspended' || state === 'discarded') && (isAuthor || isReviewer)
          ? { note: r.suspension_note ?? null, byAlias: r.suspended_by_alias ?? null }
          : null,
      suspendedAt:
        state === 'suspended' || state === 'discarded'
          ? new Date(r.suspended_at).toISOString()
          : null,
      rules: getZoneUploadRules(r.upload_rules),
    };
  } catch (err) {
    await logerror('getPostLocationReview error', [err]);
    return null;
  }
}

/** Whether the user may see the guess map / true location of a post that is under dispute. */
export async function canReviewPostLocation(userId: number, postId: number): Promise<boolean> {
  try {
    const res = await query(
      `select 1
       from posts p
       join zone_members zm on zm.zone_id = p.zone_id and zm.user_id = $2
                            and zm.status = 'active' and zm.role = any($3::text[])
       where p.id = $1 and p.user_id <> $2
         and (
           p.status = 'suspended'
           or exists(select 1 from post_location_disputes d where d.post_id = p.id and d.status = 'open')
         )
       limit 1`,
      [postId, userId, REVIEW_ROLES]
    );
    return (res.rowCount ?? 0) > 0;
  } catch (err) {
    await logerror('canReviewPostLocation error', [err]);
    return false;
  }
}

/**
 * A guesser contests the post's location. Only a guess under 100 can be contested — a perfect
 * guess has nothing to complain about — and each guess only once.
 */
export async function fileLocationDispute(
  userId: number,
  alias: string,
  postId: number,
  input: { reason?: string; note?: string | null } = {}
): Promise<LocationActionResult<{ disputeCount: number }>> {
  postId = Number(postId);
  try {
    const reason = (input.reason ?? 'wrong_place') as LocationDisputeReason;
    const note = cleanNote(input.note);
    if (!LOCATION_DISPUTE_REASONS.includes(reason)) return { ok: false, error: 'INVALID_INPUT' };
    if (reason === 'other' && (note?.length ?? 0) < MIN_OTHER_NOTE_LENGTH) {
      return { ok: false, error: 'INVALID_INPUT' };
    }

    const res = await query(
      `select p.id, p.user_id, p.type, p.status, p.title, p.zone_id,
              z.slug as zone_slug, u.alias as author_alias,
              pg.id as guess_id, pg.details as guess_details
       from posts p
       join zones z on z.id = p.zone_id
       join users u on u.id = p.user_id
       left join post_guesses pg on pg.post_id = p.id and pg.user_id = $2
       where p.id = $1`,
      [postId, userId]
    );

    if ((res.rowCount ?? 0) === 0) return { ok: false, error: 'NOT_FOUND' };
    const row = res.rows[0];
    const post = mapPostRow(row);

    if (post.type !== 'gps-photo' || post.status !== 'published') {
      return { ok: false, error: 'INVALID_STATE' };
    }
    if (post.userId === userId) return { ok: false, error: 'FORBIDDEN' };
    if (row.guess_id == null) return { ok: false, error: 'NO_GUESS' };

    const rawScore = Number(row.guess_details?.score);
    const score = Number.isFinite(rawScore) ? rawScore : 0;
    if (score >= PERFECT_SCORE) return { ok: false, error: 'SCORE_TOO_HIGH' };

    const distance = Number(row.guess_details?.distance);

    const inserted = await query(
      `insert into post_location_disputes
         (post_id, guess_id, reporter_user_id, score, distance, reason, note)
       values ($1, $2, $3, $4, $5, $6, $7)
       on conflict (guess_id) do nothing
       returning id`,
      [
        postId,
        row.guess_id,
        userId,
        Math.round(score),
        Number.isFinite(distance) ? Math.round(distance) : null,
        reason,
        note,
      ]
    );
    if ((inserted.rowCount ?? 0) === 0) return { ok: false, error: 'ALREADY_DISPUTED' };

    const count = await query(
      `select count(*)::int as open_count from post_location_disputes
       where post_id = $1 and status = 'open'`,
      [postId]
    );
    const openCount = Number(count.rows[0]?.open_count ?? 1);

    await eventBus.publish('post', 'location-disputed', {
      postId,
      postTitle: post.title,
      disputeId: Number(inserted.rows[0].id),
      authorId: post.userId,
      authorAlias: post.authorAlias,
      reporterId: userId,
      reporterAlias: alias,
      zoneId: post.zoneId,
      zoneSlug: post.zoneSlug,
      openCount,
      firstOpen: openCount === 1,
      reason,
      note,
    } as PostLocationDisputedEvent);

    return { ok: true, disputeCount: openCount };
  } catch (err) {
    return toFailure(err, 'fileLocationDispute');
  }
}

/**
 * Staff decide what to do with a disputed post. Reviewers are the zone's active owners and
 * admins, never the post's own author.
 */
export async function reviewPostLocation(
  userId: number,
  alias: string,
  postId: number,
  action: PostLocationReviewAction,
  input: { note?: string | null } = {}
): Promise<LocationActionResult<{ state: PostLocationState }>> {
  postId = Number(postId);
  try {
    // Only a suspension speaks to the author, so only it carries a note.
    const note = action === 'suspend' ? cleanNote(input.note) : null;

    const outcome = await withTransaction(async (client) => {
      const postRes = await client.query(`${POST_ROW_SQL} where p.id = $1 for update of p`, [postId]);
      if ((postRes.rowCount ?? 0) === 0) throw new LocationActionFailure('NOT_FOUND');
      const post = mapPostRow(postRes.rows[0]);
      if (post.type !== 'gps-photo') throw new LocationActionFailure('INVALID_STATE');

      const roleRes = await client.query(
        `select role from zone_members
         where zone_id = $1 and user_id = $2 and status = 'active' limit 1`,
        [post.zoneId, userId]
      );
      if (!isReviewRole(roleRes.rows[0]?.role) || post.userId === userId) {
        throw new LocationActionFailure('FORBIDDEN');
      }

      const openRes = await client.query(
        `select count(*)::int as n from post_location_disputes
         where post_id = $1 and status = 'open'`,
        [postId]
      );
      const openCount = Number(openRes.rows[0].n);

      const suspRes = await client.query(
        `select id from post_suspensions
         where post_id = $1 and state = 'awaiting_correction' limit 1 for update`,
        [postId]
      );
      const awaiting = suspRes.rows[0] ? Number(suspRes.rows[0].id) : null;

      switch (action) {
        case 'suspend': {
          if (post.status !== 'published' || openCount === 0) {
            throw new LocationActionFailure('INVALID_STATE');
          }
          await client.query(`update posts set status = 'suspended' where id = $1`, [postId]);
          const created = await client.query(
            `insert into post_suspensions (post_id, suspended_by, note) values ($1, $2, $3) returning id`,
            [postId, userId, note]
          );
          const suspensionId = Number(created.rows[0].id);
          await client.query(
            `update post_location_disputes
                set status = 'upheld', resolved_at = now(), resolved_by = $2, suspension_id = $3
              where post_id = $1 and status = 'open'`,
            [postId, userId, suspensionId]
          );
          return { post, suspensionId, state: 'suspended' as PostLocationState };
        }

        case 'dismiss': {
          if (post.status !== 'published' || openCount === 0) {
            throw new LocationActionFailure('INVALID_STATE');
          }
          await client.query(
            `update post_location_disputes
                set status = 'dismissed', resolved_at = now(), resolved_by = $2
              where post_id = $1 and status = 'open'`,
            [postId, userId]
          );
          return { post, suspensionId: null, state: 'none' as PostLocationState };
        }

        case 'discard': {
          if (post.status !== 'suspended' || awaiting == null) {
            throw new LocationActionFailure('INVALID_STATE');
          }
          await client.query(
            `update post_suspensions set state = 'discarded', resolved_at = now(), resolved_by = $2
             where id = $1`,
            [awaiting, userId]
          );
          return { post, suspensionId: awaiting, state: 'discarded' as PostLocationState };
        }

        case 'restore': {
          if (post.status !== 'suspended' || awaiting == null) {
            throw new LocationActionFailure('INVALID_STATE');
          }
          await client.query(`update posts set status = 'published' where id = $1`, [postId]);
          await client.query(
            `update post_suspensions set state = 'restored', resolved_at = now(), resolved_by = $2
             where id = $1`,
            [awaiting, userId]
          );
          return { post, suspensionId: awaiting, state: 'none' as PostLocationState };
        }
      }
    });

    if (action === 'suspend') {
      await eventBus.publish('post', 'suspended', {
        postId,
        postTitle: outcome.post.title,
        suspensionId: outcome.suspensionId!,
        authorId: outcome.post.userId,
        authorAlias: outcome.post.authorAlias,
        actorId: userId,
        actorAlias: alias,
        zoneId: outcome.post.zoneId,
        zoneSlug: outcome.post.zoneSlug,
        note,
      } as PostSuspendedEvent);
    }

    if (action === 'discard') {
      await eventBus.publish('post', 'discarded', {
        postId,
        postTitle: outcome.post.title,
        authorId: outcome.post.userId,
        authorAlias: outcome.post.authorAlias,
        actorId: userId,
        actorAlias: alias,
        zoneId: outcome.post.zoneId,
        zoneSlug: outcome.post.zoneSlug,
      } as PostDiscardedEvent);
    }

    return { ok: true, state: outcome.state };
  } catch (err) {
    return toFailure(err, 'reviewPostLocation');
  }
}

/**
 * The author moves a suspended post to its real location. Everything that was derived from
 * the old location is brought in line in one transaction: the photo's coordinates, every
 * guess's distance and score (and the score shown on its comment), and the same-location
 * posting guard. The post then goes live again.
 *
 * What cannot follow is announced as an event instead: leaderboards and achievements live in
 * gspot-services. XP is deliberately untouched — it is a flat amount per guess, not a function
 * of the score. Items already granted for the old spot are not taken back.
 */
export async function correctPostLocation(
  userId: number,
  alias: string,
  postId: number,
  coordinates: Coordinates
): Promise<LocationActionResult<{ rescored: number }>> {
  postId = Number(postId);
  try {
    if (!isInGeorgia(coordinates.latitude, coordinates.longitude)) {
      return { ok: false, error: 'OUTSIDE_GEORGIA' };
    }

    const outcome = await withTransaction(async (client) => {
      const postRes = await client.query(`${POST_ROW_SQL} where p.id = $1 for update of p`, [postId]);
      if ((postRes.rowCount ?? 0) === 0) throw new LocationActionFailure('NOT_FOUND');
      const post = mapPostRow(postRes.rows[0]);

      if (post.userId !== userId) throw new LocationActionFailure('FORBIDDEN');
      if (post.type !== 'gps-photo' || post.status !== 'suspended') {
        throw new LocationActionFailure('INVALID_STATE');
      }

      const suspRes = await client.query(
        `select id from post_suspensions
         where post_id = $1 and state = 'awaiting_correction' limit 1 for update`,
        [postId]
      );
      if ((suspRes.rowCount ?? 0) === 0) throw new LocationActionFailure('INVALID_STATE');
      const suspensionId = Number(suspRes.rows[0].id);

      const contentRes = await client.query(
        `select uc.id, uc.details
         from post_content pc join user_content uc on uc.id = pc.content_id
         where pc.post_id = $1 order by pc.sort limit 1 for update of uc`,
        [postId]
      );
      if ((contentRes.rowCount ?? 0) === 0) throw new LocationActionFailure('INVALID_STATE');
      const content = contentRes.rows[0];
      const previous = readCoordinates(content.details);

      if (previous && haversineMeters(previous, coordinates) < MIN_CORRECTION_METERS) {
        throw new LocationActionFailure('LOCATION_UNCHANGED');
      }

      // The old spot is kept on the photo's record, so a correction can be audited.
      const history = Array.isArray(content.details?.locationHistory)
        ? content.details.locationHistory
        : [];
      const nextDetails = {
        ...content.details,
        coordinates: { latitude: coordinates.latitude, longitude: coordinates.longitude },
        locationHistory: [
          ...history,
          ...(previous
            ? [{ coordinates: previous, replacedAt: new Date().toISOString(), suspensionId }]
            : []),
        ],
      };
      await client.query(`update user_content set details = $2 where id = $1`, [
        content.id,
        JSON.stringify(nextDetails),
      ]);

      const guessRes = await client.query(
        `select id, user_id, type, details, created_at
         from post_guesses where post_id = $1 order by id for update`,
        [postId]
      );

      const changed: PostLocationCorrectedGuess[] = [];
      for (const g of guessRes.rows) {
        const guessAt = readCoordinates(g.details);
        if (!guessAt) continue;

        const distance = haversineMeters(coordinates, guessAt);
        const isPhoto = g.type === 'gps-photo-guess';
        const score = isPhoto ? calculatePhotoGuessScore(distance) : calculateGuessScore(distance);
        const previousScore = Number(g.details?.score);
        const previousDistance = Number(g.details?.distance);

        await client.query(`update post_guesses set details = $2 where id = $1`, [
          g.id,
          JSON.stringify({
            ...g.details,
            distance,
            score,
            rescoredFrom: {
              distance: Number.isFinite(previousDistance) ? previousDistance : null,
              score: Number.isFinite(previousScore) ? previousScore : null,
            },
          }),
        ]);

        // The comment under the post shows the result, so it has to say the same thing.
        await client.query(
          `update post_comments
              set metadata = jsonb_set(
                    jsonb_set(coalesce(metadata, '{}'::jsonb), '{score}', to_jsonb($2::int)),
                    '{distance}', to_jsonb($3::int))
            where guess_id = $1`,
          [g.id, score, distance]
        );

        if (Number.isFinite(previousScore) && previousScore !== score) {
          changed.push({
            guessId: Number(g.id),
            userId: Number(g.user_id),
            guessType: g.type,
            previousScore,
            score,
            guessedAt: new Date(g.created_at).toISOString(),
          });
        }
      }

      // The same-location guard reads this row; leave it pointing at the old spot and the
      // author could be blocked from posting at the real one.
      await client.query(
        `update user_post_locations set latitude = $2, longitude = $3 where post_id = $1`,
        [postId, coordinates.latitude, coordinates.longitude]
      );

      await client.query(
        `update post_suspensions set state = 'corrected', resolved_at = now(), resolved_by = $2
         where id = $1`,
        [suspensionId, userId]
      );
      await client.query(`update posts set status = 'published' where id = $1`, [postId]);

      return { post, changed, rescored: guessRes.rowCount ?? 0 };
    });

    await eventBus.publish('post', 'location-corrected', {
      postId,
      postTitle: outcome.post.title,
      authorId: outcome.post.userId,
      authorAlias: alias,
      zoneId: outcome.post.zoneId,
      zoneSlug: outcome.post.zoneSlug,
      guesses: outcome.changed,
    } as PostLocationCorrectedEvent);

    return { ok: true, rescored: outcome.rescored };
  } catch (err) {
    return toFailure(err, 'correctPostLocation');
  }
}
