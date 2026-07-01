"use server";

import { query } from '@/lib/db';
import { getCurrentUser } from './session';
import { canUserAccessPost } from './post-access';
import { logerror } from './logger';
import type { PostType, GpsPostType, FeedPostType, QuestCompletionPostType, PostImageVariants } from '@/types/post';
import type { PostGuessMapDataType, PostGuessMapPointType, PostGuessType } from '@/types/post-guess';
import { PostCreatedEvent } from '@/types/events/post-created';
import { eventBus } from './eventBus';
import { PostGuessedEvent } from '@/types/events/post-guessed';
import { createGuessComment } from '@/lib/comments';
import { PostDeletedEvent } from '@/types/events/post-deleted';

type PhotoItem = { url: string; details?: { variants?: PostImageVariants | null; dateTaken?: string | null; objectiveTitle?: string | null } | null };

function zoneVisibleSql(userParam: string): string {
  return `(
    z.visibility = 'public'
    or exists (
      select 1 from zone_members zm
      where zm.zone_id = z.id and zm.user_id = ${userParam} and zm.status = 'active'
    )
  )`;
}

function zoneMemberSql(userParam: string): string {
  return `exists (
    select 1 from zone_members zm
    where zm.zone_id = z.id and zm.user_id = ${userParam} and zm.status = 'active'
  )`;
}

function buildBasePost(r: any): PostType {
  return {
    id: r.id,
    title: r.title,
    author: r.author_alias,
    date: r.created_at,
    userId: r.user_id,
    zoneId: r.zone_id,
    zoneSlug: r.zone_slug,
    zoneProfilePhoto: r.zone_profile_photo_url ?? null,
    status: r.status,
    commentCount: r.comment_count != null ? Number(r.comment_count) : 0,
    authorLevel: r.author_level ?? null,
  };
}

function enrichGpsPost(base: PostType, r: any, items: PhotoItem[]): GpsPostType {
  const first = items[0];
  return {
    ...base,
    type: 'gps-photo',
    image: first?.url ?? '',
    imageVariants: first?.details?.variants ?? null,
    dateTaken: first?.details?.dateTaken || null,
    guessCount: r.guesses_count != null ? Number(r.guesses_count) : 0,
    userHasGuessed: r.user_has_guessed ?? false,
    tag: r.tag_id ? { id: Number(r.tag_id), name: r.tag_name, color: r.tag_color } : null,
  };
}

function enrichQuestPost(base: PostType, r: any, items: PhotoItem[]): QuestCompletionPostType {
  return {
    ...base,
    type: 'quest-completion',
    photos: items.map(i => ({ url: i.url, objectiveTitle: i.details?.objectiveTitle ?? null, variants: i.details?.variants ?? null })),
    questId: r.quest_id != null ? Number(r.quest_id) : 0,
    questTitle: r.quest_title ?? null,
  };
}

async function fetchGpsExtras(ids: number[]): Promise<Map<number, any>> {
  const map = new Map<number, any>();
  if (ids.length === 0) return map;

  const res = await query(
    `select p.id, ph.items as photo_items,
       zt.id as tag_id, zt.name as tag_name, zt.color as tag_color
     from posts p
     left join lateral (
       select json_agg(json_build_object('url', uc2.public_url, 'details', uc2.details) order by pc2.sort) as items
       from post_content pc2
       join user_content uc2 on uc2.id = pc2.content_id
       where pc2.post_id = p.id
     ) ph on true
     left join post_tags ptt on ptt.post_id = p.id
     left join zone_tags zt on zt.id = ptt.tag_id
     where p.id = any($1::bigint[])`,
    [ids]
  );

  for (const r of res.rows) map.set(Number(r.id), r);
  return map;
}

async function fetchQuestExtras(ids: number[]): Promise<Map<number, any>> {
  const map = new Map<number, any>();
  if (ids.length === 0) return map;

  const res = await query(
    `select p.id, pqc.quest_id, zq.title as quest_title, ph.items as photo_items
     from posts p
     join post_quest_completions pqc on pqc.post_id = p.id
     left join zone_quests zq on zq.id = pqc.quest_id
     left join lateral (
       select json_agg(json_build_object('url', uc2.public_url, 'details', uc2.details) order by pc2.sort) as items
       from post_content pc2
       join user_content uc2 on uc2.id = pc2.content_id
       where pc2.post_id = p.id
     ) ph on true
     where p.id = any($1::bigint[])`,
    [ids]
  );

  for (const r of res.rows) map.set(Number(r.id), r);
  return map;
}

