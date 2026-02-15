"use server";

import { query } from '@/lib/db';
import { getCurrentUser } from './session';
import { logerror } from './logger';
import type { GpsPostType } from '@/types/post';
import type { PostGuessType } from '@/types/post-guess';
import { PostCreatedEvent } from '@/types/events/post-created';
import { eventBus } from './eventBus';
import { PostGuessedEvent } from '@/types/events/post-guessed';

export async function getConnectionsPosts(
  userId: number,
  accountUserId: number,
  limit: number,
  cursor?: { date: string; id: number }
): Promise<(GpsPostType)[]> {
  try {
    const cursorCondition = cursor
      ? `and (p.created_at < $3 or (p.created_at = $3 and p.id < $4))`
      : '';
    
    const params = cursor
      ? [limit, accountUserId, cursor.date, cursor.id]
      : [limit, accountUserId];

    const res = await query(
      `select p.id, p.type, p.title, p.created_at, p.user_id, p.status, u.alias as author_alias, uc.public_url as image_url,
       (select count(*) from post_guesses pg where pg.post_id = p.id) as guesses_count
from user_connections ucn
join posts p on ucn.connection_id = p.user_id
join post_content pc on p.id = pc.post_id
join users u on u.id = p.user_id
join user_content uc on uc.user_id = p.user_id and uc.type = 'gps-photo' and pc.content_id = uc.id
where ucn.user_id = $2 and p.status in ('published') ${cursorCondition}
order by p.created_at desc, p.id desc
limit $1`,
      params
    );

    return res.rows.map((r) => ({
      id: r.id,
      type: r.type,
      title: r.title,
      author: r.author_alias,
      date: r.created_at,
      userId: r.user_id,
      image: r.image_url,
      status: r.status,
      guessCount: r.guesses_count ?? 0,
    }));
  } catch (err) {
    await logerror('getConnectionsPosts error', [err]);
    return [];
  }
}

export async function getAccountPosts(
  userId: number,
  accountUserId: number,
  limit = 20,
  cursor?: { date: string; id: number }
): Promise<(GpsPostType)[]> {
  try {
    const cursorCondition = cursor
      ? `and (p.created_at < $3 or (p.created_at = $3 and p.id < $4))`
      : '';
    
    const params = cursor
      ? [limit, accountUserId, cursor.date, cursor.id]
      : [limit, accountUserId];

    const res = await query(
      `select p.id, p.type, p.title, p.created_at, p.user_id, p.status, u.alias as author_alias, uc.public_url as image_url, uc.details,
       (select count(*) from post_guesses pg where pg.post_id = p.id) as guesses_count
from posts p
join post_content pc on p.id = pc.post_id
join users u on u.id = p.user_id
join user_content uc on uc.user_id = p.user_id and uc.type = 'gps-photo' and pc.content_id = uc.id
where p.user_id = $2 ${cursorCondition}
order by p.created_at desc, p.id desc
limit $1`,
      params
    );

    return res.rows.map((r) => ({
      id: r.id,
      type: r.type,
      title: r.title,
      author: r.author_alias,
      date: r.created_at,
      userId: r.user_id,
      image: r.image_url,
      dateTaken: r.details?.dateTaken || null,
      status: r.status,
      guessCount: r.guesses_count ?? 0,
    }));
  } catch (err) {
    await logerror('getAccountPosts error', [err]);
    return [];
  }
}

export async function getGlobalPosts(
  userId: number,
  limit = 20,
  cursor?: { date: string; id: number }
): Promise<(GpsPostType)[]> {
  try {
    const cursorCondition = cursor
      ? `and (p.created_at < $2 or (p.created_at = $2 and p.id < $3))`
      : '';
    
    const params = cursor
      ? [limit, cursor.date, cursor.id]
      : [limit];

    const res = await query(
      `select p.id, p.type, p.title, p.created_at, p.user_id, p.status, u.alias as author_alias, uc.public_url as image_url, uc.details,
       (select count(*) from post_guesses pg where pg.post_id = p.id) as guesses_count
from posts p
join post_content pc on p.id = pc.post_id
join users u on u.id = p.user_id
join user_content uc on uc.user_id = p.user_id and uc.type = 'gps-photo' and pc.content_id = uc.id
where p.status = 'published' ${cursorCondition}
order by p.created_at desc, p.id desc
limit $1`,
      params
    );

    return res.rows.map((r) => ({
      id: r.id,
      type: r.type,
      title: r.title,
      author: r.author_alias,
      date: r.created_at,
      userId: r.user_id,
      image: r.image_url,
      dateTaken: r.details?.dateTaken || null,
      status: r.status,
      guessCount: r.guesses_count ?? 0,
    }));
  } catch (err) {
    await logerror('getGlobalPosts error', [err]);
    return [];
  }
}

