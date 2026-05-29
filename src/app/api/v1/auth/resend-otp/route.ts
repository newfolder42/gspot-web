import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { resendOTP } from '@/lib/otp';
import { logerror } from '@/lib/logger';

const ResendOTPSchema = z.object({
  email: z.string().email().max(255),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = ResendOTPSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'INVALID_INPUT' }, { status: 400 });
    }

    const result = await resendOTP(parsed.data.email);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    await logerror('POST /api/v1/auth/resend-otp error', { error: String(err) });
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
  }
}
