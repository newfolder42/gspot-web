import { NextResponse } from 'next/server';
import { getUserTokenAndValidate } from '@/lib/session';
import pool from '@/lib/db';

export async function GET(
    req: Request,
    { params }: { params: { userName: string } }
) {
    try {
        const { userName } = await params;

        let currentUserId: number | null = null;

        try {
            const payload = await getUserTokenAndValidate();
            currentUserId = payload?.userId;
            if (!currentUserId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        } catch (e) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        const userRes = await pool.query(
            `SELECT u.id, u.alias, u.name, u.email, u.created_at, uc.id as profilePhotoId, details as profilePhotoDetails
        FROM users u
        left join user_content uc on u.id = uc.user_id AND uc.type = 'profile-photo'
        WHERE alias = \$1`,
            [userName]
        );

        if (userRes.rows.length === 0) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const user = userRes.rows[0];
        const isOwnProfile = currentUserId == user.id;

        return NextResponse.json({
            user: {
                id: user.id,
                alias: user.alias,
                name: user.name,
                email: user.email,
                created_at: user.created_at,
            },
            profilePhoto: user.profilePhotoId ? {
                id: user.profilePhotoId,
                details: user.profilePhotoDetails,
            } : null,
            isOwnProfile,
        });
    } catch (err) {
        console.error('/api/account/[userName] error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