export async function getPostForView(userId: number, id: number): Promise<GpsPostType | null> {
  try {
    const res = await query(
      `select p.id, p.type, p.title, p.created_at, p.user_id, p.status, u.alias as author_alias, uc.public_url as image_url, uc.details,
       (select count(*) from post_guesses pg where pg.post_id = p.id) as guesses_count
from posts p
join post_content pc on p.id = pc.post_id
join users u on u.id = p.user_id
join user_content uc on uc.id = pc.content_id
where p.id = $1 and ($2 = p.user_id or p.status in ('published'))
order by pc.sort
limit 1`,
      [id, userId]
    );

    if (res.rowCount === 0) return null;
    const r = res.rows[0];
    return {
      id: r.id,
      type: r.type,
      title: r.title,
      date: r.created_at,
      userId: r.user_id,
      author: r.author_alias,
      image: r.image_url || null,
      dateTaken: r.details?.dateTaken || null,
      status: r.status,
      guessCount: r.guesses_count ?? 0,
    };
  } catch (err) {
    await logerror('getPostForView error', [err]);
    return null;
  }
}

async function getPostById(id: number): Promise<GpsPostType | null> {
  try {
    const res = await query(
      `select p.id, p.type, p.title, p.created_at, p.user_id, u.alias as author_alias, uc.public_url as image_url, uc.details,
       (select count(*) from post_guesses pg where pg.post_id = p.id) as guesses_count
from posts p
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
      author: r.author_alias,
      image: r.image_url || null,
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

    if (res.rowCount === 0) return true;
    return false;
  } catch (err) {
    await logerror('postIsGuessedByUser error', [err]);
    return false;
  }
}

export async function createPost({ title, contentId, status = 'published' }: { title?: string; contentId: number; status?: 'processing' | 'published' | 'failed' }) {
  try {
    const user = await getCurrentUser();
    if (!user) return;
    const currentUserId = user.userId;

    const postRes = await query(
      `INSERT INTO posts (user_id, type, title, status) VALUES ($1, $2, $3, $4) RETURNING id`,
      [currentUserId, 'gps-photo', title || null, status]
    );

    const postId = postRes.rows[0].id;

    await query(
      `INSERT INTO post_content (post_id, content_id, sort) VALUES ($1, $2, $3)`,
      [postId, contentId, 0]
    );

    await eventBus.publish('post', status, {
      postId: +postId,
      postType: 'gps-photo',
      postTitle: title || '',
      authorId: +user.userId,
      authorAlias: user.alias,
    } as PostCreatedEvent);
  } catch (err) {
    await logerror('createPost error', [err]);
    return false;
  }
}

export async function getPostGuesses(postId: number): Promise<PostGuessType[]> {
  try {
    const data = await query(
      `select pg.id, post_id, user_id, type, details, pg.created_at, u.alias as author_alias
from post_guesses pg
join users u on pg.user_id = u.id
where pg.post_id = $1
order by pg.created_at desc`,
      [postId]
    );

    return data.rows.map((r) => ({
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

export async function createPostGuess({ postId, coordinates, distance, score }: { postId: number; coordinates: { latitude: number; longitude: number } | null; distance: number, score: number }) {
  try {
    const user = await getCurrentUser();
    if (!user) return null;
    const userId = user.userId;

    const post = await getPostById(postId);

    const exists = await query(
      `select id from post_guesses where post_id = $1 and user_id = $2 limit 1`,
      [postId, userId]
    );
    if (exists?.rowCount ?? 0 > 0) {
      return { id: exists.rows[0].id };
    }

    const data = await query(
      `insert into post_guesses (post_id, user_id, type, details) values ($1, $2, $3, $4) returning id`,
      [postId, userId, 'gps-guess', JSON.stringify({ coordinates: coordinates ?? null, distance, score })]
    );

    await eventBus.publish('post', 'guessed', {
      postId: +postId,
      guessType: 'gps-guess',
      authorId: +post!.userId,
      authorAlias: post!.author,
      userId: +user.userId,
      userAlias: user.alias,
      score,
    } as PostGuessedEvent);

    return { id: data.rows[0].id };
  } catch (err) {
    await logerror('createPostGuess error', [err]);
    return null;
  }
}

export async function getPhotoCoordinates({ postId }: { postId: number }): Promise<{ coordinates: { latitude: number; longitude: number } } | null> {
  try {
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
    await query('BEGIN');

    const pcRes = await query(`select content_id from post_content where post_id = $1`, [postId]);
    const contentIds = pcRes.rows.map((r) => r.content_id).filter(Boolean);

    for (const cid of contentIds) {
      try {
        const uc = await query(`select public_url from user_content where id = $1`, [cid]);
        const ucRowCount = uc?.rowCount ?? 0;
        if (ucRowCount > 0) {
          const publicUrl = uc.rows[0].public_url;
          if (publicUrl) {
            try {
              const key = new URL(publicUrl).pathname.replace(/^\//, '');
              const { deleteObject } = await import('./s3');
              await deleteObject(key);
            } catch (s3Err) {
              await logerror('deletePost s3 delete error', [s3Err, publicUrl]);
            }
          }
        }
      } catch (err) {
        await logerror('deletePost fetch user_content error', [err, cid]);
      }
    }

    await query(`delete from post_content where post_id = $1`, [postId]);

    if (contentIds.length > 0) {
      await query(`delete from user_content where id = any($1::bigint[])`, [contentIds]);
    }

    const res = await query(`delete from posts where id = $1 returning id`, [postId]);

    await query('COMMIT');

    return res.rowCount === 1;
  } catch (err) {
    await logerror('deletePost error', [err]);
    return false;
  }
}
