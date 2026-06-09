import { NextRequest, NextResponse } from 'next/server';
import { checkZoneSlugAvailable } from '@/lib/zones';
import { logerror } from '@/lib/logger';

export async function GET(req: NextRequest) {
  try {
    const slug = req.nextUrl.searchParams.get('slug') ?? '';
    const normalized = slug.trim().toLowerCase();

    if (!normalized || !/^[a-z0-9_-]+$/.test(normalized) || normalized.length < 3 || normalized.length > 30) {
      return NextResponse.json({ available: false });
    }

    const available = await checkZoneSlugAvailable(normalized);
    return NextResponse.json({ available });
  } catch (err) {
    await logerror('GET /api/v1/zones/check-slug error', { error: String(err) });
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
  }
}
