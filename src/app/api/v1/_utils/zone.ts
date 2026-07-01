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

/**
 * Whether the caller may see a zone and its details. Public zones are open to
 * everyone; private zones only to active members. Non-active memberships
 * ('pending', 'left', 'banned') grant no access.
 */
export function canAccessZone(
  zone: Pick<ZoneBaseType, 'visibility'>,
  member: Pick<ZoneMemberInfo, 'status'> | null
): boolean {
  return zone.visibility === 'public' || member?.status === 'active';
}

type ZoneContext = {
  user: AccessTokenPayload;
  zone: ZoneBaseType;
  member: ZoneMemberInfo | null;
};

/**
 * Authenticate the mobile caller, resolve the zone by slug, and load the caller's
 * membership. Returns `{ response }` to short-circuit on auth failure or missing zone.
 *
 * By default a private zone is invisible to anyone who isn't an active member:
 * it returns the same 404 as a non-existent zone, so neither its existence nor
 * any of its details (members, leaderboard, quests, metadata) leak. Endpoints
 * that must serve non-members — i.e. joining/leaving — opt out with
 * `{ requireAccess: false }`.
 */
export async function resolveZoneContext(
  req: NextRequest,
  slug: string,
  options: { requireAccess?: boolean } = {}
): Promise<{ ctx: ZoneContext; response: null } | { ctx: null; response: NextResponse }> {
  const { requireAccess = true } = options;

  const auth = await requireMobileUser(req);
  if (auth.response) return { ctx: null, response: auth.response };

  const zone = await getZone(slug);
  if (!zone) {
    return { ctx: null, response: NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 }) };
  }

  const member = await getZoneMember(zone.id, auth.user.userId);

  if (requireAccess && !canAccessZone(zone, member)) {
    return { ctx: null, response: NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 }) };
  }

  return { ctx: { user: auth.user, zone, member }, response: null };
}
