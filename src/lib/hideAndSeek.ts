"use server";

import { query, withTransaction } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';
import { canUserAccessPost } from '@/lib/post-access';
import { logerror } from '@/lib/logger';
import { isInGeorgia } from '@/lib/geo';
import { haversineMeters } from '@/lib/gpsPhotoGuessScore';
import { processUploadedPhoto } from '@/lib/image-pipeline';
import { eventBus } from '@/lib/eventBus';
import {
  CATCH_RADIUS_METERS,
  DEFAULT_CHECKS,
  isValidDuration,
  isValidMaxChecks,
} from '@/types/hide-and-seek';
import type {
  ActiveHideAndSeekType,
  HideAndSeekCheckResultType,
  HideAndSeekGameType,
  HideAndSeekListFilter,
  HideAndSeekListItemType,
  HideAndSeekPlayerType,
} from '@/types/hide-and-seek';
import type {
  HideAndSeekCheckedEvent,
  HideAndSeekCreatedEvent,
  HideAndSeekEndedEvent,
  HideAndSeekFoundEvent,
  HideAndSeekJoinedEvent,
} from '@/types/events/hide-and-seek';

export type HideAndSeekErrorReason =
  | 'not_authenticated'
  | 'no_access'
  | 'already_in_game'
  | 'game_not_found'
  | 'game_ended'
  | 'not_host'
  | 'host_cannot_seek'
  | 'not_playing'
  | 'already_found'
  | 'out_of_checks'
  | 'invalid_input'
  | 'outside_georgia'
  | 'failed';

export type HideAndSeekResult<T> = { ok: true; data: T } | { ok: false; reason: HideAndSeekErrorReason };

function fail<T>(reason: HideAndSeekErrorReason): HideAndSeekResult<T> {
  return { ok: false, reason };
}

/** Thrown inside the check transaction when the locked player row no longer qualifies. */
class StaleCheckError extends Error {
  constructor(public playerStatus: string) {
    super('stale_check');
  }
}

// ---------------------------------------------------------------------------
// reads
// ---------------------------------------------------------------------------

/**
 * The one game the user is currently in, as host or seeker. Backs the floating
 * ongoing-game button, so it is deliberately a single indexed row lookup.
 */
export async function getActiveHideAndSeek(): Promise<ActiveHideAndSeekType | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  return getActiveHideAndSeekForUser(user.userId);
}

export async function getActiveHideAndSeekForUser(userId: number): Promise<ActiveHideAndSeekType | null> {
  try {
    const res = await query(
      `select g.id as game_id, g.post_id, g.ends_at, g.max_checks,
              p.title, hu.alias as host_alias,
              pl.role, pl.status, pl.check_count,
              (select count(*)::int from hide_and_seek_players x
                where x.game_id = g.id and x.role = 'seeker') as player_count,
              (select count(*)::int from hide_and_seek_players x
                where x.game_id = g.id and x.status = 'found') as found_count
         from hide_and_seek_players pl
         join hide_and_seek_games g on g.id = pl.game_id
         join posts p on p.id = g.post_id
         join users hu on hu.id = g.user_id
        where pl.user_id = $1 and pl.status = 'active' and g.status = 'active'
        limit 1`,
      [userId]
    );

    if ((res.rowCount ?? 0) === 0) return null;
    const r = res.rows[0];

    return {
      gameId: Number(r.game_id),
      postId: Number(r.post_id),
      title: r.title ?? '',
      hostAlias: r.host_alias,
      role: r.role,
      status: r.status,
      endsAt: r.ends_at,
      checksRemaining: r.role === 'host' ? 0 : Math.max(0, Number(r.max_checks) - Number(r.check_count)),
      playerCount: Number(r.player_count ?? 0),
      foundCount: Number(r.found_count ?? 0),
    };
  } catch (err) {
    await logerror('getActiveHideAndSeekForUser error', [err]);
    return null;
  }
}

/** Every game the viewer may see, newest first. Backs the /hide-and-seek index. */
export async function listHideAndSeekGames(
  filter: HideAndSeekListFilter = 'all',
  limit = 30,
  offset = 0
): Promise<HideAndSeekListItemType[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  return listHideAndSeekGamesForUser(user.userId, filter, limit, offset);
}

