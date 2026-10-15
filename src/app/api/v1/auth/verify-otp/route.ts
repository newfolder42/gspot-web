import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyOTP } from '@/lib/otp';
import { verifyAndCompleteRegistration } from '@/lib/auth';
import { userExistsByEmail } from '@/lib/password';
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

    if (type === 'registration') {
      const result = await verifyAndCompleteRegistration(email, code);
      if (!result.success) {
        const status = result.error === 'EXPIRED' ? 410 : 400;
        return NextResponse.json({ error: result.error }, { status });
      }
      return NextResponse.json({ success: true });
    }

    // Password-reset codes only exist for existing users; don't spend a signup code here.
    if (!(await userExistsByEmail(email))) {
      return NextResponse.json({ error: 'INVALID_CODE' }, { status: 400 });
    }

    const otpResult = await verifyOTP(email, code);
    if (!otpResult.success) {
      const status = otpResult.error === 'EXPIRED' ? 410 : 400;
      return NextResponse.json({ error: otpResult.error }, { status });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    await logerror('POST /api/v1/auth/verify-otp error', { error: String(err) });
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
  }
}