async function enrichPosts(rows: any[]): Promise<FeedPostType[]> {
  const gpsIds = rows.filter(r => r.type === 'gps-photo').map(r => Number(r.id));
  const questIds = rows.filter(r => r.type === 'quest-completion').map(r => Number(r.id));

  const [gpsExtras, questExtras] = await Promise.all([
    fetchGpsExtras(gpsIds),
    fetchQuestExtras(questIds),
  ]);

  return rows.map(r => {
    const base = buildBasePost(r);
    const id = Number(r.id);

    if (r.type === 'quest-completion') {
      const extra = questExtras.get(id) ?? {};
      return enrichQuestPost(base, extra, extra.photo_items ?? []);
    }

    const extra = gpsExtras.get(id) ?? {};
    return enrichGpsPost(base, { ...r, ...extra }, extra.photo_items ?? []);
  });
}

export async function getConnectionsPosts(
  accountUserId: number,
  userId?: number | null,
  limit: number = 20,
  cursor?: { date: string; id: number },
  filter: 'all' | 'guessed' | 'not-guessed' = 'all'
): Promise<FeedPostType[]> {
  try {
    const cursorCondition = cursor
      ? `and (p.created_at < $4 or (p.created_at = $4 and p.id < $5))`
      : '';

    let filterCondition = '';
    if (userId && filter === 'guessed') {
      filterCondition = 'and exists(select 1 from post_guesses pg where pg.post_id = p.id and pg.user_id = $3)';
    } else if (userId && filter === 'not-guessed') {
      filterCondition = 'and not exists(select 1 from post_guesses pg where pg.post_id = p.id and pg.user_id = $3)';
    }

    const params = cursor
      ? [limit, accountUserId, userId, cursor.date, cursor.id]
      : [limit, accountUserId, userId];

    const res = await query(
      `select p.id, p.type, p.title, p.created_at, p.user_id, p.status, p.zone_id, z.slug as zone_slug, u.alias as author_alias, zcp.public_url as zone_profile_photo_url,
       (select count(*) from post_guesses pg where pg.post_id = p.id) as guesses_count,
       (select count(*) from post_comments pc where pc.post_id = p.id and pc.type = 'comment') as comment_count,
       exists(select 1 from post_guesses pg where pg.post_id = p.id and pg.user_id = $3) as user_has_guessed,
       ux.level as author_level
from user_connections ucn
join posts p on ucn.connection_id = p.user_id
join zones z on z.id = p.zone_id
join users u on u.id = p.user_id
left join user_xp ux on ux.user_id = u.id
left join content_store zcp on zcp.reference_type = 'zone' and zcp.reference_id = z.id and zcp.content_type = 'profile-photo'
where ucn.user_id = $2 and p.status in ('published') and p.type in ('gps-photo', 'quest-completion')
  and ${zoneVisibleSql('$3')}
  ${filterCondition} ${cursorCondition}
order by p.created_at desc, p.id desc
limit $1`,
      params
    );

    return await enrichPosts(res.rows);
  } catch (err) {
    await logerror('getConnectionsPosts error', [err]);
    return [];
  }
}

export async function getAccountPosts(
  accountUserId: number,
  userId?: number | null,
  limit = 20,
  cursor?: { date: string; id: number },
  filter: 'all' | 'guessed' | 'not-guessed' = 'all'
): Promise<FeedPostType[]> {
  try {
    const cursorCondition = cursor
      ? `and (p.created_at < $4 or (p.created_at = $4 and p.id < $5))`
      : '';

    let filterCondition = '';
    if (userId && filter === 'guessed') {
      filterCondition = 'and exists(select 1 from post_guesses pg where pg.post_id = p.id and pg.user_id = $3)';
    } else if (userId && filter === 'not-guessed') {
      filterCondition = 'and not exists(select 1 from post_guesses pg where pg.post_id = p.id and pg.user_id = $3)';
    }

    const params = cursor
      ? [limit, accountUserId, userId, cursor.date, cursor.id]
      : [limit, accountUserId, userId];

    const res = await query(
      `select p.id, p.type, p.title, p.created_at, p.user_id, p.status, p.zone_id, z.slug as zone_slug, u.alias as author_alias, zcp.public_url as zone_profile_photo_url,
       (select count(*) from post_guesses pg where pg.post_id = p.id) as guesses_count,
       (select count(*) from post_comments pc where pc.post_id = p.id and pc.type = 'comment') as comment_count,
       exists(select 1 from post_guesses pg where pg.post_id = p.id and pg.user_id = $3) as user_has_guessed,
       ux.level as author_level
from posts p
join zones z on z.id = p.zone_id
join users u on u.id = p.user_id
left join user_xp ux on ux.user_id = u.id
left join content_store zcp on zcp.reference_type = 'zone' and zcp.reference_id = z.id and zcp.content_type = 'profile-photo'
where p.user_id = $2 and p.status = 'published' and p.type in ('gps-photo', 'quest-completion') and z.visibility = 'public' ${filterCondition} ${cursorCondition}
order by p.created_at desc, p.id desc
limit $1`,
      params
    );

    return await enrichPosts(res.rows);
  } catch (err) {
    await logerror('getAccountPosts error', [err]);
    return [];
  }
}

