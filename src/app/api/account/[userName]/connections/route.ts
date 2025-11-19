import { NextResponse } from 'next/server';
import { getUserTokenAndValidate } from '@/lib/session';
import { getConnectionsForUserByAlias, connectionExists, createConnection, deleteConnection } from '@/lib/connections';
import { getUserIdByAlias } from '@/lib/users';

export async function POST(
    req: Request,
    { params }: { params: { userName: string } }
) {
    let currentUserId: number;
    try {

        const payload = await getUserTokenAndValidate();
        currentUserId = payload?.userId ?? null;
        if (!currentUserId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    catch (err) {
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    try {
        const { userName } = await params;
        if (!userName) return NextResponse.json({ error: 'Username required' }, { status: 400 });

        const targetId = await getUserIdByAlias(userName);
        if (!targetId) return NextResponse.json({ error: 'User not found' }, { status: 404 });
        if (currentUserId === targetId) return NextResponse.json({ error: 'Cannot follow yourself' }, { status: 400 });

        const type = 'connection';
        const exists = await connectionExists(currentUserId, targetId, type);
        if (exists) {
            return NextResponse.json({ success: true, alreadyConnected: true }, { status: 200 });
        }

        const insert = await createConnection(currentUserId, targetId, type);
        return NextResponse.json({ success: true, connection: insert });
    } catch (err) {
        console.error('/api/account/[userName]/connections POST error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function DELETE(
    req: Request,
    { params }: { params: { userName: string } }
) {
    let currentUserId: number;
    try {
        const payload = await getUserTokenAndValidate();
        currentUserId = payload?.userId ?? null;
        if (!currentUserId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    } catch (err) {
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    try {
        const { userName } = await params;
        if (!userName) return NextResponse.json({ error: 'Username required' }, { status: 400 });

        const targetId = await getUserIdByAlias(userName);
        if (!targetId) return NextResponse.json({ error: 'User not found' }, { status: 404 });

        const type = 'connection';
        const removed = await deleteConnection(currentUserId, targetId, type);
        if (!removed) return NextResponse.json({ success: true, removed: false }, { status: 200 });

        return NextResponse.json({ success: true, removed: true });
    } catch (err) {
        console.error('/api/account/[userName]/connections DELETE error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function GET(
    req: Request,
    { params }: { params: { userName: string } }
) {
    try {
        const { userName } = await params;
        if (!userName) return NextResponse.json({ error: 'Username required' }, { status: 400 });

        let currentUserId: number | null = null;
        try {
            const payload = await getUserTokenAndValidate();
            currentUserId = payload?.userId ?? null;
            if (!currentUserId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        } catch (e) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        const connections = await getConnectionsForUserByAlias(userName);
        const targetId = await getUserIdByAlias(userName);
        const isOwnProfile = Boolean(targetId && currentUserId == targetId);

        return NextResponse.json({
            connections: connections ?? [],
            isOwnProfile
        });
    } catch (err) {
        console.error('/api/account/[userName]/connections GET error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
