import { query } from '@/lib/db';
import { canUserAccessPost } from '@/lib/post-access';
import { logerror } from '@/lib/logger';
import type { PostBookmarkType } from '@/types/bookmark';
import type { PostTypeType } from '@/types/post';

/*
 * ჩამახსოვრებულები — the posts a user saved (table `post_bookmarks`).
 *
 * Plain module on purpose, not "use server": these take an explicit user id, so they must not
 * become callable from the browser. The web reaches them through `actions/bookmarks.ts`, which
 * supplies the session user, and the mobile API through `/api/v1`.
 */

/** Which of `postIds` the user has saved — for feed cards and the post page to show the state. */
export async function getBookmarkedPostIds(
  userId: number | null | undefined,
  postIds: number[]
): Promise<Set<number>> {
  const saved = new Set<number>();
  if (!userId || postIds.length === 0) return saved;

  // The flag is decoration on a post: if this read fails the posts still have to come back,
  // so it is logged and the cards render as "not saved" instead of failing the whole page.
  try {
    const res = await query(
      `select post_id from post_bookmarks
        where user_id = $1 and post_id = any($2::bigint[])`,
      [userId, postIds]
    );
    for (const r of res.rows) saved.add(Number(r.post_id));
  } catch (err) {
    await logerror('getBookmarkedPostIds error', [err]);
  }
  return saved;
}

/**
 * Saves a post for the user. Idempotent: saving a saved post changes nothing. Only a post the
 * user can open can be saved — otherwise a bookmark would be a way to probe which ids exist.
 */
export async function addPostBookmark(
  userId: number,
  postId: number
): Promise<'ok' | 'not_found' | 'error'> {
  try {
    if (!(await canUserAccessPost(userId, postId))) return 'not_found';

    await query(
      `insert into post_bookmarks (user_id, post_id) values ($1, $2)
       on conflict (user_id, post_id) do nothing`,
      [userId, postId]
    );
    return 'ok';
  } catch (err) {
    await logerror('addPostBookmark error', [err]);
    return 'error';
  }
}

/**
 * Takes a post off the user's list. Idempotent, and deliberately not gated on access: a post
 * that has since become unreadable (zone went private, user left it) must still be removable.
 */
export async function removePostBookmark(userId: number, postId: number): Promise<boolean> {
  try {
    await query(`delete from post_bookmarks where user_id = $1 and post_id = $2`, [userId, postId]);
    return true;
  } catch (err) {
    await logerror('removePostBookmark error', [err]);
    return false;
  }
}

/**
 * The user's saved posts, newest save first, paged by the bookmark id (`cursorId` = the last id
 * of the previous page).
 *
 * A saved post the user can no longer see — deleted, suspended, in a zone that went private on
 * them — is left out rather than shown as a dead row; the bookmark itself stays, so the post
 * returns to the list if it becomes readable again. Same read rule as `readPostAccess`.
 *
 * Page size counts rows that survive that filter, so a page is only short at the true end.
 */
export async function getPostBookmarks(
  userId: number,
  limit: number,
  cursorId?: number
): Promise<PostBookmarkType[]> {
  try {
    const params: unknown[] = [userId, limit];
    let cursorCondition = '';
    if (cursorId) {
      params.push(cursorId);
      cursorCondition = `and b.id < $${params.length}`;
    }

    const res = await query(
      `select b.id, b.post_id, b.created_at,
              p.type, p.title, u.alias as author_alias,
              z.slug as zone_slug, zcp.public_url as zone_profile_photo_url,
              coalesce(ph.details -> 'variants' ->> 'thumb', ph.public_url) as thumbnail,
              zq.title as quest_title,
              exists(select 1 from post_guesses pg where pg.post_id = p.id and pg.user_id = $1) as user_has_guessed
         from post_bookmarks b
         join posts p on p.id = b.post_id
         join zones z on z.id = p.zone_id
         join users u on u.id = p.user_id
         left join content_store zcp
                on zcp.reference_type = 'zone' and zcp.reference_id = z.id and zcp.content_type = 'profile-photo'
         left join lateral (
           select uc.public_url, uc.details
             from post_content pc
             join user_content uc on uc.id = pc.content_id
            where pc.post_id = p.id
            order by pc.sort
            limit 1
         ) ph on true
         left join post_quest_completions pqc on pqc.post_id = p.id
         left join zone_quests zq on zq.id = pqc.quest_id
         left join hide_and_seek_games hsg on hsg.post_id = p.id
        where b.user_id = $1
          and p.status = 'published'
          and (
            z.visibility = 'public'
            or exists (
              select 1 from zone_members zm
              where zm.zone_id = z.id and zm.user_id = $1 and zm.status = 'active'
            )
          )
          -- a private დამალობანა is visible to its invitees only, whatever the zone says
          and (
            hsg.id is null
            or hsg.visibility = 'public'
            or exists (
              select 1 from hide_and_seek_invites hi
              where hi.game_id = hsg.id and hi.user_id = $1
            )
          )
          ${cursorCondition}
        order by b.id desc
        limit $2`,
      params
    );

    return res.rows.map((r) => ({
      id: Number(r.id),
      postId: Number(r.post_id),
      savedAt: new Date(r.created_at).toISOString(),
      type: r.type as PostTypeType,
      title: r.title ?? '',
      author: r.author_alias,
      zoneSlug: r.zone_slug,
      zoneProfilePhoto: r.zone_profile_photo_url ?? null,
      thumbnail: r.thumbnail ?? null,
      questTitle: r.quest_title ?? null,
      userHasGuessed: Boolean(r.user_has_guessed),
    }));
  } catch (err) {
    await logerror('getPostBookmarks error', [err]);
    return [];
  }
}
