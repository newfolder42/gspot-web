import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyOTP } from '@/lib/otp';
import { resetPassword } from '@/lib/auth';
import { logerror } from '@/lib/logger';

const ResetPasswordSchema = z.object({
  email: z.string().email().max(255),
  code: z.string().regex(/^\d{6}$/),
  newPassword: z.string().min(6).max(128),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = ResetPasswordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'INVALID_INPUT' }, { status: 400 });
    }

    const { email, code, newPassword } = parsed.data;

    const otpResult = await verifyOTP(email, code);
    if (!otpResult.success) {
      const status = otpResult.error === 'EXPIRED' ? 410 : 400;
      return NextResponse.json({ error: otpResult.error }, { status });
    }

    const result = await resetPassword(email, newPassword);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    await logerror('POST /api/v1/auth/reset-password error', { error: String(err) });
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
  }
}