export async function listHideAndSeekGamesForUser(
  userId: number,
  filter: HideAndSeekListFilter = 'all',
  limit = 30,
  offset = 0
): Promise<HideAndSeekListItemType[]> {
  try {
    // 'active' means the row says active AND the clock has not run out, so a game whose
    // expiry job has not fired yet does not show up as live here.
    const statusCondition =
      filter === 'active'
        ? `and g.status = 'active' and g.ends_at > now()`
        : filter === 'ended'
          ? `and (g.status = 'ended' or g.ends_at <= now())`
          : '';

    const res = await query(
      `select g.id, g.post_id, g.status, g.visibility, g.ends_at, g.ended_at, g.max_checks,
              g.duration_minutes, g.created_at,
              p.title, p.zone_id, z.slug as zone_slug,
              g.user_id as host_id, hu.alias as host_alias, hx.level as host_level,
              (select count(*)::int from hide_and_seek_players x
                where x.game_id = g.id and x.role = 'seeker') as player_count,
              (select count(*)::int from hide_and_seek_players x
                where x.game_id = g.id and x.status = 'found') as found_count,
              pl.role as viewer_role
         from hide_and_seek_games g
         join posts p on p.id = g.post_id
         join zones z on z.id = p.zone_id
         join users hu on hu.id = g.user_id
         left join user_xp hx on hx.user_id = hu.id
         left join hide_and_seek_players pl on pl.game_id = g.id and pl.user_id = $1
        where p.status = 'published'
          and (
            z.visibility = 'public'
            or exists (
              select 1 from zone_members zm
               where zm.zone_id = z.id and zm.user_id = $1 and zm.status = 'active'
            )
          )
          -- a private game is listed only for its host and invitees
          and (
            g.visibility = 'public'
            or g.user_id = $1
            or exists (
              select 1 from hide_and_seek_invites hi
               where hi.game_id = g.id and hi.user_id = $1
            )
          )
          ${statusCondition}
        order by (g.status = 'active' and g.ends_at > now()) desc, g.created_at desc
        limit $2 offset $3`,
      [userId, limit, offset]
    );

    return res.rows.map((r) => ({
      gameId: Number(r.id),
      postId: Number(r.post_id),
      title: r.title ?? '',
      status: r.ends_at && new Date(r.ends_at).getTime() <= Date.now() ? 'ended' : r.status,
      visibility: r.visibility,
      hostId: Number(r.host_id),
      hostAlias: r.host_alias,
      hostLevel: r.host_level ?? null,
      zoneSlug: r.zone_slug,
      endsAt: r.ends_at,
      endedAt: r.ended_at ?? null,
      createdAt: r.created_at,
      maxChecks: Number(r.max_checks),
      durationMinutes: Number(r.duration_minutes),
      playerCount: Number(r.player_count ?? 0),
      foundCount: Number(r.found_count ?? 0),
      viewerRole: r.viewer_role ?? null,
    }));
  } catch (err) {
    await logerror('listHideAndSeekGamesForUser error', [err]);
    return [];
  }
}

export async function getHideAndSeekGame(postId: number): Promise<HideAndSeekGameType | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  return getHideAndSeekGameForUser(user.userId, postId);
}

