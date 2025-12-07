"use server";

import { query } from '@/lib/db';
import { getCurrentUser } from './session';
import { deleteObject } from './s3';

export async function storeContent(url: string, type: string, details: any) {
    if (!type) return null;

    const user = await getCurrentUser();
    if (!user) return null;
    const currentUserId = user?.userId;

    try {
        // If uploading a profile photo and one already exists, overwrite it
        if (type === 'profile-photo') {
            const existingRes = await query(
                `SELECT id, public_url FROM user_content WHERE user_id = $1 AND type = $2 ORDER BY created_at DESC LIMIT 1`,
                [currentUserId, 'profile-photo']
            );

            if (existingRes.rows.length > 0) {
                const existing = existingRes.rows[0];

                // Best-effort: delete existing S3 object
                if (existing.public_url) {
                    try {
                        const key = new URL(existing.public_url).pathname.replace(/^\//, '');
                        await deleteObject(key);
                    } catch (s3Err) {
                        console.warn('Failed to delete existing S3 object for profile-photo', s3Err);
                    }
                }

                // Update the existing DB row with the new URL/details and timestamp
                const upd = await query(
                    `UPDATE user_content SET public_url = $1, details = $2, created_at = NOW() WHERE id = $3 RETURNING id`,
                    [url, JSON.stringify(details), existing.id]
                );

                return { id: upd.rows[0].id, replacedOldId: existing.id };
            }
        }

        // No existing profile-photo -> insert a new row
        const res = await query(
            `INSERT INTO user_content (user_id, type, public_url, details, created_at) 
                             VALUES ($1, $2, $3, $4, NOW()) 
                             RETURNING id`,
            [currentUserId, type, url, JSON.stringify(details)]
        );

        return { id: res.rows[0].id };
    } catch (err) {
        console.error('storeContent error', err);
        return null;
    }
}
