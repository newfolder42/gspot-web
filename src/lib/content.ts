import pool from '@/lib/db';

export async function storeContent(userId: number, type: string, publicUrl: string, details: string) {
    try {
        const res = await pool.query(
            `INSERT INTO user_content (user_id, type, public_url, details, created_at) 
               VALUES ($1, $2, $3, $4, NOW()) 
               RETURNING id`,
            [userId, type, publicUrl, details]
        );

        return {
            id: res.rows[0].id,
        };
    } catch (err) {
        console.error('storeContent error', err);
        return null;
    }
}
