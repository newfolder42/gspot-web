"use server";

import { query } from '@/lib/db';
import { getCurrentUser } from './session';
import { logerror } from './logger';
import type { GpsPostType } from '@/types/post';

export async function getConnectionsPosts(userId: number, accountUserId: number, limit: number): Promise<(GpsPostType)[]> {
    try {
        const res = await query(
            `select p.id, p.type, p.title, p.created_at, u.alias as author_alias, uc.public_url as image_url
from user_connections ucn
join posts p on ucn.connection_id = p.user_id
join post_content pc on p.id = pc.post_id
join users u on u.id = p.user_id
join user_content uc on uc.user_id = p.user_id and uc.type = 'gps-photo' and pc.content_id = uc.id
where ucn.user_id = $2
order by p.created_at desc
limit $1`,
            [limit, accountUserId]
        );

        return res.rows.map((r) => ({
            id: r.id,
            type: r.type,
            title: r.title,
            author: r.author_alias,
            date: r.created_at,
            image: r.image_url,
        }));
    } catch (err) {
        logerror('getConnectionsPosts error', [err]);
        return [];
    }
}

export async function getAccountPosts(userId: number, limit = 20): Promise<(GpsPostType)[]> {
    try {
        const res = await query(
            `select p.id, p.type, p.title, p.created_at, u.alias as author_alias, uc.public_url as image_url
from posts p
join post_content pc on p.id = pc.post_id
join users u on u.id = p.user_id
join user_content uc on uc.user_id = p.user_id and uc.type = 'gps-photo' and pc.content_id = uc.id
where p.user_id = $2
order by p.created_at desc
limit $1`,
            [limit, userId]
        );

        return res.rows.map((r) => ({
            id: r.id,
            type: r.type,
            title: r.title,
            author: r.author_alias,
            date: r.created_at,
            image: r.image_url,
        }));
    } catch (err) {
        logerror('getAccountPosts error', [err]);
        return [];
    }
}

export async function getGlobalPosts(userId: number, limit = 20): Promise<(GpsPostType)[]> {
    try {
        const res = await query(
            `select p.id, p.type, p.title, p.created_at, u.alias as author_alias, uc.public_url as image_url
from posts p
join post_content pc on p.id = pc.post_id
join users u on u.id = p.user_id
join user_content uc on uc.user_id = p.user_id and uc.type = 'gps-photo' and pc.content_id = uc.id
order by p.created_at desc
limit $1`,
            [limit]
        );

        return res.rows.map((r) => ({
            id: r.id,
            type: r.type,
            title: r.title,
            author: r.author_alias,
            date: r.created_at,
            image: r.image_url,
        }));
    } catch (err) {
        logerror('getGlobalPosts error', [err]);
        return [];
    }
}

export async function getPostById(id: number): Promise<GpsPostType | null> {
    try {
        const res = await query(
            `select p.id, p.type, p.title, p.created_at, u.alias as author_alias, uc.public_url as image_url
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
            type: r.type,
            title: r.title,
            date: r.created_at,
            author: r.author_alias,
            image: r.image_url || null,
        };
    } catch (err) {
        logerror('getPostById error', [err]);
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
        logerror('postIsGuessedByUser error', [err]);
        return false;
    }
}

export async function createPost({ title, contentId }: { title?: string; contentId: number }) {
    try {
        const user = await getCurrentUser();
        if (!user) return;
        const currentUserId = user.userId;

        const postRes = await query(
            `INSERT INTO posts (user_id, type, title) VALUES ($1, $2, $3) RETURNING id`,
            [currentUserId, 'gps-photo', title || null]
        );

        const postId = postRes.rows[0].id;

        await query(
            `INSERT INTO post_content (post_id, content_id, sort) VALUES ($1, $2, $3)`,
            [postId, contentId, 0]
        );
    } catch (err) {
        logerror('createPost error', [err]);
        return false;
    }
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
        logerror('get guesses error', [err]);
        return [];
    }
}

export async function createPostGuess({ postId, coordinates, score }: { postId: number; coordinates: { latitude: number; longitude: number } | null; score?: number | null }) {
    try {
        const user = await getCurrentUser();
        if (!user) return null;
        const userId = user.userId;

        const data = await query(
            `insert into post_guesses (post_id, user_id, type, details) values ($1, $2, $3, $4) returning id`,
            [postId, userId, 'gps-guess', JSON.stringify({ coordinates: coordinates ?? null, score: score ?? null })]
        );

        return { id: data.rows[0].id };
    } catch (err) {
        logerror('createPostGuess error', [err]);
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
        logerror('getPhotoCoordinates error', [err]);
        return null;
    }
}