import { NextRequest, NextResponse } from 'next/server';
import { requireMobileUser } from '@/app/api/v1/_utils/auth';
import { getInventoryForUser } from '@/lib/inventory';
import { logerror } from '@/lib/logger';
import { INVENTORY_MOBILE_PAGE_SIZE, normalizeInventoryPageSize } from '@/types/item';

// GET /api/v1/inventory — one page of the caller's bag, newest first, plus the counts the
// pager needs. The page size is a parameter so the app can offer a bag setting later
// without a new endpoint.
export async function GET(req: NextRequest) {
  try {
    const auth = await requireMobileUser(req);
    if (auth.response) return auth.response;

    const params = req.nextUrl.searchParams;
    const inventory = await getInventoryForUser(auth.user.userId, {
      page: Number(params.get('page')) || 1,
      pageSize: normalizeInventoryPageSize(params.get('pageSize'), INVENTORY_MOBILE_PAGE_SIZE),
      name: params.get('name'),
    });

    return NextResponse.json(inventory);
  } catch (err) {
    await logerror('GET /api/v1/inventory error', { error: String(err) });
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
  }
}
