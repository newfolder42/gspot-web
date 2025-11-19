import { NextRequest, NextResponse } from 'next/server';
import { signup } from '@/lib/auth';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        const user = await signup(body);

        return NextResponse.json({ user }, { status: 201 });
    } catch (err) {
        if (err instanceof Error && err.message === 'USER_EXISTS') {
            return NextResponse.json({ error: err.message }, { status: 409 });
        }
        if (err instanceof Error && err.message === 'INVALID_INPUT') {
            return NextResponse.json({ error: err.message }, { status: 400 });
        }

        console.error(err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
