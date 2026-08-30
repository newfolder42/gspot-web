"use server";

import { query } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';
import { logerror } from '@/lib/logger';

export async function canUserAccessPost(
  userId: number | null | undefined,
  postId: number
): Promise<boolean> {
  try {
    const res = await query(
      `select 1
       from posts p
       join zones z on z.id = p.zone_id
       left join hide_and_seek_games hs on hs.post_id = p.id
       where p.id = $1 and (
         p.user_id = $2
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
    return (res.rowCount ?? 0) > 0;
  } catch (err) {
    await logerror('canUserAccessPost error', [err]);
    return false;
  }
}

export async function currentUserCanAccessPost(postId: number): Promise<boolean> {
  const user = await getCurrentUser();
  return canUserAccessPost(user?.userId ?? null, postId);
}