export async function getToGuessPosts(
  userId: number,
  limit = 20,
  cursor?: { date: string; id: number }
): Promise<GpsPostType[]> {
  try {
    const cursorCondition = cursor
      ? `and (p.created_at < $3 or (p.created_at = $3 and p.id < $4))`
      : '';

    const params = cursor
      ? [limit, userId, cursor.date, cursor.id]
      : [limit, userId];

    const res = await query(
      `select p.id, p.type, p.title, p.created_at, p.user_id, p.status, p.zone_id, z.slug as zone_slug, u.alias as author_alias, zcp.public_url as zone_profile_photo_url,
       (select count(*) from post_guesses pg where pg.post_id = p.id) as guesses_count,
       (select count(*) from post_comments pc where pc.post_id = p.id and pc.type = 'comment') as comment_count,
       false as user_has_guessed,
       ux.level as author_level
from posts p
join zones z on z.id = p.zone_id
join users u on u.id = p.user_id
left join user_xp ux on ux.user_id = u.id
left join content_store zcp on zcp.reference_type = 'zone' and zcp.reference_id = z.id and zcp.content_type = 'profile-photo'
where p.status = 'published' and p.type = 'gps-photo' and p.user_id <> $2
  and not exists(select 1 from post_guesses pg where pg.post_id = p.id and pg.user_id = $2)
  and ${zoneMemberSql('$2')}
  ${cursorCondition}
order by p.created_at desc, p.id desc
limit $1`,
      params
    );

    return (await enrichPosts(res.rows)) as GpsPostType[];
  } catch (err) {
    await logerror('getToGuessPosts error', [err]);
    return [];
  }
}

export async function getGlobalPosts(
  userId?: number | null,
  limit = 20,
  cursor?: { date: string; id: number },
  filter: 'all' | 'guessed' | 'not-guessed' = 'all'
): Promise<FeedPostType[]> {
  try {
    const cursorCondition = cursor
      ? `and (p.created_at < $3 or (p.created_at = $3 and p.id < $4))`
      : '';

    let filterCondition = '';
    if (userId && filter === 'guessed') {
      filterCondition = 'and exists(select 1 from post_guesses pg where pg.post_id = p.id and pg.user_id = $2)';
    } else if (userId && filter === 'not-guessed') {
      filterCondition = 'and p.user_id <> $2 and not exists(select 1 from post_guesses pg where pg.post_id = p.id and pg.user_id = $2)';
    }

    const params2 = cursor
      ? [limit, userId, cursor.date, cursor.id]
      : [limit, userId];

    const res = await query(
      `select p.id, p.type, p.title, p.created_at, p.user_id, p.status, p.zone_id, z.slug as zone_slug, u.alias as author_alias, zcp.public_url as zone_profile_photo_url,
       (select count(*) from post_guesses pg where pg.post_id = p.id) as guesses_count,
       (select count(*) from post_comments pc where pc.post_id = p.id and pc.type = 'comment') as comment_count,
       exists(select 1 from post_guesses pg where pg.post_id = p.id and pg.user_id = $2) as user_has_guessed,
       ux.level as author_level
from posts p
join zones z on z.id = p.zone_id
join users u on u.id = p.user_id
left join user_xp ux on ux.user_id = u.id
left join content_store zcp on zcp.reference_type = 'zone' and zcp.reference_id = z.id and zcp.content_type = 'profile-photo'
where p.status = 'published' and p.type in ('gps-photo', 'quest-completion')
  and ${zoneMemberSql('$2')}
  ${filterCondition} ${cursorCondition}
order by p.created_at desc, p.id desc
limit $1`,
      params2
    );

    return await enrichPosts(res.rows);
  } catch (err) {
    await logerror('getGlobalPosts error', [err]);
    return [];
  }
}