export async function getHideAndSeekGameForUser(
  userId: number,
  postId: number
): Promise<HideAndSeekGameType | null> {
  try {
    if (!(await canUserAccessPost(userId, postId))) return null;

    const res = await query(
      `select g.*, p.title, p.zone_id, z.slug as zone_slug,
              hu.alias as host_alias, hx.level as host_level,
              (select count(*)::int from hide_and_seek_players x
                where x.game_id = g.id and x.role = 'seeker') as player_count,
              (select count(*)::int from hide_and_seek_players x
                where x.game_id = g.id and x.status = 'found') as found_count,
              pl.id as viewer_player_id, pl.role as viewer_role, pl.status as viewer_status,
              pl.comment_id as viewer_comment_id, pl.last_distance as viewer_last_distance,
              pl.best_distance as viewer_best_distance, pl.check_count as viewer_check_count
         from hide_and_seek_games g
         join posts p on p.id = g.post_id
         join zones z on z.id = p.zone_id
         join users hu on hu.id = g.user_id
         left join user_xp hx on hx.user_id = hu.id
         left join hide_and_seek_players pl on pl.game_id = g.id and pl.user_id = $2
        where g.post_id = $1
        limit 1`,
      [postId, userId]
    );

    if ((res.rowCount ?? 0) === 0) return null;
    const r = res.rows[0];

    const isHost = Number(r.user_id) === userId;
    const ended = r.status === 'ended';

    return {
      id: Number(r.id),
      postId: Number(r.post_id),
      title: r.title ?? '',
      hostId: Number(r.user_id),
      hostAlias: r.host_alias,
      hostLevel: r.host_level ?? null,
      zoneId: Number(r.zone_id),
      zoneSlug: r.zone_slug,
      visibility: r.visibility,
      status: r.status,
      catchRadiusM: Number(r.catch_radius_m),
      maxChecks: Number(r.max_checks),
      durationMinutes: Number(r.duration_minutes),
      endsAt: r.ends_at,
      endedAt: r.ended_at ?? null,
      endedReason: r.ended_reason ?? null,
      createdAt: r.created_at,
      playerCount: Number(r.player_count ?? 0),
      foundCount: Number(r.found_count ?? 0),
      // the hidden answer stays hidden until the game is over
      coordinates: isHost || ended ? { latitude: Number(r.latitude), longitude: Number(r.longitude) } : null,
      viewer: r.viewer_player_id
        ? {
            playerId: Number(r.viewer_player_id),
            role: r.viewer_role,
            status: r.viewer_status,
            commentId: r.viewer_comment_id ?? null,
            lastDistance: r.viewer_last_distance ?? null,
            bestDistance: r.viewer_best_distance ?? null,
            checkCount: Number(r.viewer_check_count ?? 0),
            checksRemaining: Math.max(0, Number(r.max_checks) - Number(r.viewer_check_count ?? 0)),
          }
        : null,
    };
  } catch (err) {
    await logerror('getHideAndSeekGameForUser error', [err]);
    return null;
  }
}

export async function getHideAndSeekPlayers(postId: number): Promise<HideAndSeekPlayerType[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  return getHideAndSeekPlayersForUser(user.userId, postId);
}

/** The scoreboard: every seeker with their latest and closest distance. */
export async function getHideAndSeekPlayersForUser(
  userId: number,
  postId: number
): Promise<HideAndSeekPlayerType[]> {
  try {
    if (!(await canUserAccessPost(userId, postId))) return [];

    const res = await query(
      `select pl.*, u.alias, ux.level
         from hide_and_seek_players pl
         join hide_and_seek_games g on g.id = pl.game_id
         join users u on u.id = pl.user_id
         left join user_xp ux on ux.user_id = u.id
        where g.post_id = $1 and pl.role = 'seeker'
        order by pl.found_at asc nulls last, pl.best_distance asc nulls last, pl.joined_at asc`,
      [postId]
    );

    return res.rows.map((r) => ({
      id: Number(r.id),
      gameId: Number(r.game_id),
      userId: Number(r.user_id),
      alias: r.alias,
      level: r.level ?? null,
      role: r.role,
      status: r.status,
      commentId: r.comment_id ?? null,
      lastDistance: r.last_distance ?? null,
      bestDistance: r.best_distance ?? null,
      checkCount: Number(r.check_count ?? 0),
      joinedAt: r.joined_at,
      foundAt: r.found_at ?? null,
    }));
  } catch (err) {
    await logerror('getHideAndSeekPlayersForUser error', [err]);
    return [];
  }
}

// ---------------------------------------------------------------------------
// create
// ---------------------------------------------------------------------------

export type CreateHideAndSeekInput = {
  title: string;
  coordinates: { latitude: number; longitude: number };
  durationMinutes: number;
  maxChecks: number;
  zoneId: number;
  zoneSlug: string;
  visibility: 'public' | 'private';
  /** User ids to grant access to, for a private game. */
  inviteeIds?: number[];
  /** Aliases to grant access to; resolved server-side and merged with inviteeIds. */
  inviteeAliases?: string[];
};

export async function createHideAndSeekGame(
  input: CreateHideAndSeekInput
): Promise<HideAndSeekResult<{ postId: number; gameId: number }>> {
  const user = await getCurrentUser();
  if (!user) return fail('not_authenticated');
  return createHideAndSeekGameForUser(user.userId, user.alias, input);
}

