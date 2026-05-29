import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { initiatePasswordReset } from '@/lib/auth';
import { logerror } from '@/lib/logger';

const ForgotPasswordSchema = z.object({
  email: z.string().email().max(255),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = ForgotPasswordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'INVALID_INPUT' }, { status: 400 });
    }

    // Always return success to prevent email enumeration
    await initiatePasswordReset(parsed.data.email);

    return NextResponse.json({ success: true });
  } catch (err) {
    await logerror('POST /api/v1/auth/forgot-password error', { error: String(err) });
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
  }
}