export async function getPublicPosts(
  limit = 4,
  cursor?: { ids: number[] }
): Promise<(GpsPostType)[]> {
  try {
    const excludeIds = cursor?.ids ?? [];

    const res = await query(
      `with pool as (
          (
            select p.id
            from posts p
            join zones z on z.id = p.zone_id
            where p.status = 'published' and p.type = 'gps-photo' and z.visibility = 'public'
            order by p.created_at desc
            limit 30
          )
          union
          (
            select p.id
            from posts p
            join zones z on z.id = p.zone_id
            where p.status = 'published' and p.type = 'gps-photo' and z.visibility = 'public'
            order by (select count(*) from post_guesses pg where pg.post_id = p.id) desc
            limit 30
          )
       )
       select p.id, p.type, p.title, p.created_at, p.user_id, p.status, p.zone_id, z.slug as zone_slug, u.alias as author_alias,
         (select count(*) from post_guesses pg where pg.post_id = p.id)::int as guesses_count,
         (select count(*) from post_comments cmt where cmt.post_id = p.id and cmt.type = 'comment')::int as comment_count,
         ux.level as author_level
       from pool
       join posts p on p.id = pool.id
       join zones z on z.id = p.zone_id
       join users u on u.id = p.user_id
       left join user_xp ux on ux.user_id = u.id
       where p.id <> all($2::bigint[])
       order by random()
       limit $1`,
      [limit, excludeIds]
    );

    return (await enrichPosts(res.rows)) as GpsPostType[];
  } catch (err) {
    await logerror('getPublicPosts error', [err]);
    return [];
  }
}

export async function getZonePosts(
  zoneId: number,
  userId?: number | null,
  limit = 20,
  cursor?: { date: string; id: number },
  filter: 'all' | 'guessed' | 'not-guessed' = 'all',
  tagId?: number | null,
): Promise<FeedPostType[]> {
  try {
    const cursorCondition = cursor
      ? `and (p.created_at < $4 or (p.created_at = $4 and p.id < $5))`
      : '';

    let filterCondition = '';
    if (userId && filter === 'guessed') {
      filterCondition = 'and exists(select 1 from post_guesses pg where pg.post_id = p.id and pg.user_id = $3)';
    } else if (userId && filter === 'not-guessed') {
      filterCondition = 'and p.user_id <> $3 and not exists(select 1 from post_guesses pg where pg.post_id = p.id and pg.user_id = $3)';
    }

    const tagCondition = tagId ? `and exists(select 1 from post_tags pt where pt.post_id = p.id and pt.tag_id = ${Number(tagId)})` : '';

    const params = cursor
      ? [limit, zoneId, userId, cursor.date, cursor.id]
      : [limit, zoneId, userId];

    const res = await query(
      `select p.id, p.type, p.title, p.created_at, p.user_id, p.status, p.zone_id, z.slug as zone_slug, u.alias as author_alias,
       (select count(*) from post_guesses pg where pg.post_id = p.id) as guesses_count,
       (select count(*) from post_comments cmt where cmt.post_id = p.id and cmt.type = 'comment') as comment_count,
       exists(select 1 from post_guesses pg where pg.post_id = p.id and pg.user_id = $3) as user_has_guessed,
       ux.level as author_level
from posts p
join zones z on z.id = p.zone_id
join users u on u.id = p.user_id
left join user_xp ux on ux.user_id = u.id
where p.status = 'published' and p.type in ('gps-photo', 'quest-completion')
  and z.id = $2
  and ${zoneVisibleSql('$3')}
  ${filterCondition} ${tagCondition} ${cursorCondition}
order by p.created_at desc, p.id desc
limit $1`,
      params
    );

    return await enrichPosts(res.rows);
  } catch (err) {
    await logerror('getZonePosts error', [err]);
    return [];
  }
}

export async function getPostForView(userId: number, id: number): Promise<FeedPostType | null> {
  try {
    const res = await query(
      `select p.id, p.type, p.title, p.created_at, p.user_id, p.status, p.zone_id, z.slug as zone_slug, u.alias as author_alias,
       (select count(*) from post_guesses pg where pg.post_id = p.id) as guesses_count, zcp.public_url as zone_profile_photo_url,
       ux.level as author_level
from posts p
join zones z on z.id = p.zone_id
join users u on u.id = p.user_id
left join user_xp ux on ux.user_id = u.id
left join content_store zcp on zcp.reference_type = 'zone' and zcp.reference_id = z.id and zcp.content_type = 'profile-photo'
where p.id = $1 and (
  $2 = p.user_id
  or (
    p.status in ('published') and (
      z.visibility = 'public'
      or exists (
        select 1 from zone_members zm where zm.zone_id = z.id and zm.user_id = $2 and zm.status = 'active'
      )
    )
  )
)
limit 1`,
      [id, userId]
    );

    if (res.rowCount === 0) return null;
    return (await enrichPosts(res.rows))[0] ?? null;
  } catch (err) {
    await logerror('getPostForView error', [err]);
    return null;
  }
}

