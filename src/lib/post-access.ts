"use server";

import { query } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';
import { logerror } from '@/lib/logger';

/**
 * Whether the user may SEE the post, and — when they may — whether they are an active member
 * of its zone. One round trip answers both questions; the three exports below slice it.
 *
 * Seeing is the old "public zone, or member" rule. Doing anything to the post (guess,
 * comment, vote, reward, play) additionally takes an active membership: a public zone is
 * open for reading, not for taking part.
 */
async function readPostAccess(
  userId: number | null | undefined,
  postId: number
): Promise<{ isMember: boolean } | null> {
  try {
    const res = await query(
      `select exists (
                select 1 from zone_members zm
                where zm.zone_id = z.id and zm.user_id = $2 and zm.status = 'active'
              ) as is_member
       from posts p
       join zones z on z.id = p.zone_id
       left join hide_and_seek_games hs on hs.post_id = p.id
       where p.id = $1 and (
         p.user_id = $2
         -- staff can open a suspended post, to review it
         or (p.status = 'suspended' and exists (
           select 1 from zone_members zm
           where zm.zone_id = z.id and zm.user_id = $2 and zm.status = 'active' and zm.role in ('owner', 'admin')
         ))
         or (
           p.status = 'published' and (
             z.visibility = 'public'
             or exists (
               select 1 from zone_members zm
               where zm.zone_id = z.id and zm.user_id = $2 and zm.status = 'active'
             )
           )
           -- a private დამალობანა is visible to its invitees only, whatever the zone says
           and (
             hs.id is null
             or hs.visibility = 'public'
             or exists (
               select 1 from hide_and_seek_invites hi
               where hi.game_id = hs.id and hi.user_id = $2
             )
           )
         )
       )
       limit 1`,
      [postId, userId ?? 0]
    );
    if ((res.rowCount ?? 0) === 0) return null;
    return { isMember: Boolean(res.rows[0].is_member) };
  } catch (err) {
    await logerror('readPostAccess error', [err]);
    return null;
  }
}

/** May the user open / read the post. Not enough to act on it — see canUserInteractWithPost. */
export async function canUserAccessPost(
  userId: number | null | undefined,
  postId: number
): Promise<boolean> {
  return (await readPostAccess(userId, postId)) !== null;
}

export async function currentUserCanAccessPost(postId: number): Promise<boolean> {
  const user = await getCurrentUser();
  return canUserAccessPost(user?.userId ?? null, postId);
}

/**
 * May the user act on the post: guess, comment, vote, reward, join or play its game.
 * Everything canUserAccessPost requires, plus an active membership of the post's zone —
 * the author included. Reading stays open on public zones; taking part does not.
 */
export async function canUserInteractWithPost(
  userId: number | null | undefined,
  postId: number
): Promise<boolean> {
  const access = await readPostAccess(userId, postId);
  return access !== null && access.isMember;
}

/**
 * Why a refused action was refused, for the callers that want to tell "not a member" from
 * every other no. `'not_member'` means the viewer can see the post and would be allowed to act
 * on it if they joined; `null` leaves the caller's own error as it was.
 *
 * Call it only after the action itself said no, so the happy path costs nothing extra.
 */
export async function getPostInteractionBlock(
  userId: number | null | undefined,
  postId: number
): Promise<'not_member' | null> {
  const access = await readPostAccess(userId, postId);
  return access !== null && !access.isMember ? 'not_member' : null;
}
