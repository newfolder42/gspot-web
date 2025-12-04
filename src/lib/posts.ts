"use server";

import { query } from '@/lib/db';
import { getUserTokenAndValidate } from './session';

export async function getRecentPosts(limit = 20) {
    try {
        const res = await query(
            `select p.id, p.title, p.created_at, u.alias as author_alias, uc.public_url as image_url
from posts p
join post_content pc on p.id = pc.post_id
join users u on u.id = p.user_id
join user_content uc on uc.user_id = p.user_id and uc.type = 'gps-photo' and pc.content_id = uc.id
order by p.created_at desc
limit $1`,
            [limit]
        );

        return res.rows.map((r: any) => ({
            id: r.id,
            title: r.title,
            author: r.author_alias,
            date: r.created_at,
            image: r.image_url || null,
            type: 'photo',
        }));
    } catch (err) {
        console.error('getRecentPosts error', err);
        return [];
    }
}

export async function getPostById(id: number) {
    try {
        const res = await query(
            `select p.id, p.title, p.created_at, p.user_id, u.alias as author_alias, uc.public_url as image_url, uc.id as content_id
from posts p
join post_content pc on p.id = pc.post_id
join users u on u.id = p.user_id
join user_content uc on uc.id = pc.content_id
where p.id = $1
order by pc.sort
limit 1`,
            [id]
        );

        if (res.rowCount === 0) return null;
        const r = res.rows[0];
        return {
            id: r.id,
            title: r.title,
            date: r.created_at,
            author: r.author_alias,
            userId: r.user_id,
            image: r.image_url || null,
            contentId: r.content_id || null,
        };
    } catch (err) {
        console.error('getPostById error', err);
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
        console.error('postIsGuessedByUser error', err);
        return false;
    }
}

export async function createPost({ title, contentId }: { title?: string; contentId: number }) {
    const payload = await getUserTokenAndValidate();
    const currentUserId = payload.userId as number;

    const postRes = await query(
        `INSERT INTO posts (user_id, type, title) VALUES ($1, $2, $3) RETURNING id`,
        [currentUserId, 'photo', title || null]
    );

    const postId = postRes.rows[0].id;

    await query(
        `INSERT INTO post_content (post_id, content_id, sort) VALUES ($1, $2, $3)`,
        [postId, contentId, 0]
    );

    //emitAsyncEvent({ type: 'post-created', payload: { userId: currentUserId, type: 'photo', postId } });
}

export async function getPostGuesses(postId: number) {
    try {
        const data = await query(
            `select pg.id, post_id, user_id, type, details, pg.created_at, u.alias as author_alias
from post_guesses pg
join users u on pg.user_id = u.id
where pg.post_id = $1
order by pg.created_at desc`,
            [postId]
        );

        return data.rows.map((r: any) => {
            return {
                id: r.id,
                postId: r.post_id,
                userId: r.user_id ?? null,
                author: r.author_alias ?? null,
                type: r.type ?? null,
                createdAt: r.created_at,
                score: r.details?.score ?? null,
            };
        });
    } catch (err) {
        console.error('get guesses error', err);
        return [];
    }
}

export async function createPostGuess({ postId, coordinates, score }: { postId: number; coordinates: { latitude: number; longitude: number } | null; score?: number | null }) {
    try {
        const payload = await getUserTokenAndValidate();
        const userId = payload.userId;

        const data = await query(
            `insert into post_guesses (post_id, user_id, type, details) values ($1, $2, $3, $4) returning id`,
            [postId, userId, 'gps-guess', JSON.stringify({ coordinates: coordinates ?? null, score: score ?? null })]
        );

        return { id: data.rows[0].id };
    } catch (err) {
        console.error('post guesses error', err);
        return null;
    }
}

export async function getPhotoCoordinates({ postId }: { postId: number }) {
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
        console.error('photoCoordinates error', err);
        return null;
    }
}