async function getPostById(id: number): Promise<GpsPostType | null> {
  try {
    const res = await query(
      `select p.id, p.type, p.title, p.created_at, p.user_id, p.zone_id, z.slug as zone_slug, u.alias as author_alias, uc.public_url as image_url, uc.details,
       (select count(*) from post_guesses pg where pg.post_id = p.id) as guesses_count
from posts p
join zones z on z.id = p.zone_id
join post_content pc on p.id = pc.post_id
join users u on u.id = p.user_id
join user_content uc on uc.id = pc.content_id
where p.id = $1 and p.status in ('published')
order by pc.sort
limit 1`,
      [id]
    );

    if (res.rowCount === 0) return null;
    const r = res.rows[0];
    return {
      id: r.id,
      type: r.type,
      title: r.title,
      date: r.created_at,
      userId: r.user_id,
      zoneId: r.zone_id,
      zoneSlug: r.zone_slug,
      author: r.author_alias,
      image: r.image_url || null,
      imageVariants: r.details?.variants ?? null,
      dateTaken: r.details?.dateTaken || null,
      status: r.status,
      guessCount: r.guesses_count ?? 0,
    };
  } catch (err) {
    await logerror('getPostById error', [err]);
    return null;
  }
}

export async function postIsGuessedByUser(id: number, userId: number) {
  try {
    const res = await query(
      `select id from post_guesses pg
where pg.post_id = $1 and pg.user_id = $2`,
      [id, userId]
    );

    if (res.rowCount === 0) return false;
    return true;
  } catch (err) {
    await logerror('postIsGuessedByUser error', [err]);
    return false;
  }
}

export async function canUserGuessPost(postId: number): Promise<{ canGuess: boolean; reason?: string }> {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return { canGuess: false, reason: 'not_logged_in' };
    }

    const postRes = await query(
      `select user_id from posts where id = $1 and status = 'published'`,
      [postId]
    );

    if (postRes.rowCount === 0) {
      return { canGuess: false, reason: 'post_not_found' };
    }

    const postAuthorId = postRes.rows[0].user_id;

    if (postAuthorId === user.userId) {
      return { canGuess: false, reason: 'is_author' };
    }

    const userCanGuess = await postIsGuessedByUser(postId, user.userId);

    if (!userCanGuess) {
      return { canGuess: false, reason: 'already_guessed' };
    }

    return { canGuess: true };
  } catch (err) {
    await logerror('canUserGuessPost error', [err]);
    return { canGuess: false, reason: 'error' };
  }
}

export async function createPost({
  title,
  contentId,
  zoneId,
  zoneSlug,
  status = 'published',
  idempotencyKey,
  tagId,
}: {
  title?: string;
  contentId: number;
  zoneId: number;
  zoneSlug: string;
  status?: 'processing' | 'published' | 'failed';
  idempotencyKey?: string | null;
  tagId?: number | null;
}): Promise<number | null> {
  try {
    const user = await getCurrentUser();
    if (!user) return null;
    const currentUserId = user.userId;

    if (idempotencyKey) {
      const existingReq = await query(
        `SELECT post_id FROM post_submit_requests WHERE user_id = $1 AND request_id = $2 LIMIT 1`,
        [currentUserId, idempotencyKey]
      );

      if ((existingReq.rowCount ?? 0) > 0 && existingReq.rows[0].post_id != null) {
        return existingReq.rows[0].post_id;
      }

      const claimReq = await query(
        `INSERT INTO post_submit_requests (user_id, request_id)
         VALUES ($1, $2)
         ON CONFLICT (user_id, request_id) DO NOTHING
         RETURNING id`,
        [currentUserId, idempotencyKey]
      );

      if ((claimReq.rowCount ?? 0) === 0) {
        const claimedReq = await query(
          `SELECT post_id FROM post_submit_requests WHERE user_id = $1 AND request_id = $2 LIMIT 1`,
          [currentUserId, idempotencyKey]
        );
        if ((claimedReq.rowCount ?? 0) > 0 && claimedReq.rows[0].post_id != null) {
          return claimedReq.rows[0].post_id;
        }
        return null;
      }
    }

    const postRes = await query(
      `INSERT INTO posts (user_id, type, title, status, zone_id)
       values ($1, $2, $3, $4, $5)
       RETURNING id`,
      [currentUserId, 'gps-photo', title || null, status, zoneId]
    );

    if ((postRes.rowCount ?? 0) === 0) {
      return null;
    }

    const postId = postRes.rows[0].id;

    await query(
      `INSERT INTO post_content (post_id, content_id, sort) VALUES ($1, $2, $3)`,
      [postId, contentId, 0]
    );

    if (tagId) {
      await query(
        `INSERT INTO post_tags (post_id, tag_id) VALUES ($1, $2) ON CONFLICT (post_id) DO UPDATE SET tag_id = EXCLUDED.tag_id`,
        [postId, tagId]
      );
    }

    if (idempotencyKey) {
      await query(
        `UPDATE post_submit_requests
         SET post_id = $3
         WHERE user_id = $1 AND request_id = $2 AND post_id IS NULL`,
        [currentUserId, idempotencyKey, postId]
      );
    }

    await eventBus.publish('post', status, {
      postId: +postId,
      postType: 'gps-photo',
      postTitle: title || '',
      authorId: +user.userId,
      authorAlias: user.alias,
      zoneId: +zoneId,
      zoneSlug: zoneSlug,
    } as PostCreatedEvent);

    return postId;
  } catch (err) {
    await logerror('createPost error', [err]);
    return null;
  }
}

