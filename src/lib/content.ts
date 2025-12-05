"use server";

import { query } from '@/lib/db';
import { getCurrentUser } from './session';

export async function storeContent(url: string, type: string, details: any) {
    try {
        if (!type)
            return null;

        const user = await getCurrentUser();
        if (!user)
            return null;
        const currentUserId = user?.userId;

        try {
            const res = await query(
                `INSERT INTO user_content (user_id, type, public_url, details, created_at) 
               VALUES ($1, $2, $3, $4, NOW()) 
               RETURNING id`,
                [currentUserId, type, url, JSON.stringify(details)]
            );

            return {
                id: res.rows[0].id
            };
        } catch (err) {
            console.error('storeContent error', err);
            return null;
        }
    } catch (err) {
        console.error('upload-photo error:', err);
        return null;
    }
}
