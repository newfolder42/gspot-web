import { NextRequest, NextResponse } from 'next/server';
import { requireMobileUser } from '@/app/api/v1/_utils/auth';
import { getZone, getZoneMember } from '@/lib/zones';
import type { AccessTokenPayload } from '@/lib/mobile-jwt';
import type { ZoneBaseType, ZoneMemberInfo } from '@/types/zone';

const MANAGE_ROLES = ['owner', 'admin'];
const MODERATE_ROLES = ['owner', 'admin', 'moderator'];

export function canManage(role: string | null | undefined): boolean {
  return !!role && MANAGE_ROLES.includes(role);
}

export function canModerate(role: string | null | undefined): boolean {
  return !!role && MODERATE_ROLES.includes(role);
}

type ZoneContext = {
  user: AccessTokenPayload;
  zone: ZoneBaseType;
  member: ZoneMemberInfo | null;
};

/**
 * Authenticate the mobile caller, resolve the zone by slug, and load the caller's
 * membership. Returns `{ response }` to short-circuit on auth failure or missing zone.
 */
export async function resolveZoneContext(
  req: NextRequest,
  slug: string
): Promise<{ ctx: ZoneContext; response: null } | { ctx: null; response: NextResponse }> {
  const auth = await requireMobileUser(req);
  if (auth.response) return { ctx: null, response: auth.response };

  const zone = await getZone(slug);
  if (!zone) {
    return { ctx: null, response: NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 }) };
  }

  const member = await getZoneMember(zone.id, auth.user.userId);
  return { ctx: { user: auth.user, zone, member }, response: null };
}