export async function createQuestCompletionPost({
  userId,
  userAlias,
  zoneId,
  zoneSlug,
  questId,
  objectives,
}: {
  userId: number;
  userAlias: string;
  zoneId: number;
  zoneSlug: string;
  questId: number;
  objectives: { objectiveTitle: string | null; photoUrl: string | null; photoVariants: PostImageVariants | null }[];
}): Promise<number | null> {
  try {
    const existing = await query(
      `select p.id from posts p
       join post_quest_completions pqc on pqc.post_id = p.id
       where pqc.quest_id = $1 and p.user_id = $2
       limit 1`,
      [questId, userId]
    );
    if ((existing.rowCount ?? 0) > 0) {
      return existing.rows[0].id;
    }

    const title = ``;

    const postRes = await query(
      `INSERT INTO posts (user_id, type, title, status, zone_id)
       VALUES ($1, 'quest-completion', $2, 'published', $3)
       RETURNING id`,
      [userId, title, zoneId]
    );
    if ((postRes.rowCount ?? 0) === 0) {
      return null;
    }
    const postId = postRes.rows[0].id;

    await query(
      `INSERT INTO post_quest_completions (post_id, quest_id) VALUES ($1, $2)`,
      [postId, questId]
    );

    const photosWithTitles = objectives.filter((o): o is { objectiveTitle: string | null; photoUrl: string; photoVariants: PostImageVariants | null } => !!o.photoUrl);
    for (let i = 0; i < photosWithTitles.length; i++) {
      const { photoUrl, objectiveTitle, photoVariants } = photosWithTitles[i];
      const contentRes = await query(
        `INSERT INTO user_content (user_id, type, public_url, details) VALUES ($1, 'quest-photo', $2, $3::jsonb) RETURNING id`,
        [userId, photoUrl, JSON.stringify({ objectiveTitle, variants: photoVariants })]
      );
      const contentId = contentRes.rows[0].id;
      await query(
        `INSERT INTO post_content (post_id, content_id, sort) VALUES ($1, $2, $3)`,
        [postId, contentId, i]
      );
    }

    await eventBus.publish('post', 'published', {
      postId: +postId,
      postType: 'quest-completion',
      postTitle: title,
      authorId: +userId,
      authorAlias: userAlias,
      zoneId: +zoneId,
      zoneSlug,
    } as PostCreatedEvent);

    return postId;
  } catch (err) {
    await logerror('createQuestCompletionPost error', [err]);
    return null;
  }
}

export async function getPostGuesses(postId: number): Promise<PostGuessType[]> {
  try {
    const data = await query(
      `select pg.id, post_id, user_id, type, details, pg.created_at, u.alias as author_alias
from post_guesses pg
join users u on pg.user_id = u.id
where pg.post_id = $1
order by pg.created_at desc, pg.id desc`,
      [postId]
    );

    return data.rows.map(r => ({
      id: r.id,
      postId: r.post_id,
      userId: r.user_id,
      author: r.author_alias,
      type: r.type,
      createdAt: r.created_at,
      distance: r.details?.distance ?? null,
      score: r.details?.score ?? null,
    }));
  } catch (err) {
    await logerror('get guesses error', [err]);
    return [];
  }
}

export async function getUserGuesses(userId: number): Promise<(PostGuessType & { postTitle: string; postAuthor: string; postUserId: number })[]> {
  try {
    const data = await query(
      `select pg.id, pg.post_id, pg.user_id, pg.type, pg.details, pg.created_at, 
              p.title as post_title, u.alias as post_author, p.user_id as post_user_id
from post_guesses pg
join posts p on pg.post_id = p.id
join users u on p.user_id = u.id
where pg.user_id = $1 and p.status = 'published'
order by pg.created_at desc`,
      [userId]
    );

    return data.rows.map(r => ({
      id: r.id,
      postId: r.post_id,
      userId: r.user_id,
      author: '', // The user making the guess
      type: r.type,
      createdAt: r.created_at,
      distance: r.details?.distance ?? null,
      score: r.details?.score ?? null,
      postTitle: r.post_title,
      postAuthor: r.post_author,
      postUserId: r.post_user_id,
    }));
  } catch (err) {
    await logerror('getUserGuesses error', [err]);
    return [];
  }
}

