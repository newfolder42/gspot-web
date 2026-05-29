import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyOTP } from '@/lib/otp';
import { completePendingRegistration } from '@/lib/auth';
import { logerror } from '@/lib/logger';

const VerifyOTPSchema = z.object({
  email: z.string().email().max(255),
  code: z.string().regex(/^\d{6}$/),
  type: z.enum(['registration', 'password-reset']),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = VerifyOTPSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'INVALID_INPUT' }, { status: 400 });
    }

    const { email, code, type } = parsed.data;

    const otpResult = await verifyOTP(email, code);

    if (!otpResult.success) {
      const status = otpResult.error === 'EXPIRED' ? 410 : 400;
      return NextResponse.json({ error: otpResult.error }, { status });
    }

    if (type === 'registration') {
      const result = await completePendingRegistration(email);
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    await logerror('POST /api/v1/auth/verify-otp error', { error: String(err) });
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
  }
}