export async function createHideAndSeekGameForUser(
  userId: number,
  alias: string,
  input: CreateHideAndSeekInput
): Promise<HideAndSeekResult<{ postId: number; gameId: number }>> {
  const { title, coordinates, durationMinutes, maxChecks, zoneId, zoneSlug, visibility } = input;

  const trimmed = (title ?? '').trim();
  if (!trimmed || trimmed.length > 200) return fail('invalid_input');
  if (!isValidDuration(durationMinutes)) return fail('invalid_input');
  if (!isValidMaxChecks(maxChecks ?? DEFAULT_CHECKS)) return fail('invalid_input');
  if (visibility !== 'public' && visibility !== 'private') return fail('invalid_input');
  if (!coordinates || !Number.isFinite(coordinates.latitude) || !Number.isFinite(coordinates.longitude)) {
    return fail('invalid_input');
  }
  if (!isInGeorgia(coordinates.latitude, coordinates.longitude)) return fail('outside_georgia');

  try {
    if (!(await canUserPostInZone(userId, zoneId))) return fail('no_access');
    if (await hasActiveHideAndSeek(userId)) return fail('already_in_game');

    const resolved = await resolveAliases(input.inviteeAliases ?? []);
    const inviteeIds = Array.from(
      new Set([...(input.inviteeIds ?? []), ...resolved].filter((id) => id !== userId))
    );

    const created = await withTransaction(async (client) => {
      const postRes = await client.query(
        `insert into posts (user_id, type, title, status, zone_id)
         values ($1, 'hide-and-seek', $2, 'published', $3)
         returning id`,
        [userId, trimmed, zoneId]
      );
      const postId = Number(postRes.rows[0].id);

      const gameRes = await client.query(
        `insert into hide_and_seek_games
           (post_id, user_id, visibility, latitude, longitude, catch_radius_m,
            max_checks, duration_minutes, ends_at)
         values ($1, $2, $3, $4, $5, $6, $7, $8, now() + make_interval(mins => $8))
         returning id, ends_at`,
        [
          postId,
          userId,
          visibility,
          coordinates.latitude,
          coordinates.longitude,
          CATCH_RADIUS_METERS,
          maxChecks,
          durationMinutes,
        ]
      );
      const gameId = Number(gameRes.rows[0].id);

      // The host holds an 'active' player row for the whole game — this is what the
      // one-active-game-per-user index keys on.
      await client.query(
        `insert into hide_and_seek_players (game_id, user_id, role, status)
         values ($1, $2, 'host', 'active')`,
        [gameId, userId]
      );

      if (visibility === 'private' && inviteeIds.length > 0) {
        await client.query(
          `insert into hide_and_seek_invites (game_id, user_id, invited_by)
           select $1, unnest($2::bigint[]), $3
           on conflict (game_id, user_id) do nothing`,
          [gameId, inviteeIds, userId]
        );
      }

      return { postId, gameId, endsAt: gameRes.rows[0].ends_at as string };
    });

    await eventBus.publish('hide_and_seek', 'created', {
      gameId: created.gameId,
      postId: created.postId,
      title: trimmed,
      hostId: +userId,
      hostAlias: alias,
      visibility,
      endsAt: created.endsAt,
      zoneId: +zoneId,
      zoneSlug: zoneSlug || 'public',
      inviteeIds,
    } as HideAndSeekCreatedEvent);

    return { ok: true, data: { postId: created.postId, gameId: created.gameId } };
  } catch (err: any) {
    if (err?.code === '23505') return fail('already_in_game');
    await logerror('createHideAndSeekGameForUser error', [err]);
    return fail('failed');
  }
}

// ---------------------------------------------------------------------------
// join
// ---------------------------------------------------------------------------

export async function joinHideAndSeekGame(
  postId: number
): Promise<HideAndSeekResult<{ playerId: number; commentId: number }>> {
  const user = await getCurrentUser();
  if (!user) return fail('not_authenticated');
  return joinHideAndSeekGameForUser(user.userId, user.alias, postId);
}