export async function createPostGuess({ postId, coordinates, distance, score }: { postId: number; coordinates: { latitude: number; longitude: number } | null; distance: number, score: number }): Promise<PostGuessType | null> {
  try {
    const user = await getCurrentUser();
    if (!user) return null;
    const userId = user.userId;

    if (!(await canUserAccessPost(userId, postId))) return null;

    const post = await getPostById(postId);

    const exists = await query(
      `select pg.id, pg.post_id, pg.user_id, pg.type, pg.details, pg.created_at, u.alias as author_alias
       from post_guesses pg
       join users u on pg.user_id = u.id
       where pg.post_id = $1 and pg.user_id = $2 limit 1`,
      [postId, userId]
    );
    if (exists?.rowCount ?? 0 > 0) {
      const r = exists.rows[0];
      return {
        id: r.id,
        postId: r.post_id,
        userId: r.user_id,
        author: r.author_alias,
        type: r.type,
        createdAt: r.created_at,
        distance: r.details?.distance ?? null,
        score: r.details?.score ?? null,
      };
    }

    const data = await query(
      `insert into post_guesses (post_id, user_id, type, details) values ($1, $2, $3, $4) returning id, created_at`,
      [postId, userId, 'gps-guess', JSON.stringify({ coordinates: coordinates ?? null, distance, score })]
    );

    const guessId = data.rows[0].id;

    await createGuessComment({ postId, userId, guessId, score, distance });

    await eventBus.publish('post', 'guessed', {
      postId: +postId,
      guessType: 'gps-guess',
      authorId: +post!.userId,
      authorAlias: post!.author,
      userId: +user.userId,
      userAlias: user.alias,
      score,
      zoneId: +(post!.zoneId ?? 0),
      zoneSlug: post!.zoneSlug || 'public',
    } as PostGuessedEvent);

    return {
      id: guessId,
      postId: postId,
      userId: userId,
      author: user.alias,
      type: 'gps-guess',
      createdAt: data.rows[0].created_at,
      distance: distance,
      score: score,
    };
  } catch (err) {
    await logerror('createPostGuess error', [err]);
    return null;
  }
}

export async function createPhotoGuess({ postId, coordinates, distance, score, imageUrl }: {
  postId: number;
  coordinates: { latitude: number; longitude: number };
  distance: number;
  score: number;
  imageUrl: string;
}): Promise<PostGuessType | null> {
  try {
    const user = await getCurrentUser();
    if (!user) return null;
    const userId = user.userId;

    if (!(await canUserAccessPost(userId, postId))) return null;

    const post = await getPostById(postId);
    if (!post) return null;

    const exists = await query(
      `select pg.id, pg.post_id, pg.user_id, pg.type, pg.details, pg.created_at, u.alias as author_alias
       from post_guesses pg
       join users u on pg.user_id = u.id
       where pg.post_id = $1 and pg.user_id = $2 limit 1`,
      [postId, userId]
    );
    if ((exists?.rowCount ?? 0) > 0) {
      const r = exists.rows[0];
      return {
        id: r.id,
        postId: r.post_id,
        userId: r.user_id,
        author: r.author_alias,
        type: r.type,
        createdAt: r.created_at,
        distance: r.details?.distance ?? null,
        score: r.details?.score ?? null,
      };
    }

    const data = await query(
      `insert into post_guesses (post_id, user_id, type, details) values ($1, $2, $3, $4) returning id, created_at`,
      [postId, userId, 'gps-photo-guess', JSON.stringify({ coordinates, distance, score })]
    );

    const guessId = data.rows[0].id;

    await query(
      `insert into user_content (user_id, type, public_url, details)
       values ($1, 'guess-photo', $2, $3)`,
      [userId, imageUrl, JSON.stringify({ guessId, postId })]
    );

    await createGuessComment({ postId, userId, guessId, score, distance, type: 'gps-photo-guess-comment', imageUrl });

    await eventBus.publish('post', 'guessed', {
      postId: +postId,
      guessType: 'gps-photo-guess',
      authorId: +post.userId,
      authorAlias: post.author,
      userId: +user.userId,
      userAlias: user.alias,
      score,
      zoneId: +(post.zoneId ?? 0),
      zoneSlug: post.zoneSlug || 'public',
    } as PostGuessedEvent);

    return {
      id: guessId,
      postId: postId,
      userId: userId,
      author: user.alias,
      type: 'gps-photo-guess',
      createdAt: data.rows[0].created_at,
      distance: distance,
      score: score,
    };
  } catch (err) {
    await logerror('createPhotoGuess error', [err]);
    return null;
  }
}

