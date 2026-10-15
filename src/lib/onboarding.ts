import { query } from '@/lib/db';
import { logerror } from '@/lib/logger';
import { getZoneMember, requestZoneMembership } from '@/lib/zones';
import type { OnboardingZone } from '@/types/onboarding';

/**
 * Whether a zone may be offered to `$1` (the user id) by the welcome flow: anyone can walk
 * in on their own — public, open join policy, still active.
 *
 * Any membership row other than 'left' takes a zone off the list. 'active' is already
 * joined; 'pending' is an invitation or request waiting for an answer, which joining again
 * would not resolve; 'banned' must never be shown a way back in.
 */
const JOINABLE_ZONE = `
  z.visibility = 'public'
  AND z.join_policy = 'open'
  AND z.state = 'active'
  AND NOT EXISTS (
    SELECT 1
      FROM zone_members zm
     WHERE zm.zone_id = z.id
       AND zm.user_id = $1
       AND zm.status IN ('active', 'pending', 'banned')
  )`;

/**
 * Has this user finished the welcome flow? Existing accounts were stamped by the migration.
 *
 * Fails open: if the answer can't be read, the user is let through rather than trapped
 * behind a page they cannot leave.
 */
export async function isOnboardingCompleted(userId: number): Promise<boolean> {
  try {
    const res = await query(
      'SELECT onboarding_completed_at FROM users WHERE id = $1',
      [userId]
    );
    if (res.rows.length === 0) return true;
    return res.rows[0].onboarding_completed_at != null;
  } catch (err) {
    await logerror('isOnboardingCompleted error', [err]);
    return true;
  }
}

/** Marks the flow finished. Idempotent: the first completion time is kept. */
export async function completeOnboarding(userId: number): Promise<boolean> {
  try {
    await query(
      `UPDATE users
          SET onboarding_completed_at = now()
        WHERE id = $1 AND onboarding_completed_at IS NULL`,
      [userId]
    );
    return true;
  } catch (err) {
    await logerror('completeOnboarding error', [err]);
    return false;
  }
}

export async function getOnboardingZones(userId: number): Promise<OnboardingZone[]> {
  try {
    const res = await query(
      `SELECT z.id, z.slug, z.name, z.description,
              zcp.public_url AS profile_photo_url,
              zcb.public_url AS banner_url
         FROM zones z
         LEFT JOIN content_store zcp ON zcp.reference_type = 'zone' AND zcp.reference_id = z.id AND zcp.content_type = 'profile-photo'
         LEFT JOIN content_store zcb ON zcb.reference_type = 'zone' AND zcb.reference_id = z.id AND zcb.content_type = 'banner'
        WHERE ${JOINABLE_ZONE}
        ORDER BY z.slug ASC`,
      [userId]
    );

    return res.rows.map((r) => ({
      id: Number(r.id),
      slug: r.slug,
      name: r.name,
      description: r.description ?? null,
      profilePhotoUrl: r.profile_photo_url ?? null,
      bannerUrl: r.banner_url ?? null,
    }));
  } catch (err) {
    await logerror('getOnboardingZones error', [err]);
    return [];
  }
}

/**
 * Joins one of the zones the welcome flow offered. The id comes from the client, so
 * eligibility is checked again here rather than trusting the list that was rendered.
 * Joining a zone that is already joined succeeds, so a repeated tap is harmless.
 */
export async function joinOnboardingZone(
  userId: number,
  zoneId: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const member = await getZoneMember(zoneId, userId);
    if (member?.status === 'active') return { success: true };

    const eligible = await query(
      `SELECT 1 FROM zones z WHERE z.id = $2 AND ${JOINABLE_ZONE}`,
      [userId, zoneId]
    );
    if (eligible.rows.length === 0) return { success: false, error: 'საბზონა არ მოიძებნა' };

    return await requestZoneMembership(zoneId, userId);
  } catch (err) {
    await logerror('joinOnboardingZone error', [err]);
    return { success: false, error: 'გაურკვეველი შეცდომა' };
  }
}

/**
 * A `next` target for after the flow. Same-site paths only: it must start with a single
 * slash and carry no backslash (browsers read `/\evil.com` as `//evil.com`). The welcome
 * page itself is mapped to the home page so finishing can never land back on it.
 */
export function safeNextPath(raw: string | null | undefined): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//') || raw.includes('\\')) return '/';
  if (raw === '/welcome' || /^\/welcome[/?#]/.test(raw)) return '/';
  return raw;
}
