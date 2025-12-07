"use server";

import { query } from '@/lib/db';
import { getCurrentUser } from './session';
import { logerror } from './logger';

export async function storeContent(url: string, type: string, details: any) {
    if (!type)
        return null;
    
    try {
        const user = await getCurrentUser();
        if (!user)
            return null;
        const currentUserId = user?.userId;

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
        logerror('upload-photo error:', [err]);
        return null;
    }
}