export async function joinHideAndSeekGameForUser(
  userId: number,
  alias: string,
  postId: number
): Promise<HideAndSeekResult<{ playerId: number; commentId: number }>> {
  try {
    if (!(await canUserAccessPost(userId, postId))) return fail('no_access');

    const gameRes = await query(
      `select g.id, g.user_id as host_id, g.status, g.ends_at, u.alias as host_alias
         from hide_and_seek_games g
         join users u on u.id = g.user_id
        where g.post_id = $1
        limit 1`,
      [postId]
    );
    if ((gameRes.rowCount ?? 0) === 0) return fail('game_not_found');

    const game = gameRes.rows[0];
    if (game.status !== 'active' || new Date(game.ends_at).getTime() <= Date.now()) return fail('game_ended');
    if (Number(game.host_id) === userId) return fail('host_cannot_seek');

    const existing = await query(
      `select id, comment_id from hide_and_seek_players where game_id = $1 and user_id = $2 limit 1`,
      [game.id, userId]
    );
    if ((existing.rowCount ?? 0) > 0) {
      return {
        ok: true,
        data: {
          playerId: Number(existing.rows[0].id),
          commentId: Number(existing.rows[0].comment_id ?? 0),
        },
      };
    }

    if (await hasActiveHideAndSeek(userId)) return fail('already_in_game');

    const joined = await withTransaction(async (client) => {
      const playerRes = await client.query(
        `insert into hide_and_seek_players (game_id, user_id, role, status)
         values ($1, $2, 'seeker', 'active')
         returning id`,
        [game.id, userId]
      );
      const playerId = Number(playerRes.rows[0].id);

      // The root comment every later check of theirs hangs off — the same role the
      // guess comment plays on a gps-photo post.
      const commentRes = await client.query(
        `insert into post_comments (post_id, user_id, body, type, metadata)
         values ($1, $2, '', 'hide-and-seek-join-comment', $3)
         returning id`,
        [postId, userId, JSON.stringify({ gameId: Number(game.id) })]
      );
      const commentId = Number(commentRes.rows[0].id);

      await client.query(`update hide_and_seek_players set comment_id = $1 where id = $2`, [
        commentId,
        playerId,
      ]);

      return { playerId, commentId };
    });

    await eventBus.publish('hide_and_seek', 'joined', {
      gameId: Number(game.id),
      postId: +postId,
      hostId: Number(game.host_id),
      hostAlias: game.host_alias,
      userId: +userId,
      userAlias: alias,
      commentId: joined.commentId,
    } as HideAndSeekJoinedEvent);

    return { ok: true, data: joined };
  } catch (err: any) {
    if (err?.code === '23505') return fail('already_in_game');
    await logerror('joinHideAndSeekGameForUser error', [err]);
    return fail('failed');
  }
}

// ---------------------------------------------------------------------------
// check
// ---------------------------------------------------------------------------

export type SubmitCheckInput = {
  postId: number;
  /** Device position at capture time — the photo is evidence, not the source of truth. */
  coordinates: { latitude: number; longitude: number };
  imageUrl: string;
};

export async function submitHideAndSeekCheck(
  input: SubmitCheckInput
): Promise<HideAndSeekResult<HideAndSeekCheckResultType>> {
  const user = await getCurrentUser();
  if (!user) return fail('not_authenticated');
  return submitHideAndSeekCheckForUser(user.userId, user.alias, input);
}