export async function getPhotoCoordinates({ postId }: { postId: number }): Promise<{ coordinates: { latitude: number; longitude: number } } | null> {
  try {
    const user = await getCurrentUser();
    if (!user) return null;
    if (!(await canUserAccessPost(user.userId, postId))) return null;

    const data = await query(
      `select details from posts p
    join post_content pc on p.id = pc.post_id
         join user_content uc on uc.id = pc.content_id
where p.id = $1`,
      [postId]
    );

    return { coordinates: data.rows[0].details.coordinates };
  } catch (err) {
    await logerror('getPhotoCoordinates error', [err]);
    return null;
  }
}

export async function getPostGuessMapPoints(postId: number): Promise<PostGuessMapDataType> {
  try {
    const user = await getCurrentUser();
    if (!user) return { guessPoints: [], photoCoordinates: null };

    const ownerRes = await query(
      `select user_id from posts where id = $1 limit 1`,
      [postId]
    );

    if (ownerRes.rowCount === 0) return { guessPoints: [], photoCoordinates: null };
    if (Number(ownerRes.rows[0].user_id) !== Number(user.userId)) return { guessPoints: [], photoCoordinates: null };

    const data = await query(
      `select pg.details, u.alias as author_alias
from post_guesses pg
join users u on pg.user_id = u.id
where pg.post_id = $1
order by pg.created_at desc`,
      [postId]
    );

    const points: PostGuessMapPointType[] = [];
    for (const r of data.rows) {
      const lat = Number(r.details?.coordinates?.latitude);
      const lng = Number(r.details?.coordinates?.longitude);
      if (!isFinite(lat) || !isFinite(lng)) continue;

      points.push({
        author: r.author_alias,
        score: r.details?.score ?? null,
        distance: r.details?.distance ?? null,
        coordinates: { latitude: lat, longitude: lng },
      });
    }

    const photoRes = await query(
      `select uc.details from posts p
       join post_content pc on p.id = pc.post_id
       join user_content uc on uc.id = pc.content_id
       where p.id = $1 limit 1`,
      [postId]
    );

    let photoCoordinates: { latitude: number; longitude: number } | null = null;
    if (photoRes.rowCount && photoRes.rowCount > 0) {
      const lat = Number(photoRes.rows[0].details?.coordinates?.latitude);
      const lng = Number(photoRes.rows[0].details?.coordinates?.longitude);
      if (isFinite(lat) && isFinite(lng)) {
        photoCoordinates = { latitude: lat, longitude: lng };
      }
    }

    return { guessPoints: points, photoCoordinates };
  } catch (err) {
    await logerror('getPostGuessMapPoints error', [err]);
    return { guessPoints: [], photoCoordinates: null };
  }
}

export async function updatePostTitle(postId: number, newTitle: string) {
  try {
    const user = await getCurrentUser();
    if (!user) return false;

    const res = await query(
      `update posts set title = $1 where id = $2 and user_id = $3 returning id`,
      [newTitle, postId, user.userId]
    );

    return res.rowCount === 1;
  } catch (err) {
    await logerror('updatePostTitle error', [err]);
    return false;
  }
}

export async function deletePost(postId: number) {
  try {
    const user = await getCurrentUser();
    if (!user) return false;

    const postRes = await query(
      `select p.id, p.type, p.user_id, p.zone_id, z.slug as zone_slug, u.alias as author_alias
       from posts p
       join zones z on z.id = p.zone_id
       join users u on p.user_id = u.id
       where p.id = $1 and p.status != 'deleted'`,
      [postId]
    );

    if (postRes.rowCount === 0) {
      return false;
    }

    const post = postRes.rows[0];

    if (user.userId != +post.user_id) {
      return false;
    }

    await query(`update posts set status = 'deleted', deleted_at = now() where id = $1`, [postId]);

    await eventBus.publish('post', 'deleted', {
      postId: +postId,
      postType: post.type,
      authorId: +post.user_id,
      authorAlias: post.author_alias,
      zoneId: +post.zone_id,
      zoneSlug: post.zone_slug,
    } as PostDeletedEvent);

    return true;
  } catch (err) {
    await logerror('deletePost error', [err]);
    return false;
  }
}