export async function submitHideAndSeekCheckForUser(
  userId: number,
  alias: string,
  { postId, coordinates, imageUrl }: SubmitCheckInput
): Promise<HideAndSeekResult<HideAndSeekCheckResultType>> {
  if (!coordinates || !Number.isFinite(coordinates.latitude) || !Number.isFinite(coordinates.longitude)) {
    return fail('invalid_input');
  }
  if (!imageUrl) return fail('invalid_input');

  try {
    if (!(await canUserAccessPost(userId, postId))) return fail('no_access');

    const gameRes = await query(
      `select g.id, g.user_id as host_id, g.status, g.ends_at, g.latitude, g.longitude,
              g.catch_radius_m, g.max_checks, u.alias as host_alias
         from hide_and_seek_games g
         join users u on u.id = g.user_id
        where g.post_id = $1
        limit 1`,
      [postId]
    );

    if ((gameRes.rowCount ?? 0) === 0) return fail('game_not_found');
    const game = gameRes.rows[0];

    if (game.status !== 'active' || new Date(game.ends_at).getTime() <= Date.now()) return fail('game_ended');
    if (Number(game.host_id) === userId) return fail('host_cannot_seek');

    const playerRes = await query(
      `select id, status, comment_id, check_count, best_distance
         from hide_and_seek_players
        where game_id = $1 and user_id = $2
        limit 1`,
      [game.id, userId]
    );
    if ((playerRes.rowCount ?? 0) === 0) return fail('not_playing');

    const player = playerRes.rows[0];
    if (player.status === 'found') return fail('already_found');
    if (player.status !== 'active') return fail('out_of_checks');
    if (Number(player.check_count) >= Number(game.max_checks)) return fail('out_of_checks');

    const distance = haversineMeters(
      { latitude: Number(game.latitude), longitude: Number(game.longitude) },
      coordinates
    );
    const found = distance <= Number(game.catch_radius_m);

    // Slow work (S3 + sharp) stays outside the transaction.
    const processed = await processUploadedPhoto(imageUrl);
    const storedUrl = processed?.displayUrl ?? imageUrl;
    const imageVariants = processed?.variants ?? null;

    const result = await withTransaction(async (client) => {
      // Re-read under a row lock: the checks above ran before the (slow) photo upload,
      // so two checks submitted at once would otherwise both write the same check_count.
      const locked = await client.query(
        `select id, status, comment_id, check_count, best_distance
           from hide_and_seek_players
          where id = $1
          for update`,
        [player.id]
      );

      const current = locked.rows[0];
      if (!current || current.status !== 'active') throw new StaleCheckError(current?.status ?? 'ended');
      if (Number(current.check_count) >= Number(game.max_checks)) throw new StaleCheckError('out_of_checks');

      const checkRes = await client.query(
        `insert into hide_and_seek_checks
           (game_id, player_id, user_id, latitude, longitude, distance_meters, image_url, image_variants)
         values ($1, $2, $3, $4, $5, $6, $7, $8)
         returning id, created_at`,
        [
          game.id,
          current.id,
          userId,
          coordinates.latitude,
          coordinates.longitude,
          distance,
          storedUrl,
          imageVariants ? JSON.stringify(imageVariants) : null,
        ]
      );
      const checkId = Number(checkRes.rows[0].id);

      const commentRes = await client.query(
        `insert into post_comments (post_id, user_id, parent_id, body, type, metadata)
         values ($1, $2, $3, '', 'hide-and-seek-check-comment', $4)
         returning id`,
        [
          postId,
          userId,
          current.comment_id ?? null,
          JSON.stringify({
            distance,
            checkId,
            found,
            imageUrl: storedUrl,
            ...(imageVariants ? { imageVariants } : {}),
          }),
        ]
      );
      const commentId = Number(commentRes.rows[0].id);

      await client.query(`update hide_and_seek_checks set comment_id = $1 where id = $2`, [
        commentId,
        checkId,
      ]);

      const nextCount = Number(current.check_count) + 1;
      const nextStatus = found
        ? 'found'
        : nextCount >= Number(game.max_checks)
          ? 'out_of_checks'
          : 'active';

      await client.query(
        // `found` is passed separately rather than comparing $3 to a literal: using the
        // same parameter as both a varchar column value and a text comparand makes
        // Postgres infer two types for it and reject the statement (42P08).
        `update hide_and_seek_players
            set check_count = $1,
                last_distance = $2,
                best_distance = least(coalesce(best_distance, $2), $2),
                status = $3,
                found_at = case when $5 then now() else found_at end
          where id = $4`,
        [nextCount, distance, nextStatus, current.id, found]
      );

      await client.query(
        `insert into user_content (user_id, type, public_url, details)
         values ($1, 'hide-and-seek-check-photo', $2, $3)`,
        [
          userId,
          storedUrl,
          JSON.stringify({
            checkId,
            gameId: Number(game.id),
            postId,
            ...(imageVariants ? { variants: imageVariants } : {}),
          }),
        ]
      );

      return {
        checkId,
        commentId,
        distanceMeters: distance,
        found,
        checksRemaining: Math.max(0, Number(game.max_checks) - nextCount),
        status: nextStatus as HideAndSeekCheckResultType['status'],
        // carried out for the event payload, which is published after the commit
        isNewBest: current.best_distance == null || distance < Number(current.best_distance),
        checkCount: nextCount,
      };
    });

    await eventBus.publish('hide_and_seek', 'checked', {
      gameId: Number(game.id),
      postId: +postId,
      hostId: Number(game.host_id),
      hostAlias: game.host_alias,
      userId: +userId,
      userAlias: alias,
      checkId: result.checkId,
      commentId: result.commentId,
      distanceMeters: result.distanceMeters,
      /** The host is only pinged when a seeker gets closer than they have ever been. */
      isNewBest: result.isNewBest,
      found: result.found,
    } as HideAndSeekCheckedEvent);

    if (result.found) {
      await eventBus.publish('hide_and_seek', 'found', {
        gameId: Number(game.id),
        postId: +postId,
        hostId: Number(game.host_id),
        hostAlias: game.host_alias,
        userId: +userId,
        userAlias: alias,
        distanceMeters: result.distanceMeters,
        checkCount: result.checkCount,
      } as HideAndSeekFoundEvent);
    }

    return { ok: true, data: result };
  } catch (err) {
    if (err instanceof StaleCheckError) {
      return fail(err.playerStatus === 'found' ? 'already_found' : 'out_of_checks');
    }
    await logerror('submitHideAndSeekCheckForUser error', [err]);
    return fail('failed');
  }
}

// ---------------------------------------------------------------------------
// end
// ---------------------------------------------------------------------------

export async function endHideAndSeekGame(postId: number): Promise<HideAndSeekResult<{ gameId: number }>> {
  const user = await getCurrentUser();
  if (!user) return fail('not_authenticated');
  return endHideAndSeekGameForUser(user.userId, postId);
}

export async function endHideAndSeekGameForUser(
  userId: number,
  postId: number
): Promise<HideAndSeekResult<{ gameId: number }>> {
  try {
    const gameRes = await query(
      `select id, user_id as host_id, status from hide_and_seek_games where post_id = $1 limit 1`,
      [postId]
    );
    if ((gameRes.rowCount ?? 0) === 0) return fail('game_not_found');

    const game = gameRes.rows[0];
    if (Number(game.host_id) !== userId) return fail('not_host');
    if (game.status !== 'active') return fail('game_ended');

    const participantIds = await closeGame(Number(game.id), 'host_ended');

    await eventBus.publish('hide_and_seek', 'ended', {
      gameId: Number(game.id),
      postId: +postId,
      hostId: userId,
      reason: 'host_ended',
      participantIds,
    } as HideAndSeekEndedEvent);

    return { ok: true, data: { gameId: Number(game.id) } };
  } catch (err) {
    await logerror('endHideAndSeekGameForUser error', [err]);
    return fail('failed');
  }
}

/**
 * Closes a game and releases every player row off 'active'. Both halves matter: a player
 * left 'active' would trip the one-active-game-per-user index forever.
 */
export async function closeGame(
  gameId: number,
  reason: 'expired' | 'host_ended'
): Promise<number[]> {
  return withTransaction(async (client) => {
    await client.query(
      `update hide_and_seek_games
          set status = 'ended', ended_at = now(), ended_reason = $2
        where id = $1 and status = 'active'`,
      [gameId, reason]
    );

    await client.query(
      `update hide_and_seek_players
          set status = 'ended'
        where game_id = $1 and status = 'active'`,
      [gameId]
    );

    const all = await client.query(
      `select user_id from hide_and_seek_players where game_id = $1`,
      [gameId]
    );

    return all.rows.map((r) => Number(r.user_id));
  });
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

async function hasActiveHideAndSeek(userId: number): Promise<boolean> {
  const res = await query(
    `select 1
       from hide_and_seek_players pl
       join hide_and_seek_games g on g.id = pl.game_id
      where pl.user_id = $1 and pl.status = 'active' and g.status = 'active'
      limit 1`,
    [userId]
  );
  return (res.rowCount ?? 0) > 0;
}

/** Aliases the host typed, as user ids. Unknown aliases are dropped — the UI resolves
 *  each one as it is added, so anything unresolved here is a stale entry. */
async function resolveAliases(aliases: string[]): Promise<number[]> {
  const cleaned = aliases.map((a) => a.trim().toLowerCase()).filter(Boolean);
  if (cleaned.length === 0) return [];

  const res = await query(`select id from users where alias = any($1::text[])`, [cleaned]);
  return res.rows.map((r) => Number(r.id));
}

/** Same rule the feed uses: a public zone, or one the user is an active member of. */
async function canUserPostInZone(userId: number, zoneId: number): Promise<boolean> {
  const res = await query(
    `select 1
       from zones z
      where z.id = $1 and z.state = 'active' and (
        z.visibility = 'public'
        or exists (
          select 1 from zone_members zm
           where zm.zone_id = z.id and zm.user_id = $2 and zm.status = 'active'
        )
      )
      limit 1`,
    [zoneId, userId]
  );
  return (res.rowCount ?? 0) > 0;
}
